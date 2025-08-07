#!/usr/bin/env python3
"""
Simple HTTP server for CMS Bid Price Comparison Tool using only built-in Python modules
"""

import http.server
import socketserver
import sqlite3
import json
import urllib.parse
import os
import requests
import statistics
from datetime import datetime

DATABASE_PATH = 'db/cms_medicare_data_2024.db'

def calculate_estimated_bid(benchmark, premium, supplements):
    """Calculate estimated bid"""
    if not benchmark:
        return None
        
    admin_margin = benchmark * 0.035
    
    if (not premium or premium == 0) and supplements and supplements > 0:
        estimated_bid = benchmark - (supplements * 0.05) - admin_margin
    elif premium and premium > 0:
        estimated_bid = benchmark - premium - admin_margin
    else:
        estimated_bid = benchmark * 0.92
    
    return max(min(estimated_bid, benchmark), benchmark * 0.80)

def calculate_member_value_pmpm(plan):
    """Calculate member value per member per month"""
    try:
        # Base components for value calculation (all in PMPM)
        rebate_pmpm = plan.get('rebate', 0) or 0
        supplemental_value_pmpm = plan.get('total_supplemental_value', 0) or 0
        part_c_premium = plan.get('part_c_premium', 0) or 0
        part_d_premium = plan.get('part_d_premium', 0) or 0
        
        # Total member premium PMPM
        total_premium_pmpm = part_c_premium + part_d_premium
        
        # Member value PMPM = benefits received - premiums paid
        member_value_pmpm = rebate_pmpm + supplemental_value_pmpm - total_premium_pmpm
        
        return member_value_pmpm
    except:
        return 0