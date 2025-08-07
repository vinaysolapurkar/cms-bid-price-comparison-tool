#!/usr/bin/env python3
"""
Cross-platform server startup script for CMS Bid Price Comparison Tool
Starts both the Python API server and the Vite development server
"""

import os
import sys
import subprocess
import threading
import time
import signal
from pathlib import Path

# Configuration
API_PORT = 5000
FRONTEND_PORT = 3000
DATABASE_PATH = 'db/cms_medicare_data_2024.db'

def check_prerequisites():
    """Check if all prerequisites are met"""
    print("🔍 Checking prerequisites...")
    
    # Check Python version
    if sys.version_info < (3, 7):
        print("❌ Python 3.7+ is required")
        return False
    print(f"✅ Python {sys.version.split()[0]} found")
    
    # Check Node.js
    try:
        result = subprocess.run(['node', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            node_version = result.stdout.strip()
            print(f"✅ Node.js {node_version} found")
        else:
            raise subprocess.CalledProcessError(1, 'node')
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("❌ Node.js not found. Please install Node.js 18+ from https://nodejs.org/")
        return False
    
    # Check npm
    try:
        subprocess.run(['npm', '--version'], capture_output=True, check=True)
        print("✅ npm found")
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("❌ npm not found. Please install Node.js which includes npm")
        return False
    
    # Check database
    if not os.path.exists(DATABASE_PATH):
        print(f"⚠️  Database file {DATABASE_PATH} not found")
        print("   The application will start but may not work properly without data")
    else:
        print(f"✅ Database file found at {DATABASE_PATH}")
    
    # Check if package.json exists
    if not os.path.exists('package.json'):
        print("❌ package.json not found. Make sure you're in the project root directory")
        return False
    print("✅ package.json found")
    
    return True

def install_dependencies():
    """Install npm dependencies if needed"""
    if not os.path.exists('node_modules'):
        print("📦 Installing npm dependencies...")
        try:
            subprocess.run(['npm', 'install'], check=True)
            print("✅ Dependencies installed")
        except subprocess.CalledProcessError:
            print("❌ Failed to install dependencies")
            return False
    else:
        print("✅ Dependencies already installed")
    return True

def check_port(port):
    """Check if a port is available"""
    import socket
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('localhost', port)) != 0

def start_api_server():
    """Start the Python API server"""
    print(f"🚀 Starting API server on port {API_PORT}...")
    
    if not check_port(API_PORT):
        print(f"⚠️  Port {API_PORT} is already in use")
        return None
    
    try:
        # Use python3 if available, otherwise python
        python_cmd = 'python3' if subprocess.run(['which', 'python3'], capture_output=True).returncode == 0 else 'python'
        process = subprocess.Popen([python_cmd, 'simple_server.py'], 
                                 stdout=subprocess.PIPE, 
                                 stderr=subprocess.STDOUT,
                                 universal_newlines=True,
                                 bufsize=1)
        
        # Give the server time to start
        time.sleep(2)
        
        if process.poll() is None:
            print(f"✅ API server started (PID: {process.pid})")
            return process
        else:
            print("❌ API server failed to start")
            return None
    except Exception as e:
        print(f"❌ Failed to start API server: {e}")
        return None

def start_frontend_server():
    """Start the Vite frontend server"""
    print(f"🎨 Starting frontend server on port {FRONTEND_PORT}...")
    
    if not check_port(FRONTEND_PORT):
        print(f"⚠️  Port {FRONTEND_PORT} is already in use")
        return None
    
    try:
        process = subprocess.Popen(['npm', 'run', 'dev'], 
                                 stdout=subprocess.PIPE, 
                                 stderr=subprocess.STDOUT,
                                 universal_newlines=True,
                                 bufsize=1)
        
        # Give Vite time to start
        time.sleep(3)
        
        if process.poll() is None:
            print(f"✅ Frontend server started (PID: {process.pid})")
            return process
        else:
            print("❌ Frontend server failed to start")
            return None
    except Exception as e:
        print(f"❌ Failed to start frontend server: {e}")
        return None

def print_banner():
    """Print application banner"""
    print("")
    print("=" * 80)
    print("🏥 CMS BID PRICE COMPARISON TOOL WITH MAC VALUE ANALYSIS")
    print("=" * 80)
    print("")
    print("📊 MILLIMAN MACVAT SCORING SYSTEM ENABLED")
    print("-" * 50)
    print("• Milliman MACVAT (Medicare Advantage Competitive Value Added Tool)")
    print("• Formula: Part C Benefits + Part D Benefits + Part B Buydown - Member Premiums")
    print("• Rebate %: 50% (≤3⭐), 65% (3.5-4⭐), 70% (≥4.5⭐)")
    print("• Result: Actual dollar value added PMPM to members")
    print("• API Endpoint: /api/mac-value-analysis")
    print("")
    
def print_access_info():
    """Print access information"""
    print("=" * 80)
    print("🌐 APPLICATION ACCESS")
    print("=" * 80)
    print(f"Frontend:     http://localhost:{FRONTEND_PORT}")
    print(f"API:          http://localhost:{API_PORT}")
    print(f"MAC Analysis: http://localhost:{API_PORT}/api/mac-value-analysis")
    print("=" * 80)
    print("")
    print("🎯 AVAILABLE FEATURES:")
    print("• Strategic Dashboard - Real-time competitive intelligence")
    print("• Competition Analysis with MACVAT scores (FIXED - now shows correct values)")
    print("• Enterprise Bid Analysis with market positioning")
    print("• Interactive Bid Simulator with risk assessment")
    print("• AI-powered Market Intelligence Chat")
    print("")
    print("💡 TIP: Select your organization and state in the app for personalized insights")
    print("")

def cleanup_processes(api_process, frontend_process):
    """Clean up processes on exit"""
    print("\n🛑 Shutting down servers...")
    
    if api_process and api_process.poll() is None:
        print("   Stopping API server...")
        api_process.terminate()
        try:
            api_process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            api_process.kill()
    
    if frontend_process and frontend_process.poll() is None:
        print("   Stopping frontend server...")
        frontend_process.terminate()
        try:
            frontend_process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            frontend_process.kill()
    
    print("✅ Servers stopped")

def main():
    """Main function"""
    print_banner()
    
    # Check prerequisites
    if not check_prerequisites():
        print("\n❌ Prerequisites not met. Please install the required software and try again.")
        return 1
    
    # Install dependencies
    if not install_dependencies():
        print("\n❌ Failed to install dependencies")
        return 1
    
    print("\n" + "=" * 80)
    print("🚀 STARTING SERVERS...")
    print("=" * 80)
    
    # Start API server
    api_process = start_api_server()
    if not api_process:
        print("❌ Could not start API server")
        return 1
    
    # Start frontend server
    frontend_process = start_frontend_server()
    if not frontend_process:
        print("❌ Could not start frontend server")
        cleanup_processes(api_process, None)
        return 1
    
    # Print access information
    print_access_info()
    
    # Set up signal handlers for graceful shutdown
    def signal_handler(signum, frame):
        cleanup_processes(api_process, frontend_process)
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    try:
        print("⌨️  Press Ctrl+C to stop both servers")
        print("")
        
        # Keep the main process alive
        while True:
            # Check if processes are still running
            if api_process.poll() is not None:
                print("❌ API server stopped unexpectedly")
                break
            if frontend_process.poll() is not None:
                print("❌ Frontend server stopped unexpectedly")
                break
            
            time.sleep(1)
    
    except KeyboardInterrupt:
        pass
    finally:
        cleanup_processes(api_process, frontend_process)
    
    return 0

if __name__ == '__main__':
    sys.exit(main())