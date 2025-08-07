import { useState, useEffect } from 'react'
import { useAppContext } from '../App'

export default function BidSimulator() {
  const { selectedOrganization, selectedPayerState } = useAppContext()
  const [plans, setPlans] = useState([])
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [bidAdjustment, setBidAdjustment] = useState(0)
  const [simulationResults, setSimulationResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [selectedState, setSelectedState] = useState('')
  const [selectedCounty, setSelectedCounty] = useState('')
  const [counties, setCounties] = useState([])

  // Initialize state from context
  useEffect(() => {
    if (selectedPayerState) {
      setSelectedState(selectedPayerState)
    }
  }, [selectedPayerState])

  // Fetch counties when state changes
  useEffect(() => {
    const fetchCounties = async () => {
      if (!selectedState) {
        setCounties([])
        return
      }
      
      try {
        const response = await fetch(`http://localhost:5000/api/counties?state=${selectedState}`)
        const data = await response.json()
        setCounties(data.counties || [])
      } catch (error) {
        console.error('Failed to fetch counties:', error)
        setCounties([])
      }
    }
    
    fetchCounties()
  }, [selectedState])

  // Fetch plans when filters change
  useEffect(() => {
    const fetchPlans = async () => {
      if (!selectedState || !selectedOrganization) {
        setPlans([])
        return
      }
      
      setLoading(true)
      try {
        const params = new URLSearchParams()
        params.append('organization', selectedOrganization)
        params.append('state', selectedState)
        if (selectedCounty) {
          params.append('county', selectedCounty)
        }
        params.append('limit', '100')
        
        const response = await fetch(`http://localhost:5000/api/plans?${params}`)
        const data = await response.json()
        
        if (data.status === 'success') {
          setPlans(data.plans || [])
          // Auto-select first plan if available
          if (data.plans && data.plans.length > 0) {
            setSelectedPlan(data.plans[0])
          }
        } else {
          setPlans([])
        }
      } catch (error) {
        console.error('Failed to fetch plans:', error)
        setPlans([])
      } finally {
        setLoading(false)
      }
    }
    
    fetchPlans()
  }, [selectedOrganization, selectedState, selectedCounty])

  // Simulate bid impact when adjustment changes
  useEffect(() => {
    if (selectedPlan) {
      simulateBidImpact()
    }
  }, [selectedPlan, bidAdjustment])

  const simulateBidImpact = () => {
    if (!selectedPlan) return

    const originalBid = selectedPlan.estimated_bid || 0
    const benchmark = selectedPlan.estimated_benchmark || 0
    const newBid = originalBid + bidAdjustment
    
    // Calculate new financial metrics
    const newRebate = Math.max(0, benchmark - newBid)
    const originalRebate = selectedPlan.rebate || 0
    const rebateDifference = newRebate - originalRebate
    
    // Calculate margin impact
    const originalMargin = selectedPlan.margin_percentage || 0
    const newMargin = benchmark > 0 ? ((benchmark - newBid) / benchmark * 100) : 0
    const marginDifference = newMargin - originalMargin
    
    // Calculate member value impact
    const starRating = parseFloat(selectedPlan.overall_rating) || 0
    const rebatePercentage = starRating >= 4.5 ? 0.70 : starRating >= 3.5 ? 0.65 : 0.50
    const newMemberRebate = newRebate * rebatePercentage
    const originalMemberRebate = originalRebate * rebatePercentage
    const memberValueDifference = newMemberRebate - originalMemberRebate
    
    // Risk assessment
    let riskLevel = 'Low'
    let riskColor = 'text-green-600'
    let riskIcon = '✅'
    
    if (newMargin < 3) {
      riskLevel = 'High'
      riskColor = 'text-red-600'
      riskIcon = '🔴'
    } else if (newMargin < 8) {
      riskLevel = 'Medium'
      riskColor = 'text-yellow-600'
      riskIcon = '⚠️'
    }
    
    // Market positioning
    let positioning = 'Conservative'
    let positioningColor = 'text-blue-600'
    
    if (newMargin > 15) {
      positioning = 'High Margin'
      positioningColor = 'text-green-600'
    } else if (newMargin > 8) {
      positioning = 'Competitive'
      positioningColor = 'text-blue-600'
    } else if (newMargin > 3) {
      positioning = 'Aggressive'
      positioningColor = 'text-orange-600'
    } else {
      positioning = 'Very Aggressive'
      positioningColor = 'text-red-600'
    }
    
    setSimulationResults({
      originalBid,
      newBid,
      bidDifference: bidAdjustment,
      originalRebate,
      newRebate,
      rebateDifference,
      originalMargin,
      newMargin,
      marginDifference,
      memberValueDifference,
      riskLevel,
      riskColor,
      riskIcon,
      positioning,
      positioningColor
    })
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value || 0)
  }

  const formatPercentage = (value) => {
    return `${(value || 0).toFixed(2)}%`
  }

  const getChangeIndicator = (value) => {
    if (value > 0) return { icon: '⬆️', color: 'text-green-600' }
    if (value < 0) return { icon: '⬇️', color: 'text-red-600' }
    return { icon: '➡️', color: 'text-gray-600' }
  }

  return (
    <div className="space-y-6">
      {!selectedOrganization && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center mr-3">
              <span className="text-white text-sm">!</span>
            </div>
            <div>
              <p className="text-amber-800 font-medium">Organization Required</p>
              <p className="text-amber-700 text-sm">
                Please select your organization above to simulate bid adjustments for your plans.
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-white shadow-lg rounded-xl p-8 border border-gray-100">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-8">
          🎯 Interactive Bid Simulator
        </h2>
        
        {/* Plan Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
            <select
              value={selectedState}
              onChange={(e) => {
                setSelectedState(e.target.value)
                setSelectedCounty('')
                setSelectedPlan(null)
              }}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              disabled={!selectedOrganization}
            >
              <option value="">Select State</option>
              <option value={selectedPayerState}>{selectedPayerState}</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">County</label>
            <select
              value={selectedCounty}
              onChange={(e) => {
                setSelectedCounty(e.target.value)
                setSelectedPlan(null)
              }}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              disabled={!selectedState}
            >
              <option value="">All Counties</option>
              {counties.map((county, index) => (
                <option key={`county-${index}`} value={typeof county === 'string' ? county : county?.county || ''}>
                  {typeof county === 'string' ? county : `${county?.county || ''} (${county?.plan_count || 0} plans)`}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Plan to Simulate
              <span className="ml-1 text-xs text-gray-500">({plans.length} available)</span>
            </label>
            <select
              value={selectedPlan ? `${selectedPlan.contract_number}-${selectedPlan.county}` : ''}
              onChange={(e) => {
                const planId = e.target.value
                const plan = plans.find(p => `${p.contract_number}-${p.county}` === planId)
                setSelectedPlan(plan || null)
                setBidAdjustment(0)
              }}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              disabled={plans.length === 0}
            >
              <option value="">Choose a plan</option>
              {plans.map((plan, index) => (
                <option key={index} value={`${plan.contract_number}-${plan.county}`}>
                  {plan.contract_number} - {plan.county} ({plan.plan_type})
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading your plans...</p>
          </div>
        )}
        
        {selectedPlan && (
          <div className="space-y-8">
            {/* Current Plan Details */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Current Plan Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Benchmark</p>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(selectedPlan.estimated_benchmark)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Current Bid</p>
                  <p className="text-lg font-bold text-blue-600">{formatCurrency(selectedPlan.estimated_bid)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Current Rebate</p>
                  <p className="text-lg font-bold text-green-600">{formatCurrency(selectedPlan.rebate)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Margin %</p>
                  <p className={`text-lg font-bold ${selectedPlan.margin_percentage > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercentage(selectedPlan.margin_percentage)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Star Rating</p>
                  <p className="text-lg font-bold text-yellow-600">{parseFloat(selectedPlan.overall_rating).toFixed(1)} ★</p>
                </div>
              </div>
            </div>
            
            {/* Bid Adjustment Slider */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">🎯 Bid Price Adjustment</h3>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Adjustment Amount</p>
                  <p className={`text-2xl font-bold ${bidAdjustment > 0 ? 'text-red-600' : bidAdjustment < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                    {bidAdjustment > 0 ? '+' : ''}{formatCurrency(bidAdjustment)}
                  </p>
                </div>
              </div>
              
              <div className="space-y-4">
                <input
                  type="range"
                  min="-200"
                  max="200"
                  step="5"
                  value={bidAdjustment}
                  onChange={(e) => setBidAdjustment(parseInt(e.target.value))}
                  className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
                
                <div className="flex justify-between text-sm text-gray-600">
                  <span>-$200 (Lower Bid)</span>
                  <span>$0 (Current)</span>
                  <span>+$200 (Higher Bid)</span>
                </div>
                
                <div className="flex justify-center space-x-3 mt-4">
                  <button
                    onClick={() => setBidAdjustment(-100)}
                    className="px-4 py-2 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition-colors"
                  >
                    -$100 More Aggressive
                  </button>
                  <button
                    onClick={() => setBidAdjustment(0)}
                    className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Reset to Current
                  </button>
                  <button
                    onClick={() => setBidAdjustment(100)}
                    className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    +$100 More Conservative
                  </button>
                </div>
              </div>
            </div>
            
            {/* Simulation Results */}
            {simulationResults && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Financial Impact */}
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">💰 Financial Impact</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-700">New Bid Amount</span>
                      <span className="font-bold text-blue-600">{formatCurrency(simulationResults.newBid)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-700">Rebate Change</span>
                      <div className="text-right">
                        <span className={`font-bold ${getChangeIndicator(simulationResults.rebateDifference).color}`}>
                          {getChangeIndicator(simulationResults.rebateDifference).icon} {formatCurrency(Math.abs(simulationResults.rebateDifference))}
                        </span>
                        <p className="text-xs text-gray-600">{formatCurrency(simulationResults.newRebate)} total</p>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-700">Margin Change</span>
                      <div className="text-right">
                        <span className={`font-bold ${getChangeIndicator(simulationResults.marginDifference).color}`}>
                          {getChangeIndicator(simulationResults.marginDifference).icon} {Math.abs(simulationResults.marginDifference).toFixed(2)}%
                        </span>
                        <p className="text-xs text-gray-600">{formatPercentage(simulationResults.newMargin)} total</p>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-700">Member Value Change</span>
                      <div className="text-right">
                        <span className={`font-bold ${getChangeIndicator(simulationResults.memberValueDifference).color}`}>
                          {getChangeIndicator(simulationResults.memberValueDifference).icon} {formatCurrency(Math.abs(simulationResults.memberValueDifference))}
                        </span>
                        <p className="text-xs text-gray-600">Annual per member</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Risk Assessment */}
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">🎯 Strategic Assessment</h3>
                  <div className="space-y-6">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-2">Risk Level</p>
                      <p className={`text-2xl font-bold ${simulationResults.riskColor}`}>
                        {simulationResults.riskIcon} {simulationResults.riskLevel}
                      </p>
                    </div>
                    
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-2">Market Positioning</p>
                      <p className={`text-xl font-bold ${simulationResults.positioningColor}`}>
                        {simulationResults.positioning}
                      </p>
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 mb-2">💡 Strategic Recommendation</h4>
                      <p className="text-sm text-blue-800">
                        {simulationResults.riskLevel === 'Low' && simulationResults.marginDifference < 0 && 
                          "This adjustment increases competitive positioning while maintaining healthy margins. Consider if market share growth justifies the margin reduction."
                        }
                        {simulationResults.riskLevel === 'Medium' && 
                          "This positioning balances competitiveness with profitability. Monitor market response and be prepared to adjust."
                        }
                        {simulationResults.riskLevel === 'High' && 
                          "This aggressive positioning carries significant risk. Ensure strong cost management and consider alternative strategies to improve member value."
                        }
                        {simulationResults.marginDifference > 0 && 
                          "This conservative approach prioritizes profitability. Ensure member value remains competitive to maintain enrollment."
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        
        {!selectedPlan && !loading && plans.length === 0 && selectedOrganization && selectedState && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No plans found for {selectedOrganization} in {selectedState}</p>
            <p className="text-gray-400 text-sm mt-2">Try selecting a different state or county.</p>
          </div>
        )}
      </div>
    </div>
  )
}