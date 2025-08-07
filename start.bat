@echo off
echo Starting CMS Bid Price Comparison Tool with MAC Value Analysis...
echo ==================================================================

echo Checking for database...
if not exist "db\cms_medicare_data_2024.db" (
    echo ERROR: Database file db\cms_medicare_data_2024.db not found!
    echo Please ensure the Medicare database is available.
    pause
    exit /b 1
)

echo.
echo MILLIMAN MACVAT SCORING SYSTEM ENABLED
echo ---------------------------------------
echo * Milliman MACVAT (Medicare Advantage Competitive Value Added Tool)
echo * Formula: Part C Benefits + Part D Benefits + Part B Buydown - Member Premiums
echo * Rebate %%: 50%% (≤3⭐), 65%% (3.5-4⭐), 70%% (≥4.5⭐)
echo * Result: Actual dollar value added PMPM to members
echo * API Endpoint: /api/mac-value-analysis
echo.

echo Starting API server on port 5000...
start "API Server" python simple_server.py

echo Waiting for API server to start...
timeout /t 5 /nobreak > nul

echo Starting frontend server on port 3000...
echo This may take a moment to optimize dependencies...
start "Frontend Server" npm run dev

echo ==================================================================
echo Both servers are starting...
echo Frontend: http://localhost:3000
echo API: http://localhost:5000
echo MAC Value API: http://localhost:5000/api/mac-value-analysis
echo ==================================================================
echo.
echo AVAILABLE FEATURES:
echo - Competition Analysis with MACVAT scores
echo - Enterprise Bid Analysis  
echo - Member Simulation
echo - MACVAT Analysis (UPDATED - Now uses correct Milliman formula)
echo.
echo Press any key to continue or close this window to stop servers...
pause > nul