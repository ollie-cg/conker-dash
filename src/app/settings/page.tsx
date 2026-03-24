import { Settings, Bell, User, Shield, Palette } from 'lucide-react'

const sections = [
  {
    title: 'Profile',
    description: 'Manage your account details and preferences',
    icon: User,
  },
  {
    title: 'Notifications',
    description: 'Configure how and when you receive alerts',
    icon: Bell,
  },
  {
    title: 'Security',
    description: 'Password, two-factor authentication, and sessions',
    icon: Shield,
  },
  {
    title: 'Appearance',
    description: 'Customise the dashboard theme and layout',
    icon: Palette,
  },
]

export default function SettingsPage() {
  return (
    <>
      <div className="sticky top-0 z-10 flex h-14 flex-shrink-0 items-center gap-3 border-b border-slate-200 bg-slate-50/50 px-8 backdrop-blur-sm">
        <Settings size={18} className="text-slate-400" />
        <h1 className="text-sm font-medium text-slate-900">Settings</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-2xl">
          <p className="mb-6 text-sm text-slate-500">
            Manage your account settings and preferences.
          </p>

          <div className="flex flex-col gap-3">
            {sections.map(({ title, description, icon: Icon }) => (
              <div
                key={title}
                className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-5 transition-colors hover:border-slate-300"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100">
                  <Icon size={20} className="text-slate-500" />
                </div>
                <div className="flex-1">
                  <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
                  <p className="mt-0.5 text-sm text-slate-500">{description}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-400">
                  Coming soon
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
