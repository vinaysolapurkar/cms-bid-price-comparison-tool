# CMS Bid Price Comparison Tool - Startup Guide

## Quick Start (5 Minutes)

### Prerequisites Check
✅ **Node.js 18+** installed ([Download](https://nodejs.org/))
✅ **Python 3.7+** installed ([Download](https://python.org/))
✅ **Git** installed (optional, for cloning)

### Option 1: Windows (Easiest)
```cmd
# 1. Clone or download the repository
git clone https://github.com/vinaysolapurkar/cms-bid-price-comparison-tool.git
cd cms-bid-price-comparison-tool

# 2. Install dependencies
npm install

# 3. Start the application (opens automatically)
start.bat
```

### Option 2: Cross-Platform
```bash
# 1. Clone the repository
git clone https://github.com/vinaysolapurkar/cms-bid-price-comparison-tool.git
cd cms-bid-price-comparison-tool

# 2. Install Node.js dependencies
npm install

# 3. Start both servers
python start_servers.py
```

### Option 3: Manual Setup
```bash
# Terminal 1 - API Server
python simple_server.py

# Terminal 2 - Frontend Server
npm run dev
```

## Application Access

🌐 **Frontend**: http://localhost:3000
🔗 **API**: http://localhost:5000
📊 **MAC Analysis**: http://localhost:5000/api/mac-value-analysis

## Database Setup

### Required Database File
The application requires a SQLite database file at:
```
db/cms_medicare_data_2024.db
```

### Database Schema
The database should contain a `medicare_plans` table with these columns:

```sql
CREATE TABLE medicare_plans (
    contract_number TEXT,
    organization_marketing_name TEXT,
    county TEXT,
    state TEXT,
    fips TEXT,
    overall_rating REAL,
    part_c_rating REAL,
    part_d_rating REAL,
    part_c_premium REAL,
    part_d_premium REAL,
    total_supplemental_value REAL,
    supp_dental_vision_hearing REAL,
    supp_wellness_services REAL,
    supp_transportation REAL,
    supp_additional_medical REAL,
    plan_type TEXT,
    parent_organization TEXT,
    ma_eligible_enrollment INTEGER,
    benchmark_0pct REAL,
    benchmark_5pct REAL
);
```

### Sample Data Sources
- **CMS Plan Finder Data**: https://www.cms.gov/
- **Medicare.gov**: Plan comparison data
- **CMS Rate Books**: Benchmark and bid data

## Configuration Options

### Environment Variables
```bash
# Optional - customize ports
export FRONTEND_PORT=3000
export API_PORT=5000

# Optional - database path
export DATABASE_PATH=db/cms_medicare_data_2024.db
```

### Server Configuration
Edit `simple_server.py` to customize:
- Port number (line: `PORT = 5000`)
- Database path (line: `DATABASE_PATH = 'db/cms_medicare_data_2024.db'`)
- CORS settings

### Frontend Configuration
Edit `vite.config.js` to customize:
- Development server port
- Host settings
- Build options

## Troubleshooting

### Common Issues

#### 1. Database Not Found
```
Error: Database file db/cms_medicare_data_2024.db not found!
```
**Solution**: 
- Ensure the database file exists in the `db/` directory
- Check file permissions
- Verify the database contains the required `medicare_plans` table

#### 2. Port Already in Use
```
Error: [Errno 48] Address already in use
```
**Solution**:
```bash
# Find and kill processes using the ports
lsof -ti:5000 | xargs kill -9
lsof -ti:3000 | xargs kill -9

# Or restart the application
```

#### 3. Node.js Version Issues
```
Error: Unsupported Node.js version
```
**Solution**:
```bash
# Check version
node --version  # Should be 18+

# Update Node.js or use nvm
nvm install 18
nvm use 18
```

#### 4. Python Module Issues
```
ModuleNotFoundError: No module named 'xyz'
```
**Solution**: The API server uses only built-in Python modules. If you see this error, check for typos in imports.

#### 5. CORS Issues
```
Access to fetch blocked by CORS policy
```
**Solution**: The server includes CORS headers. If issues persist, check firewall settings.

### Performance Optimization

#### Large Databases
For databases with >100K records:
1. Add database indexes:
```sql
CREATE INDEX idx_org_state ON medicare_plans(organization_marketing_name, state);
CREATE INDEX idx_state_county ON medicare_plans(state, county);
CREATE INDEX idx_contract ON medicare_plans(contract_number);
```

2. Increase API pagination limits in `simple_server.py`

#### Memory Usage
- Frontend: ~100MB typical
- API Server: ~50MB + database cache
- Database: Varies by size

## Development Setup

### Frontend Development
```bash
# Install dependencies
npm install

# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### API Development
```bash
# The API server auto-reloads on file changes
python simple_server.py

# For debugging, add print statements or use:
python -u simple_server.py  # Unbuffered output
```

### Code Structure
```
src/
├── components/          # React components
│   ├── CompetitionAnalysis.jsx  # Fixed MAC score display
│   ├── Dashboard.jsx           # Plan listing
│   ├── StrategicDashboard.jsx  # Market intelligence
│   ├── BidSimulator.jsx        # Interactive simulation
│   ├── PayerSelector.jsx       # Organization selector
│   └── ContextualChat.jsx      # AI chat interface
├── App.jsx             # Main application
├── main.jsx           # Entry point
└── index.css          # Tailwind imports
```

### Adding New Features

1. **New API Endpoint**:
   - Add method to `APIHandler` class in `simple_server.py`
   - Add route in `do_GET` method
   - Test with `curl` or Postman

2. **New React Component**:
   - Create component in `src/components/`
   - Import and use in `App.jsx`
   - Follow existing patterns for context usage

3. **New MAC Calculation**:
   - Modify `calculate_mac_value()` in `simple_server.py`
   - Update component displays accordingly
   - Test with known data samples

## Production Deployment

### Frontend (Static Build)
```bash
# Build optimized static files
npm run build

# Serve with nginx, Apache, or CDN
# Files will be in dist/ directory
```

### API Server (Production)
```bash
# Use production WSGI server
pip install gunicorn

# Start with Gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 simple_server:app

# Or use systemd service
sudo systemctl enable cms-api
sudo systemctl start cms-api
```

### Docker Deployment
```dockerfile
# Example Dockerfile
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM python:3.9-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY simple_server.py ./
COPY db/ ./db/
EXPOSE 5000
CMD ["python", "simple_server.py"]
```

### Environment Variables (Production)
```bash
# Security
export NODE_ENV=production
export PYTHON_ENV=production

# Paths
export DATABASE_PATH=/opt/cms-tool/data/medicare_data.db
export LOG_LEVEL=INFO

# Network
export API_HOST=0.0.0.0
export API_PORT=5000
```

## Security Considerations

### Data Protection
- Database contains PII - ensure proper access controls
- Use HTTPS in production
- Implement API rate limiting for public deployments
- Regular security updates

### Access Control
- Consider adding authentication for sensitive environments
- Implement IP whitelisting if needed
- Use environment-specific configurations

## Support & Updates

### Getting Help
- **Issues**: https://github.com/vinaysolapurkar/cms-bid-price-comparison-tool/issues
- **Documentation**: Check README.md and this guide
- **API Reference**: Visit http://localhost:5000/api endpoints

### Updating
```bash
# Pull latest changes
git pull origin main

# Update dependencies
npm install

# Restart application
```

### Backup Recommendations
- **Database**: Regular backups of `db/` directory
- **Configuration**: Backup any customized config files
- **Data**: Export important analysis results

---

🎉 **You're ready to go!** The application should now be running with full MAC value analysis capabilities.