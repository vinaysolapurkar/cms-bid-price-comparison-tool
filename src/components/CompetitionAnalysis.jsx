import { useState, useEffect } from 'react'
import { useAppContext } from '../App'
import ContextualChat from './ContextualChat'

export default function CompetitionAnalysis() {
  const { selectedOrganization, selectedPayerState } = useAppContext()
  const [selectedPayers, setSelectedPayers] = useState([])
  const [selectedState, setSelectedState] = useState('')
  const [selectedCounty, setSelectedCounty] = useState('')
  const [selectedPlanType, setSelectedPlanType] = useState('')
  const [counties, setCounties] = useState([])
  const [planTypes, setPlanTypes] = useState([])
  const [stateOrganizations, setStateOrganizations] = useState([])
  const [competitionData, setCompetitionData] = useState([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [aiInsights, setAiInsights] = useState(null)
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [isLoadingOrganizations, setIsLoadingOrganizations] = useState(false)
  const [selectedPlans, setSelectedPlans] = useState([])
  const [isChatOpen, setIsChatOpen] = useState(false)

  // Initialize with context values when available
  useEffect(() => {
    if (selectedPayerState && selectedPayerState !== selectedState) {
      setSelectedState(selectedPayerState)
    }
  }, [selectedPayerState, selectedState])

  useEffect(() => {
    if (selectedOrganization && !selectedPayers.includes(selectedOrganization)) {
      setSelectedPayers(prev => {
        const others = prev.filter(p => p !== selectedOrganization)
        return [selectedOrganization, ...others]
      })
    }
  }, [selectedOrganization, selectedPayers])

  // Fetch counties, plan types, and organizations when state changes
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
    
    const fetchPlanTypes = async () => {
      if (!selectedState) {
        setPlanTypes([])
        return
      }
      
      try {
        // Fallback to common plan types
        setPlanTypes(['HMO', 'PPO', 'HMO-POS', 'Local PPO', 'Regional PPO', 'MSA'])
      } catch (error) {
        console.error('Failed to fetch plan types:', error)
        setPlanTypes(['HMO', 'PPO', 'HMO-POS', 'Local PPO', 'Regional PPO', 'MSA'])
      }
    }
    
    const fetchOrganizations = async () => {
      if (!selectedState || !selectedCounty) {
        setStateOrganizations([])
        return
      }
      
      setIsLoadingOrganizations(true)
      try {
        let url = `http://localhost:5000/api/plans?state=${selectedState}&county=${selectedCounty}&limit=1000`
        
        const response = await fetch(url)
        const data = await response.json()
        
        if (data.status === 'success' && data.plans) {
          let plans = data.plans
          
          // Filter by plan type if selected
          if (selectedPlanType) {
            plans = plans.filter(plan => plan.plan_type === selectedPlanType)
          }
          
          const orgsWithPlans = [...new Set(plans.map(plan => plan.organization))]
          setStateOrganizations(orgsWithPlans.filter(org => org))
        } else {
          setStateOrganizations([])
        }
        
        setSelectedPayers([])
      } catch (error) {
        console.error('Failed to fetch organizations:', error)
        setStateOrganizations([])
      } finally {
        setIsLoadingOrganizations(false)
      }
    }
    
    fetchCounties()
    fetchPlanTypes()
    fetchOrganizations()
  }, [selectedState, selectedCounty, selectedPlanType])

  // Fetch competition data when filters change
  useEffect(() => {
    const fetchCompetitionData = async () => {
      if (!selectedState || selectedPayers.length === 0) {
        setCompetitionData([])
        return
      }
      
      setIsLoadingData(true)
      try {
        const params = new URLSearchParams()
        params.append('state', selectedState)
        if (selectedCounty) {
          params.append('county', selectedCounty)
        }
        selectedPayers.forEach(payer => params.append('organizations', payer))
        
        const response = await fetch(`http://localhost:5000/api/plans?${params}`)
        const data = await response.json()
        let plans = data.plans || []
        
        // Filter by plan type if selected
        if (selectedPlanType) {
          plans = plans.filter(plan => plan.plan_type === selectedPlanType)
        }
        
        setCompetitionData(plans)
        
        // Auto-select user's organization plans after data loads
        if (selectedOrganization && plans.length > 0) {
          const userPlans = plans.filter(plan => plan.organization === selectedOrganization)
          if (userPlans.length > 0) {
            const autoSelectedPlans = userPlans.map(plan => ({
              id: `${plan.contract_number}-${plan.county}-${plan.plan_type}`,
              plan: plan
            }))
            setSelectedPlans(autoSelectedPlans)
          }
        }
      } catch (error) {
        console.error('Failed to fetch competition data:', error)
        setCompetitionData([])
      } finally {
        setIsLoadingData(false)
      }
    }
    
    fetchCompetitionData()
  }, [selectedState, selectedCounty, selectedPayers, selectedPlanType, selectedOrganization])

  const handlePayerSelection = (payer) => {
    setSelectedPayers(prev => {
      if (prev.includes(payer)) {
        return prev.filter(p => p !== payer)
      } else {
        return [...prev, payer]
      }
    })
  }

  const handlePlanSelection = (plan) => {
    const planId = `${plan.contract_number}-${plan.county}-${plan.plan_type}`
    setSelectedPlans(prev => {
      if (prev.some(p => p.id === planId)) {
        return prev.filter(p => p.id !== planId)
      } else {
        return [...prev, { id: planId, plan: plan }]
      }
    })
  }

  const analyzeSelectedPlans = () => {
    if (selectedPlans.length < 2) {
      alert('Please select at least 2 plans for side-by-side comparison')
      return
    }
    
    setIsAnalyzing(true)
    setAiInsights(null)
    
    // Generate detailed comparative analysis
    const plansToAnalyze = selectedPlans.map(selectedPlan => selectedPlan.plan)
    
    // Calculate key metrics and insights
    const comparisonData = {
      plans: plansToAnalyze,
      keyMetrics: generateKeyMetricsComparison(plansToAnalyze),
      competitiveInsights: generateCompetitiveInsights(plansToAnalyze),
      recommendations: generateRecommendations(plansToAnalyze)
    }
    
    setTimeout(() => {
      setAiInsights(comparisonData)
      setIsAnalyzing(false)
    }, 1000)
  }

  const generateKeyMetricsComparison = (plans) => {
    const userPlans = plans.filter(p => p.organization === selectedOrganization)
    const competitorPlans = plans.filter(p => p.organization !== selectedOrganization)
    
    return {
      memberValuePMPM: {
        userAvg: userPlans.length > 0 ? (userPlans.reduce((sum, p) => sum + (p.member_value_pmpm || 0), 0) / userPlans.length).toFixed(2) : 0,
        competitorAvg: competitorPlans.length > 0 ? (competitorPlans.reduce((sum, p) => sum + (p.member_value_pmpm || 0), 0) / competitorPlans.length).toFixed(2) : 0,
        marketLeader: plans.reduce((max, p) => (p.member_value_pmpm || 0) > (max.member_value_pmpm || 0) ? p : max),
        marketAvg: (plans.reduce((sum, p) => sum + (p.member_value_pmpm || 0), 0) / plans.length).toFixed(2)
      },
      starRatings: {
        userAvg: userPlans.length > 0 ? (userPlans.reduce((sum, p) => sum + (parseFloat(p.overall_rating) || 0), 0) / userPlans.length).toFixed(1) : 0,
        competitorAvg: competitorPlans.length > 0 ? (competitorPlans.reduce((sum, p) => sum + (parseFloat(p.overall_rating) || 0), 0) / competitorPlans.length).toFixed(1) : 0,
        highest: plans.reduce((max, p) => (parseFloat(p.overall_rating) || 0) > (parseFloat(max.overall_rating) || 0) ? p : max),
        marketAvg: (plans.reduce((sum, p) => sum + (parseFloat(p.overall_rating) || 0), 0) / plans.length).toFixed(1)
      },
      enrollment: {
        userTotal: userPlans.reduce((sum, p) => sum + (p.enrollment || 0), 0),
        competitorTotal: competitorPlans.reduce((sum, p) => sum + (p.enrollment || 0), 0),
        marketTotal: plans.reduce((sum, p) => sum + (p.enrollment || 0), 0),
        largestPlan: plans.reduce((max, p) => (p.enrollment || 0) > (max.enrollment || 0) ? p : max)
      }
    }
  }

  const generateCompetitiveInsights = (plans) => {
    const userPlans = plans.filter(p => p.organization === selectedOrganization)
    const insights = []
    
    if (userPlans.length > 0) {
      const userAvgMemberValue = userPlans.reduce((sum, p) => sum + (p.member_value_pmpm || 0), 0) / userPlans.length
      const marketAvgMemberValue = plans.reduce((sum, p) => sum + (p.member_value_pmpm || 0), 0) / plans.length
      
      if (userAvgMemberValue > marketAvgMemberValue) {
        insights.push({
          type: 'strength',
          title: 'Member Value Leadership',
          message: `Your plans offer $${(userAvgMemberValue - marketAvgMemberValue).toFixed(2)} higher average member value PMPM than market average`
        })
      } else {
        insights.push({
          type: 'opportunity',
          title: 'Member Value Gap',
          message: `Market leaders offer $${(marketAvgMemberValue - userAvgMemberValue).toFixed(2)} higher member value PMPM. Focus on benefit optimization`
        })
      }
      
      const userAvgStars = userPlans.reduce((sum, p) => sum + (parseFloat(p.overall_rating) || 0), 0) / userPlans.length
      const marketAvgStars = plans.reduce((sum, p) => sum + (parseFloat(p.overall_rating) || 0), 0) / plans.length
      
      if (userAvgStars >= 4.0) {
        insights.push({
          type: 'strength',
          title: 'High Quality Ratings',
          message: `Your ${userAvgStars.toFixed(1)}-star average rating positions you well for quality bonus payments`
        })
      } else if (userAvgStars < marketAvgStars) {
        insights.push({
          type: 'risk',
          title: 'Quality Rating Risk',
          message: `Your ${userAvgStars.toFixed(1)}-star rating is below market average. Quality improvement is critical for competitive positioning`
        })
      }
    }
    
    return insights
  }

  const generateRecommendations = (plans) => {
    const recommendations = []
    const userPlans = plans.filter(p => p.organization === selectedOrganization)
    
    if (userPlans.length > 0) {
      const topCompetitor = plans.filter(p => p.organization !== selectedOrganization)
        .reduce((max, p) => (p.member_value_pmpm || 0) > (max.member_value_pmpm || 0) ? p : max, {member_value_pmpm: 0})
      
      if (topCompetitor.member_value_pmpm > 0) {
        recommendations.push({
          priority: 'High',
          category: 'Member Value Enhancement',
          action: `Analyze ${topCompetitor.organization}'s benefit design to understand their $${topCompetitor.member_value_pmpm.toFixed(2)} member value advantage`,
          impact: 'Revenue & Enrollment Growth'
        })
      }
      
      const lowStarPlans = userPlans.filter(p => parseFloat(p.overall_rating) < 3.5)
      if (lowStarPlans.length > 0) {
        recommendations.push({
          priority: 'Critical',
          category: 'Quality Improvement',
          action: `Immediate focus needed on ${lowStarPlans.length} plan(s) with star ratings below 3.5 to avoid penalties`,
          impact: 'Quality Bonus Payments'
        })
      }
    }
    
    return recommendations
  }

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
      {!selectedOrganization && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center mr-3">
              <span className="text-white text-sm">!</span>
            </div>
            <div>
              <p className="text-amber-800 font-medium">Select Your Organization</p>
              <p className="text-amber-700 text-sm">
                Choose your organization above to get personalized competitive analysis.
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-white shadow-lg rounded-xl p-8 border border-gray-100">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-8">
          🏆 Competition Analysis
        </h2>
        
        {/* Market Selection */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
            <select
              value={selectedState}
              onChange={(e) => {
                setSelectedState(e.target.value)
                setSelectedCounty('')
                setSelectedPlanType('')
                setAiInsights(null)
              }}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select State</option>
              {[selectedPayerState].filter(Boolean).map((state, index) => (
                <option key={`state-${index}`} value={state}>{state}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">County</label>
            <select
              value={selectedCounty}
              onChange={(e) => {
                setSelectedCounty(e.target.value)
                setAiInsights(null)
              }}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              disabled={!selectedState}
            >
              <option value="">Select County</option>
              {counties.map((county, index) => (
                <option key={`county-${index}`} value={typeof county === 'string' ? county : county?.county || county?.name || ''}>
                  {typeof county === 'string' ? county : county?.county || county?.name || ''} 
                  {county?.plan_count && ` (${county.plan_count} plans)`}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Plan Type</label>
            <select
              value={selectedPlanType}
              onChange={(e) => {
                setSelectedPlanType(e.target.value)
                setAiInsights(null)
              }}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              disabled={!selectedState}
            >
              <option value="">All Plan Types</option>
              {planTypes.map((planType, index) => (
                <option key={`plan-type-${index}`} value={planType}>
                  {planType}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-end space-x-3">
            <button
              onClick={analyzeSelectedPlans}
              disabled={competitionData.length === 0 || isAnalyzing || !selectedState || selectedPlans.length < 2}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-all"
            >
              {isAnalyzing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                  Analyzing...
                </>
              ) : (
                <>📊 Analyze Selected Plans</>
              )}
            </button>
            
            <button
              onClick={() => setIsChatOpen(true)}
              disabled={!selectedState}
              className="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-all"
              title="Ask questions about this market"
            >
              💬
            </button>
          </div>
        </div>

        {/* Payer Selection */}
        {selectedState && (
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Organizations to Compare in {selectedState}
              {selectedCounty && ` - ${selectedCounty}`}
              {selectedPlanType && (
                <span className="ml-1 text-sm text-blue-600">({selectedPlanType} plans only)</span>
              )}
              <span className="ml-2 text-sm text-gray-500">({selectedPayers.length} selected)</span>
              {isLoadingOrganizations && (
                <span className="ml-2 text-sm text-blue-600">Loading organizations...</span>
              )}
            </label>
            
            {isLoadingOrganizations ? (
              <div className="border rounded-lg p-8 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-600">Loading organizations...</p>
              </div>
            ) : stateOrganizations.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-48 overflow-y-auto border rounded-lg p-4">
                {stateOrganizations.map((org, index) => {
                  const isUserOrg = org === selectedOrganization
                  return (
                    <label key={`org-${index}`} className={`flex items-center space-x-2 p-3 rounded-lg cursor-pointer transition-all ${isUserOrg 
                        ? 'bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 hover:from-blue-100 hover:to-purple-100' 
                        : 'hover:bg-gray-50 border border-gray-200'
                    }`}>
                      <input
                        type="checkbox"
                        checked={selectedPayers.includes(org)}
                        onChange={() => handlePayerSelection(org)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className={`text-sm truncate ${isUserOrg ? 'text-blue-800 font-semibold' : 'text-gray-700'}`}>
                        {org} {isUserOrg && '(You)'}
                      </span>
                    </label>
                  )
                })}
              </div>
            ) : (
              <div className="border rounded-lg p-8 text-center text-gray-500">
                No organizations found for the selected filters
              </div>
            )}
          </div>
        )}

        {/* Competition Data Table */}
        {isLoadingData ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading competition data...</p>
          </div>
        ) : competitionData.length > 0 ? (
          <div>
            {/* Plan Selection Controls */}
            <div className="mb-6 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-6 border border-blue-100">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-semibold text-gray-900">
                  📋 Select Plans for Side-by-Side Analysis ({selectedPlans.length} selected)
                  {selectedOrganization && (
                    <span className="ml-2 text-sm text-blue-600 font-normal">
                      (Your organization's plans auto-selected)
                    </span>
                  )}
                </h4>
                <div className="space-x-2">
                  <button
                    onClick={() => setSelectedPlans(competitionData.map(plan => ({
                      id: `${plan.contract_number}-${plan.county}-${plan.plan_type}`,
                      plan: plan
                    })))}
                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => setSelectedPlans([])}
                    className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    Clear All
                  </button>
                </div>
              </div>
              
              {selectedPlans.length === 0 && competitionData.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <div className="flex items-center">
                    <div className="w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center mr-2">
                      <span className="text-white text-xs">!</span>
                    </div>
                    <p className="text-amber-800 text-sm font-medium">
                      Select at least 2 plans to enable side-by-side parameter comparison with strategic insights
                    </p>
                  </div>
                </div>
              )}
              
              {selectedPlans.length === 1 && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex items-center">
                    <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center mr-2">
                      <span className="text-white text-xs">📊</span>
                    </div>
                    <p className="text-blue-800 text-sm font-medium">
                      Select one more plan to compare key parameters side-by-side and get valuable payer insights
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-blue-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Select</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organization</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contract</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan Name</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan Type</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Star Rating</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Benchmark</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estimated Bid</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rebate</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MAC Score</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Margin %</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Part C Premium</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Part D Premium</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member Value PMPM</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enrollment</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {competitionData.map((plan, index) => {
                    const planId = `${plan.contract_number}-${plan.county}-${plan.plan_type}`
                    const isSelected = selectedPlans.some(p => p.id === planId)
                    const isUserPlan = plan.organization === selectedOrganization
                    return (
                      <tr key={index} className={`hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50' : ''} ${isUserPlan ? 'border-l-4 border-blue-500' : ''}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handlePlanSelection(plan)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </td>
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
                          {plan.plan_name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {plan.plan_type || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {renderStarRating(plan.overall_rating)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(plan.benchmark || plan.estimated_benchmark)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(plan.estimated_bid)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(plan.rebate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-center py-1 px-2 rounded-lg font-bold text-sm border-2 ${getMACScoreColor(plan.mac_value_scores?.mac_value || 0)}`}>
                            {(plan.mac_value_scores?.mac_value || 0).toFixed(1)}/100
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`font-semibold ${(plan.margin_percentage || 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {(plan.margin_percentage || 0).toFixed(2)}%
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(plan.part_c_premium)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(plan.part_d_premium)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`font-semibold ${(plan.member_value_pmpm || 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ${(plan.member_value_pmpm || 0).toFixed(2)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {(plan.enrollment || plan.ma_eligible_enrollment || 0).toLocaleString()}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : selectedState && selectedPayers.length > 0 ? (
          <div className="text-center py-8 text-gray-500">
            No competition data found for the selected filters.
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            Select a state and organizations to view competition data.
          </div>
        )}
      </div>
      
      {/* Contextual Chat */}
      <ContextualChat
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        context={{
          selectedOrganization,
          selectedState,
          selectedCounty,
          competitorOrganizations: selectedPayers,
          competitionData,
          selectedPlans
        }}
      />
    </div>
  )
}