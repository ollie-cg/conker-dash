import { Puzzle } from 'lucide-react'

const integrations = [
  {
    name: 'Shopify',
    description: 'Sync product and order data from your Shopify store',
    status: 'available' as const,
  },
  {
    name: 'Google Analytics',
    description: 'Import web traffic and conversion metrics',
    status: 'available' as const,
  },
  {
    name: 'Xero',
    description: 'Connect accounting data for financial reporting',
    status: 'coming_soon' as const,
  },
  {
    name: 'Slack',
    description: 'Get performance alerts and reports in Slack channels',
    status: 'coming_soon' as const,
  },
  {
    name: 'Mailchimp',
    description: 'Track campaign performance alongside sales data',
    status: 'coming_soon' as const,
  },
  {
    name: 'Stripe',
    description: 'Monitor payment and subscription metrics',
    status: 'coming_soon' as const,
  },
]

export default function IntegrationsPage() {
  return (
    <>
      <div className="sticky top-0 z-10 flex h-14 flex-shrink-0 items-center gap-3 border-b border-slate-200 bg-slate-50/50 px-8 backdrop-blur-sm">
        <Puzzle size={18} className="text-slate-400" />
        <h1 className="text-sm font-medium text-slate-900">Integrations</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-3xl">
          <p className="mb-6 text-sm text-slate-500">
            Connect your tools to pull data into Conker Dash.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {integrations.map(({ name, description, status }) => (
              <div
                key={name}
                className="flex flex-col rounded-lg border border-slate-200 bg-white p-5 transition-colors hover:border-slate-300"
              >
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-900">{name}</h2>
                  {status === 'available' ? (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-600">
                      Available
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-400">
                      Coming soon
                    </span>
                  )}
                </div>
                <p className="mb-4 flex-1 text-sm text-slate-500">{description}</p>
                <button
                  disabled={status === 'coming_soon'}
                  className={`w-full rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    status === 'available'
                      ? 'bg-slate-900 text-white hover:bg-slate-800'
                      : 'cursor-not-allowed bg-slate-100 text-slate-400'
                  }`}
                >
                  {status === 'available' ? 'Connect' : 'Notify me'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
