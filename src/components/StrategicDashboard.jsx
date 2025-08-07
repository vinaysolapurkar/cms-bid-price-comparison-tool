import { useState, useEffect } from 'react'
import { useAppContext } from '../App'

export default function StrategicDashboard() {
  const { selectedOrganization, selectedPayerState } = useAppContext()
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [selectedMetric, setSelectedMetric] = useState('mac_value')

  // Fetch strategic dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!selectedPayerState) {
        setDashboardData(null)
        return
      }

      setLoading(true)
      try {
        // Fetch market data for strategic analysis
        const params = new URLSearchParams()
        params.append('state', selectedPayerState)
        if (selectedOrganization) {
          params.append('organizations', selectedOrganization)
        }
        
        const response = await fetch(`http://localhost:5000/api/mac-value-analysis?${params}`)
        const data = await response.json()
        
        if (data.status === 'success') {
          setDashboardData(data)
        } else {
          setDashboardData(null)
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
        setDashboardData(null)
      } finally {
        setLoading(false)
      }
    }
    
    fetchDashboardData()
  }, [selectedOrganization, selectedPayerState])

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value || 0)
  }

  const getMACScoreColor = (score) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 70) return 'text-blue-600'
    if (score >= 60) return 'text-yellow-600'
    if (score >= 40) return 'text-orange-600'
    return 'text-red-600'
  }

  const getPerformanceIndicator = (value, isGood) => {
    if (isGood) {
      return value > 0 ? '⬆️' : '⬇️'
    } else {
      return value > 0 ? '⬇️' : '⬆️'
    }
  }

  const generateStrategicInsights = () => {
    if (!dashboardData || !dashboardData.plans || dashboardData.plans.length === 0) {
      return []
    }

    const insights = []
    const userPlans = selectedOrganization ? 
      dashboardData.plans.filter(p => p.organization === selectedOrganization) : []
    const marketStats = dashboardData.market_stats

    if (userPlans.length > 0) {
      const avgMacValue = userPlans.reduce((sum, p) => sum + p.mac_value, 0) / userPlans.length
      
      if (avgMacValue >= marketStats.average_mac_value) {
        insights.push({
          type: 'success',
          title: 'Strong Market Position',
          message: `Your average MAC value of ${avgMacValue.toFixed(1)} exceeds the market average of ${marketStats.average_mac_value.toFixed(1)}`,
          action: 'Consider expanding in this market'
        })
      } else {
        insights.push({
          type: 'warning',
          title: 'Competitive Gap',
          message: `Your average MAC value of ${avgMacValue.toFixed(1)} is below market average of ${marketStats.average_mac_value.toFixed(1)}`,
          action: 'Focus on benefit optimization and bid strategy'
        })
      }

      // Star rating analysis
      const lowStarPlans = userPlans.filter(p => parseFloat(p.overall_rating) < 3.5)
      if (lowStarPlans.length > 0) {
        insights.push({
          type: 'critical',
          title: 'Quality Risk',
          message: `${lowStarPlans.length} plan(s) have star ratings below 3.5`,
          action: 'Immediate quality improvement initiatives required'
        })
      }
    }

    return insights
  }

  return (
    <div className="space-y-6">
      {!selectedPayerState && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-4">
              <span className="text-white text-sm">🏁</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-blue-900">Welcome to Strategic Dashboard</h3>
              <p className="text-blue-700">
                Select your organization and primary market above to unlock personalized competitive intelligence and MAC value insights.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow-lg rounded-xl p-8 border border-gray-100">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              🏆 Strategic Market Intelligence
            </h2>
            {selectedOrganization && selectedPayerState && (
              <p className="text-gray-600 mt-2">
                {selectedOrganization} • {selectedPayerState} Market Analysis
              </p>
            )}
          </div>
          
          {dashboardData && (
            <div className="flex space-x-2">
              <button
                onClick={() => setSelectedMetric('mac_value')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedMetric === 'mac_value' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                MAC Values
              </button>
              <button
                onClick={() => setSelectedMetric('financial')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedMetric === 'financial' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Financial
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Analyzing market intelligence...</p>
          </div>
        ) : dashboardData ? (
          <div className="space-y-8">
            {/* Market Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-blue-900">Market Plans</h4>
                  <span className="text-blue-600">📊</span>
                </div>
                <div className="text-2xl font-bold text-blue-900">{dashboardData.market_stats.total_plans}</div>
                <p className="text-xs text-blue-600 mt-1">Active in {selectedPayerState}</p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-green-900">Market Leader</h4>
                  <span className="text-green-600">🏆</span>
                </div>
                <div className="text-lg font-bold text-green-900">{dashboardData.market_stats.market_leader || 'N/A'}</div>
                <p className="text-xs text-green-600 mt-1">{dashboardData.market_stats.highest_mac_value.toFixed(1)} MAC Score</p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-purple-900">Market Average</h4>
                  <span className="text-purple-600">📏</span>
                </div>
                <div className="text-2xl font-bold text-purple-900">{dashboardData.market_stats.average_mac_value.toFixed(1)}</div>
                <p className="text-xs text-purple-600 mt-1">MAC Value Score</p>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-orange-900">Your Position</h4>
                  <span className="text-orange-600">🎯</span>
                </div>
                {selectedOrganization ? (
                  <div>
                    {(() => {
                      const userPlans = dashboardData.plans.filter(p => p.organization === selectedOrganization)
                      const avgMac = userPlans.length > 0 ? 
                        userPlans.reduce((sum, p) => sum + p.mac_value, 0) / userPlans.length : 0
                      return (
                        <>
                          <div className={`text-2xl font-bold ${getMACScoreColor(avgMac)}`}>
                            {avgMac.toFixed(1)}
                          </div>
                          <p className="text-xs text-orange-600 mt-1">Avg MAC Score ({userPlans.length} plans)</p>
                        </>
                      )
                    })()
                    }
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-orange-900">-</div>
                    <p className="text-xs text-orange-600 mt-1">Select organization</p>
                  </>
                )}
              </div>
            </div>

            {/* Strategic Insights */}
            {selectedOrganization && (
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-6 border border-blue-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">💡 Strategic Insights</h3>
                <div className="space-y-3">
                  {generateStrategicInsights().map((insight, index) => (
                    <div key={index} className={`p-4 rounded-lg border-l-4 ${
                      insight.type === 'success' ? 'bg-green-50 border-green-500' :
                      insight.type === 'warning' ? 'bg-yellow-50 border-yellow-500' :
                      'bg-red-50 border-red-500'
                    }`}>
                      <div className="flex items-start space-x-3">
                        <span className={`text-2xl ${
                          insight.type === 'success' ? 'text-green-600' :
                          insight.type === 'warning' ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {insight.type === 'success' ? '✅' : 
                           insight.type === 'warning' ? '⚠️' : '🔴'}
                        </span>
                        <div className="flex-1">
                          <h4 className={`font-semibold ${
                            insight.type === 'success' ? 'text-green-800' :
                            insight.type === 'warning' ? 'text-yellow-800' :
                            'text-red-800'
                          }`}>
                            {insight.title}
                          </h4>
                          <p className={`text-sm mt-1 ${
                            insight.type === 'success' ? 'text-green-700' :
                            insight.type === 'warning' ? 'text-yellow-700' :
                            'text-red-700'
                          }`}>
                            {insight.message}
                          </p>
                          <p className={`text-xs mt-2 font-medium ${
                            insight.type === 'success' ? 'text-green-600' :
                            insight.type === 'warning' ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            ➡️ {insight.action}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Performing Plans */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">🏅 Top Market Performers</h3>
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Organization</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">MAC Score</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value Added PMPM</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Star Rating</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {dashboardData.plans.slice(0, 10).map((plan, index) => {
                        const isUserPlan = plan.organization === selectedOrganization
                        return (
                          <tr key={index} className={`${isUserPlan ? 'bg-blue-50 border-l-4 border-blue-500' : 'hover:bg-gray-50'}`}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                  index === 0 ? 'bg-yellow-100 text-yellow-800' :
                                  index === 1 ? 'bg-gray-100 text-gray-800' :
                                  index === 2 ? 'bg-orange-100 text-orange-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}>
                                  {index + 1}
                                </span>
                                {index === 0 && <span className="ml-2">🏆</span>}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {plan.organization}
                                {isUserPlan && (
                                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                    You
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {plan.plan_name || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${
                                getMACScoreColor(plan.mac_value).replace('text-', 'text-').includes('green') ? 'bg-green-100 text-green-800' :
                                getMACScoreColor(plan.mac_value).replace('text-', 'text-').includes('blue') ? 'bg-blue-100 text-blue-800' :
                                getMACScoreColor(plan.mac_value).replace('text-', 'text-').includes('yellow') ? 'bg-yellow-100 text-yellow-800' :
                                getMACScoreColor(plan.mac_value).replace('text-', 'text-').includes('orange') ? 'bg-orange-100 text-orange-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {plan.mac_value.toFixed(1)}/100
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span className={`font-semibold ${
                                plan.value_added_pmpm > 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                ${plan.value_added_pmpm.toFixed(2)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-1">
                                <span className={`font-semibold ${
                                  parseFloat(plan.overall_rating) >= 4 ? 'text-green-600' :
                                  parseFloat(plan.overall_rating) >= 3 ? 'text-yellow-600' :
                                  'text-red-600'
                                }`}>
                                  {parseFloat(plan.overall_rating || 0).toFixed(1)}
                                </span>
                                <span className="text-yellow-500">★</span>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : selectedPayerState ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📋</div>
            <p className="text-gray-500 text-lg">No market data available for {selectedPayerState}</p>
            <p className="text-gray-400 text-sm mt-2">Try selecting a different state or check if data is available.</p>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🌎</div>
            <p className="text-gray-500 text-lg">Select your primary market to view strategic insights</p>
            <p className="text-gray-400 text-sm mt-2">Choose your organization and state from the selector above.</p>
          </div>
        )}
      </div>
    </div>
  )
}