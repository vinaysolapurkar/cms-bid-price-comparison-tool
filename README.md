# CMS Bid Price Comparison Tool

A comprehensive tool for Medicare Advantage payers to analyze and optimize bid pricing strategies based on competition and profitability data.

## 🚀 Repository

- **GitHub**: [vinaysolapurkar/cms-bid-price-comparison-tool](https://github.com/vinaysolapurkar/cms-bid-price-comparison-tool)
- **Clone**: `git clone https://github.com/vinaysolapurkar/cms-bid-price-comparison-tool.git`

## ✨ Features

### 🏗️ **Four Main Components**

1. **Strategic Dashboard** - Real-time competitive intelligence and market positioning
2. **Plan Listing Dashboard** - Filter and analyze Medicare plans with profitability metrics
3. **Competition Analysis** - Market-by-market competitive positioning analysis with MAC scores  
4. **Bid Simulator** - Interactive bid price adjustment with real-time impact analysis

### 📊 **Key Capabilities**

- **MAC Value Analysis**: Milliman MACVAT scoring with market-relative comparisons (0-100 scale)
- **Benchmark Analysis**: View CMS payment rates by county
- **Bid Estimation**: Calculate estimated bids based on premiums and supplements
- **Profitability Metrics**: Analyze rebates and profit margins
- **Competitive Intelligence**: Compare against market competitors with AI-powered insights
- **Risk Assessment**: Strategic positioning guidance
- **Interactive Simulation**: Test bid price changes and see immediate impact

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** (for frontend)
- **Python 3.7+** (for API server)
- **SQLite database** with Medicare data at `db/cms_medicare_data_2024.db`

### Installation

```bash
# Clone the repository
git clone https://github.com/vinaysolapurkar/cms-bid-price-comparison-tool.git
cd cms-bid-price-comparison-tool

# Install dependencies
npm install
```

### Option 1: Windows (Recommended)
```cmd
# Double-click start.bat or run:
start.bat
```

### Option 2: Manual Startup
```bash
# Terminal 1 - Start API Server
python simple_server.py

# Terminal 2 - Start Frontend  
npm run dev
```

### Option 3: NPM Scripts
```bash
# Start API server only
npm run server

# Start frontend only  
npm run dev

# Start both (Linux/Mac)
npm run start
```

## 🌐 Application URLs

- **Frontend**: http://localhost:3000
- **API**: http://localhost:5000
- **MAC Value Analysis**: http://localhost:5000/api/mac-value-analysis

## 📖 Usage Guide

### 1. Strategic Dashboard
- Overview of key metrics and market positioning
- Real-time competitive intelligence
- MAC Value analysis with Milliman MACVAT methodology

### 2. Plan Listing Dashboard
- Filter Medicare plans by organization, state, and county
- View benchmark rates, estimated bids, rebates, and profit margins
- Analyze star ratings and supplemental benefits
- Export data for further analysis

### 3. Competition Analysis Tab  
- Select a specific state and county
- View all competitors ranked by profitability
- **MAC scores with market-relative positioning** ✨
- Side-by-side plan comparison with strategic insights
- AI-powered competitive intelligence

### 4. Bid Simulator Tab
- Choose an organization and location
- Select a specific plan from the filtered results
- Use the slider to adjust bid prices (-$200 to +$200)
- See real-time impact on:
  - Profit margins and rebate amounts
  - Member benefits and risk assessment  
  - Market positioning and competitive stance

## 🗃️ Database Schema

The application expects a SQLite database with a `medicare_plans` table containing:

- Contract and organization information
- Geographic data (state, county, FIPS)
- Rating information (Part C, Part D, Overall)
- Benchmark rates by bonus tier
- Premium and supplemental benefit data

## 🔗 API Endpoints

- `GET /api/plans` - Retrieve Medicare plans with filters (includes MAC scores)
- `GET /api/organizations` - Get list of organizations
- `GET /api/states` - Get list of states
- `GET /api/counties` - Get counties for a state
- `GET /api/competition-analysis` - Market competition analysis
- `GET /api/mac-value-analysis` - MAC Value analysis with market statistics
- `GET /api/enterprise-bid-analysis` - Comprehensive bid analysis
- `GET /api/member-simulation` - Member cost simulation

## 🧮 Business Logic

### MAC Value Calculation (Milliman MACVAT)
```python
def calculate_mac_value(plan, market_data=None):
    # Formula: Part C + Part D + Part B Buydown - Member Premiums
    part_c_benefit_value = rebate_amount + supplemental_benefits_pmpm
    part_d_benefit_value = rebate_amount * 0.25  # Rough estimate
    part_b_buydown = plan.get('part_b_buydown', 0)
    total_member_premium = part_c_premium + part_d_premium
    
    total_value_added = (part_c_benefit_value + 
                        part_d_benefit_value + 
                        part_b_buydown - 
                        total_member_premium)
    
    # Market-relative scoring (0-100 scale)
    return normalized_score
```

### Bid Estimation Algorithm
```python
def calculate_estimated_bid(benchmark, premium, supplements):
    admin_margin = benchmark * 0.035
    
    if no_premium and supplements > 0:
        estimated_bid = benchmark - (supplements * 0.05) - admin_margin
    elif premium > 0:
        estimated_bid = benchmark - premium - admin_margin
    else:
        estimated_bid = benchmark * 0.92
    
    return max(min(estimated_bid, benchmark), benchmark * 0.80)
```

### Risk Assessment
- **Low Risk**: Margin > 8%
- **Medium Risk**: Margin 3-8%  
- **High Risk**: Margin < 3%

### Market Positioning
- **High Margin**: Margin > 15%
- **Competitive**: Margin 8-15%
- **Aggressive**: Margin 3-8%
- **Very Aggressive**: Margin < 3%

## 🛠️ Troubleshooting

### Common Issues

1. **Database Not Found**
   - Ensure `db/cms_medicare_data_2024.db` exists
   - Run the database setup scripts first

2. **Port Already in Use**
   - Kill existing processes on ports 3000 and 5000
   - Use different ports if needed

3. **Node Version Issues**
   - Ensure Node.js 18+ is installed
   - Use `nvm` to manage Node versions

4. **Python Dependencies**
   - The API server uses only built-in Python modules
   - No additional packages required

## 📁 Project Structure

```
cms-bid-price-comparison-tool/
├── src/                    # React frontend source
│   ├── components/         # React components
│   │   ├── Dashboard.jsx
│   │   ├── CompetitionAnalysis.jsx  
│   │   ├── BidSimulator.jsx
│   │   ├── StrategicDashboard.jsx
│   │   └── ContextualChat.jsx
│   ├── App.jsx            # Main application
│   ├── main.jsx           # Entry point
│   └── index.css          # Tailwind CSS imports
├── db/                    # Database directory
│   └── cms_medicare_data_2024.db   # SQLite database
├── simple_server.py       # Python API server with MAC calculations
├── start.bat             # Windows startup script
├── index.html            # HTML template
├── package.json          # Node.js configuration
├── vite.config.js        # Vite configuration
└── tailwind.config.js    # Tailwind CSS configuration
```

## 📄 License

ISC License - Feel free to use and modify for your organization's needs.

---

## 🔥 Recent Updates

- ✅ **Fixed MAC score calculation** in competition analysis
- ✅ **Added market-relative MAC scoring** (0-100 scale)
- ✅ **Enhanced API endpoints** with comprehensive MAC value analysis
- ✅ **Integrated Milliman MACVAT methodology** throughout the application
- ✅ **Removed Part C and Part D rating columns** for cleaner UI
- ✅ **Created GitHub repository** with complete project files

**Built for Medicare Advantage payers to make data-driven bid pricing decisions with confidence.**

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## ⭐ Star this repo if it helped you!