import { useState, useEffect, createContext, useContext } from 'react'
import Dashboard from './components/Dashboard'
import StrategicDashboard from './components/StrategicDashboard'
import CompetitionAnalysis from './components/CompetitionAnalysis'
import BidSimulator from './components/BidSimulator'
import PayerSelector from './components/PayerSelector'

// Create context for global state management
const AppContext = createContext()

export const useAppContext = () => {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider')
  }
  return context
}

function App() {
  const [activeTab, setActiveTab] = useState(() => {
    return sessionStorage.getItem('activeTab') || 'strategic'
  })
  const [organizations, setOrganizations] = useState([])
  const [states, setStates] = useState([])
  const [selectedOrganization, setSelectedOrganization] = useState(() => {
    return sessionStorage.getItem('selectedOrganization') || ''
  })
  const [selectedPayerState, setSelectedPayerState] = useState(() => {
    return sessionStorage.getItem('selectedPayerState') || ''
  })
  
  // Save to session storage whenever values change
  useEffect(() => {
    sessionStorage.setItem('activeTab', activeTab)
  }, [activeTab])
  
  useEffect(() => {
    sessionStorage.setItem('selectedOrganization', selectedOrganization)
  }, [selectedOrganization])

  useEffect(() => {
    sessionStorage.setItem('selectedPayerState', selectedPayerState)
  }, [selectedPayerState])

  useEffect(() => {
    fetch('http://localhost:5000/api/organizations')
      .then(res => res.json())
      .then(data => setOrganizations(data.organizations || []))
      .catch(err => console.error('Failed to load organizations:', err))

    fetch('http://localhost:5000/api/states')
      .then(res => res.json())
      .then(data => setStates(data.states || []))
      .catch(err => console.error('Failed to load states:', err))
  }, [])

  const contextValue = {
    organizations,
    states,
    selectedOrganization,
    setSelectedOrganization,
    selectedPayerState,
    setSelectedPayerState
  }

  return (
    <AppContext.Provider value={contextValue}>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm border-b">
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center space-x-3">
                <img 
                  src="/logo.png" 
                  alt="Health Chain Logo" 
                  className="h-12 w-auto"
                />
                <h1 className="text-xl font-semibold text-gray-900">
                  CMS Bid Price Comparison Tool
                </h1>
                {selectedOrganization && (
                  <div className="ml-4 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    {selectedOrganization}
                  </div>
                )}
              </div>
              <div className="flex space-x-8">
                <button
                  onClick={() => setActiveTab('strategic')}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    activeTab === 'strategic'
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Strategic Dashboard
                </button>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    activeTab === 'dashboard'
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Plan Listing
                </button>
                <button
                  onClick={() => setActiveTab('competition')}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    activeTab === 'competition'
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Competition Analysis
                </button>
                <button
                  onClick={() => setActiveTab('simulator')}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    activeTab === 'simulator'
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Bid Simulator
                </button>
              </div>
            </div>
          </div>
        </nav>

        <main className="w-full py-6 px-4 sm:px-6 lg:px-8">
          <PayerSelector 
            selectedPayer={selectedOrganization}
            onPayerChange={setSelectedOrganization}
            selectedState={selectedPayerState}
            onStateChange={setSelectedPayerState}
          />
          
          {activeTab === 'strategic' && (
            <StrategicDashboard />
          )}
          {activeTab === 'dashboard' && (
            <Dashboard />
          )}
          {activeTab === 'competition' && (
            <CompetitionAnalysis />
          )}
          {activeTab === 'simulator' && (
            <BidSimulator />
          )}
        </main>
      </div>
    </AppContext.Provider>
  )
}

export default App