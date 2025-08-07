import { useAppContext } from '../App'

export default function PayerSelector() {
  const {
    organizations,
    states,
    selectedOrganization,
    setSelectedOrganization,
    selectedPayerState,
    setSelectedPayerState
  } = useAppContext()

  return (
    <div className="bg-white shadow-sm rounded-lg p-6 mb-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        🏢 Organization & Market Selection
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your Organization
            <span className="ml-1 text-xs text-gray-500">
              (Select your organization for personalized analysis)
            </span>
          </label>
          <select
            value={selectedOrganization}
            onChange={(e) => setSelectedOrganization(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select Your Organization</option>
            {organizations.map((org, index) => (
              <option key={`org-${index}`} value={org}>
                {org}
              </option>
            ))}
          </select>
          {selectedOrganization && (
            <p className="mt-2 text-sm text-blue-600">
              ✓ Selected: {selectedOrganization}
            </p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Primary State Market
            <span className="ml-1 text-xs text-gray-500">
              (Your main market focus)
            </span>
          </label>
          <select
            value={selectedPayerState}
            onChange={(e) => setSelectedPayerState(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select State</option>
            {states.map((state, index) => (
              <option key={`state-${index}`} value={typeof state === 'string' ? state : state?.state || ''}>
                {typeof state === 'string' ? state : `${state?.state || ''} (${state?.plan_count || 0} plans)`}
              </option>
            ))}
          </select>
          {selectedPayerState && (
            <p className="mt-2 text-sm text-blue-600">
              ✓ Selected: {selectedPayerState}
            </p>
          )}
        </div>
      </div>
      
      {!selectedOrganization && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center">
            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center mr-2">
              <span className="text-white text-xs">💡</span>
            </div>
            <p className="text-blue-800 text-sm">
              <strong>Tip:</strong> Select your organization to get personalized competitive analysis, MAC value comparisons, and strategic recommendations tailored to your plans.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}