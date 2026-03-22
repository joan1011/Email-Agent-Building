import { google } from 'googleapis'

function getGmailClient(accessToken: string) {
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })
  return google.gmail({ version: 'v1', auth })
}

function decodeBase64(data: string): string {
  return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8')
}

function getHeader(headers: Array<{ name?: string | null; value?: string | null }>, name: string): string {
  return headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? ''
}

export interface ParsedEmail {
  gmailMessageId: string
  gmailThreadId: string
  senderEmail: string
  senderName: string
  subject: string
  bodyText: string
  bodyHtml: string
  receivedAt: Date
}

function extractBody(payload: any): { text: string; html: string } {
  let text = ''
  let html = ''

  if (!payload) return { text, html }

  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    text = decodeBase64(payload.body.data)
  } else if (payload.mimeType === 'text/html' && payload.body?.data) {
    html = decodeBase64(payload.body.data)
  } else if (payload.parts) {
    for (const part of payload.parts) {
      const sub = extractBody(part)
      if (sub.text) text = sub.text
      if (sub.html) html = sub.html
    }
  }

  return { text, html }
}

export async function fetchInboxEmails(accessToken: string, maxResults = 20): Promise<ParsedEmail[]> {
  const gmail = getGmailClient(accessToken)

  const listRes = await gmail.users.messages.list({
    userId: 'me',
    labelIds: ['INBOX', 'CATEGORY_PERSONAL'],
    maxResults,
  })

  const messages = listRes.data.messages ?? []
  if (messages.length === 0) return []

  const parsed: ParsedEmail[] = []

  for (const msg of messages) {
    if (!msg.id) continue
    const detail = await gmail.users.messages.get({
      userId: 'me',
      id: msg.id,
      format: 'full',
    })

    const headers = detail.data.payload?.headers ?? []
    const from = getHeader(headers, 'from')
    const subject = getHeader(headers, 'subject')
    const date = getHeader(headers, 'date')

    // Parse "Name <email>" or just "email"
    const nameMatch = from.match(/^"?([^"<]+)"?\s*<(.+)>$/)
    const senderName = nameMatch ? nameMatch[1].trim() : ''
    const senderEmail = nameMatch ? nameMatch[2].trim() : from.trim()

    const { text, html } = extractBody(detail.data.payload)

    parsed.push({
      gmailMessageId: msg.id,
      gmailThreadId: detail.data.threadId ?? msg.id,
      senderEmail,
      senderName,
      subject,
      bodyText: text,
      bodyHtml: html,
      receivedAt: date ? new Date(date) : new Date(),
    })
  }

  return parsed
}

export async function sendGmailReply(
  accessToken: string,
  to: string,
  subject: string,
  body: string,
  threadId: string
): Promise<string> {
  const gmail = getGmailClient(accessToken)

  const rawMessage = [
    `To: ${to}`,
    `Subject: Re: ${subject}`,
    'Content-Type: text/plain; charset=utf-8',
    'MIME-Version: 1.0',
    '',
    body,
  ].join('\r\n')

  const encoded = Buffer.from(rawMessage)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encoded,
      threadId,
    },
  })

  return res.data.id ?? ''
}
