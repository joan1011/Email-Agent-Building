import { auth, signOut } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function Dashboard() {
  const session = await auth()
  if (!session) redirect('/')

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Vizuara Email Agent</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{session.user?.email}</span>
          <form action={async () => {
            'use server'
            await signOut({ redirectTo: '/' })
          }}>
            <button type="submit" className="text-sm text-red-500 hover:text-red-700">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <div className="p-8 text-center text-gray-500">
        <p className="text-lg">Dashboard coming in Phase 3 (Gmail Integration)</p>
      </div>
    </main>
  )
}
