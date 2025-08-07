import { useState, useEffect, useRef } from 'react'

export default function ContextualChat({ isOpen, onClose, context }) {
  const [messages, setMessages] = useState([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (isOpen) {
      // Initialize with context-aware greeting
      const greeting = generateContextualGreeting(context)
      setMessages([{
        type: 'assistant',
        content: greeting,
        timestamp: new Date()
      }])
    }
  }, [isOpen, context])

  const generateContextualGreeting = (context) => {
    const { selectedOrganization, selectedState, selectedCounty, competitionData } = context
    
    let greeting = "👋 Hello! I'm your Medicare Advantage market intelligence assistant. "
    
    if (selectedOrganization && selectedState) {
      greeting += `I see you're analyzing ${selectedOrganization}'s competitive position in ${selectedState}${selectedCounty ? ` - ${selectedCounty}` : ''}. `
    } else if (selectedState) {
      greeting += `I see you're exploring the ${selectedState} market. `
    }
    
    if (competitionData && competitionData.length > 0) {
      greeting += `With ${competitionData.length} plans in your current analysis, `
    }
    
    greeting += "I can help you understand:\n\n"
    greeting += "🏆 **Competitive positioning** - How you stack up against competitors\n"
    greeting += "💰 **MAC value insights** - Milliman MACVAT analysis and optimization\n"
    greeting += "📊 **Market trends** - What's driving success in this market\n"
    greeting += "🎯 **Strategic recommendations** - Actionable insights for growth\n\n"
    greeting += "What would you like to explore?"
    
    return greeting
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return
    
    const userMessage = {
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)
    
    // Simulate AI response based on context
    setTimeout(() => {
      const response = generateContextualResponse(inputMessage, context)
      const assistantMessage = {
        type: 'assistant',
        content: response,
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, assistantMessage])
      setIsLoading(false)
    }, 1500)
  }

  const generateContextualResponse = (question, context) => {
    const { selectedOrganization, competitionData, selectedPlans } = context
    const questionLower = question.toLowerCase()
    
    // MAC Value related questions
    if (questionLower.includes('mac') || questionLower.includes('value')) {
      return "📊 **MAC Value Analysis**\n\nMAC (Member Advantage Composite) scores use the Milliman MACVAT methodology:\n\n**Formula**: Part C Benefits + Part D Benefits + Part B Buydown - Member Premiums\n\n• **80-100**: Excellent member value\n• **60-79**: Good competitive position\n• **40-59**: Average market performance\n• **Below 40**: Needs improvement\n\nFor optimization, focus on:\n✅ Increasing supplemental benefits\n✅ Improving star ratings for higher rebates\n✅ Optimizing premium strategy\n\nWould you like specific recommendations for your plans?"
    }
    
    // Competition related questions
    if (questionLower.includes('compet') || questionLower.includes('market')) {
      if (competitionData && competitionData.length > 0) {
        const organizations = [...new Set(competitionData.map(p => p.organization))]
        return `🏆 **Market Competitive Landscape**\n\nYou're analyzing ${competitionData.length} plans across ${organizations.length} organizations:\n\n${organizations.slice(0, 5).map(org => `• ${org}`).join('\n')}\n\n**Key Success Factors in This Market:**\n✅ High star ratings (4+ stars typically lead)\n✅ Competitive supplemental benefits\n✅ Strong member value proposition\n✅ Efficient bid-to-benchmark ratios\n\nWant me to analyze specific competitor strategies?"`
      }
      return "🏆 To provide market insights, please select some organizations and plans in the Competition Analysis tab first."
    }
    
    // Star rating questions
    if (questionLower.includes('star') || questionLower.includes('rating') || questionLower.includes('quality')) {
      return "⭐ **Star Ratings & Quality Impact**\n\n**Rebate Percentages by Star Rating:**\n• 4.5+ stars: 70% of savings as rebate\n• 3.5-4.4 stars: 65% of savings as rebate\n• Below 3.5 stars: 50% of savings as rebate\n\n**Quality Improvement Strategies:**\n✅ Focus on HEDIS measures\n✅ Improve customer service (CAHPS)\n✅ Enhance care coordination\n✅ Strengthen provider networks\n\nHigher star ratings = Higher rebates = Better member value = More enrollment!"
    }
    
    // Bid strategy questions
    if (questionLower.includes('bid') || questionLower.includes('pricing')) {
      return "💼 **Bid Strategy Insights**\n\n**Optimal Bid Positioning:**\n• Target 85-95% of benchmark for competitive rebates\n• Balance member value with profitability\n• Consider county-specific competitive dynamics\n\n**Key Factors:**\n✅ Administrative costs (~3.5% of benchmark)\n✅ Medical cost trends and risk adjustment\n✅ Supplemental benefit investments\n✅ Premium strategy (Part C + Part D)\n\nWould you like me to analyze bid optimization opportunities for specific plans?"
    }
    
    // Default helpful response
    return `🤔 That's an interesting question about Medicare Advantage strategy!\n\n**I can help you with:**\n• MAC value analysis and optimization\n• Competitive positioning insights\n• Star rating improvement strategies\n• Bid optimization recommendations\n• Market trend analysis\n\n${selectedOrganization ? `Since you're focused on ${selectedOrganization}` : 'Once you select your organization'}, I can provide more specific insights.\n\nCould you be more specific about what aspect of your strategy you'd like to explore?`
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-xl font-bold text-gray-900">🤖 Market Intelligence Assistant</h3>
            <p className="text-sm text-gray-600">
              {context.selectedOrganization ? 
                `Analyzing ${context.selectedOrganization}${context.selectedState ? ` in ${context.selectedState}` : ''}` :
                'Ready to help with your Medicare Advantage strategy'
              }
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <span className="text-2xl">×</span>
          </button>
        </div>
        
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message, index) => (
            <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-lg px-4 py-3 ${
                message.type === 'user' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-900'
              }`}>
                <div className="whitespace-pre-line">{message.content}</div>
                <div className={`text-xs mt-1 ${
                  message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg px-4 py-3">
                <div className="flex items-center space-x-2">
                  <div className="animate-pulse flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                  <span className="text-gray-600 text-sm">Thinking...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Input */}
        <div className="border-t border-gray-200 p-6">
          <div className="flex space-x-3">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about competitive positioning, MAC values, bid strategy, or market trends..."
              className="flex-1 resize-none border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={2}
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Send
            </button>
          </div>
          
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => setInputMessage("How can I improve my MAC values?")}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
            >
              💡 Improve MAC values
            </button>
            <button
              onClick={() => setInputMessage("What are the key competitive differentiators in this market?")}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
            >
              🏆 Market differentiators
            </button>
            <button
              onClick={() => setInputMessage("How do star ratings impact my rebate potential?")}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
            >
              ⭐ Star rating impact
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}