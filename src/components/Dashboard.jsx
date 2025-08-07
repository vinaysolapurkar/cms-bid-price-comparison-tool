import { useState, useEffect } from 'react'
import { useAppContext } from '../App'

export default function Dashboard() {
  const { selectedOrganization, selectedPayerState } = useAppContext()
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    organization: '',
    state: '',
    county: ''
  })
  const [counties, setCounties] = useState([])
  const [page, setPage] = useState(1)
  const [totalPlans, setTotalPlans] = useState(0)

  // Initialize filters with context values
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      organization: selectedOrganization || '',
      state: selectedPayerState || ''
    }))
  }, [selectedOrganization, selectedPayerState])

  // Fetch counties when state changes
  useEffect(() => {
    const fetchCounties = async () => {
      if (!filters.state) {
        setCounties([])
        return
      }
      
      try {
        const response = await fetch(`http://localhost:5000/api/counties?state=${filters.state}`)
        const data = await response.json()
        setCounties(data.counties || [])
      } catch (error) {
        console.error('Failed to fetch counties:', error)
        setCounties([])
      }
    }
    
    fetchCounties()
  }, [filters.state])

  // Fetch plans when filters change
  useEffect(() => {
    const fetchPlans = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (filters.organization) params.append('organization', filters.organization)
        if (filters.state) params.append('state', filters.state)
        if (filters.county) params.append('county', filters.county)
        params.append('page', page.toString())
        params.append('limit', '50')
        
        const response = await fetch(`http://localhost:5000/api/plans?${params}`)
        const data = await response.json()
        
        if (data.status === 'success') {
          setPlans(data.plans || [])
          setTotalPlans(data.count || 0)
        } else {
          setPlans([])
          setTotalPlans(0)
        }
      } catch (error) {
        console.error('Failed to fetch plans:', error)
        setPlans([])
        setTotalPlans(0)
      } finally {
        setLoading(false)
      }
    }
    
    fetchPlans()
  }, [filters, page])

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value || 0)
  }

  const getMACScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200'
    if (score >= 70) return 'text-blue-600 bg-blue-50 border-blue-200'
    if (score >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    if (score >= 40) return 'text-orange-600 bg-orange-50 border-orange-200'
    return 'text-red-600 bg-red-50 border-red-200'
  }

  const renderStarRating = (rating) => {
    if (!rating) return <span className="text-gray-400">No Rating</span>
    
    const stars = parseFloat(rating)
    const colorClass = stars >= 4 ? 'text-green-600' : stars >= 3 ? 'text-yellow-500' : 'text-red-500'
    
    return (
      <div className="flex items-center space-x-1">
        <span className={`font-semibold ${colorClass}`}>{stars.toFixed(1)}</span>
        <div className="flex">
          {[1, 2, 3, 4, 5].map(star => (
            <span key={star} className={star <= stars ? colorClass : 'text-gray-300'}>★</span>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow-lg rounded-xl p-8 border border-gray-100">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-8">
          📊 Plan Listing & Analysis
        </h2>
        
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Organization</label>
            <input
              type="text"
              placeholder="Search organization..."
              value={filters.organization}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, organization: e.target.value }))
                setPage(1)
              }}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
            <input
              type="text"
              placeholder="State (e.g., CA, NY, TX)"
              value={filters.state}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, state: e.target.value, county: '' }))
                setPage(1)
              }}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">County</label>
            <select
              value={filters.county}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, county: e.target.value }))
                setPage(1)
              }}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              disabled={!filters.state}
            >
              <option value="">All Counties</option>
              {counties.map((county, index) => (
                <option key={`county-${index}`} value={typeof county === 'string' ? county : county?.county || ''}>
                  {typeof county === 'string' ? county : `${county?.county || ''} (${county?.plan_count || 0} plans)`}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Results */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading plans...</p>
          </div>
        ) : plans.length > 0 ? (
          <div>
            <div className="mb-4 flex justify-between items-center">
              <p className="text-sm text-gray-600">
                Showing {plans.length} of {totalPlans} plans
                {selectedOrganization && (
                  <span className="ml-2 text-blue-600 font-medium">
                    (Your organization: {selectedOrganization})
                  </span>
                )}
              </p>
              <div className="space-x-2">
                <button
                  onClick={() => setPage(prev => Math.max(1, prev - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">Page {page}</span>
                <button
                  onClick={() => setPage(prev => prev + 1)}
                  disabled={plans.length < 50}
                  className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-blue-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organization</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contract</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan Type</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Star Rating</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MAC Score</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Benchmark</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Est. Bid</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rebate</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Margin %</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enrollment</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {plans.map((plan, index) => {
                    const isUserPlan = plan.organization === selectedOrganization
                    return (
                      <tr key={index} className={`hover:bg-gray-50 transition-colors ${isUserPlan ? 'border-l-4 border-blue-500 bg-blue-50' : ''}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {plan.organization}
                          {isUserPlan && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              You
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {plan.contract_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {plan.county}, {plan.state}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {plan.plan_type || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {renderStarRating(plan.overall_rating)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-center py-1 px-2 rounded-lg font-bold text-sm border-2 ${getMACScoreColor(plan.mac_value_scores?.mac_value || 0)}`}>
                            {(plan.mac_value_scores?.mac_value || 0).toFixed(1)}/100
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(plan.estimated_benchmark)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(plan.estimated_bid)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(plan.rebate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`font-semibold ${(plan.margin_percentage || 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {(plan.margin_percentage || 0).toFixed(2)}%
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {(plan.ma_eligible_enrollment || 0).toLocaleString()}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No plans found matching your criteria.</p>
            <p className="text-gray-400 text-sm mt-2">Try adjusting your filters or search terms.</p>
          </div>
        )}
      </div>
    </div>
  )
}