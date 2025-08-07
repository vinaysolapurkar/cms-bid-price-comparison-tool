#!/usr/bin/env python3
"""
Simple HTTP server for CMS Bid Price Comparison Tool using only built-in Python modules
Enhanced with MAC Value Analysis using Milliman MACVAT methodology
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
        # Base components for value calculation
        rebate = plan.get('rebate', 0) or 0
        supplemental_value = plan.get('total_supplemental_value', 0) or 0
        part_c_premium = plan.get('part_c_premium', 0) or 0
        part_d_premium = plan.get('part_d_premium', 0) or 0
        
        # Annual value calculation
        annual_rebate = rebate
        annual_supplemental = supplemental_value
        annual_premium_cost = (part_c_premium + part_d_premium) * 12
        
        # Total annual member value (what member receives - what they pay)
        annual_member_value = annual_rebate + annual_supplemental - annual_premium_cost
        
        # Convert to PMPM
        return annual_member_value / 12
    except:
        return 0

def calculate_mac_value(plan, market_data=None):
    """
    Calculate Milliman MACVAT (Medicare Advantage Competitive Value Added Tool) Score
    Formula: Total value added = Part C benefit value + Part D benefit value + Part B premium buydown – total member (C + D) premium
    """
    try:
        # Core MACVAT components (all in PMPM)
        part_c_premium = (plan.get('part_c_premium', 0) or 0)
        part_d_premium = (plan.get('part_d_premium', 0) or 0)
        total_member_premium = part_c_premium + part_d_premium
        
        # Estimate Part B premium buydown (if plan covers it)
        part_b_buydown = plan.get('part_b_buydown', 0) or 0  # Usually 0 unless specifically offered
        
        # Calculate rebate using actual CMS methodology
        benchmark = plan.get('estimated_benchmark', 0) or plan.get('benchmark_0pct', 0) or 0
        estimated_bid = plan.get('estimated_bid', 0) or 0
        star_rating = plan.get('overall_rating', 0) or 0
        
        # CMS rebate percentage based on star rating
        if star_rating >= 4.5:
            rebate_percentage = 0.70
        elif star_rating >= 3.5:
            rebate_percentage = 0.65
        else:
            rebate_percentage = 0.50
            
        # Calculate rebate if bid is below benchmark
        gross_savings = max(0, benchmark - estimated_bid) if benchmark and estimated_bid else 0
        rebate_amount = gross_savings * rebate_percentage
        
        # Part C benefit value = rebate + supplemental benefits
        supplemental_benefits_annual = plan.get('total_supplemental_value', 0) or 0
        supplemental_benefits_pmpm = supplemental_benefits_annual / 12
        part_c_benefit_value = rebate_amount + supplemental_benefits_pmpm
        
        # Part D benefit value (estimated based on coverage vs. standard)
        # Using simplified approach - in reality this requires detailed Part D benefit analysis
        part_d_benefit_value = rebate_amount * 0.25  # Rough estimate - 25% of rebate allocated to Part D
        
        # Apply Milliman MACVAT formula
        total_value_added = (part_c_benefit_value + 
                           part_d_benefit_value + 
                           part_b_buydown - 
                           total_member_premium)
        
        # Convert to 0-100 scale for UI comparison (Milliman reports actual dollar values)
        # Store the raw value for market comparison later
        raw_value_added = total_value_added
        
        # Use more realistic thresholds based on typical MA plan performance
        if total_value_added >= 200:
            normalized_score = 100
        elif total_value_added >= 150:
            normalized_score = 90
        elif total_value_added >= 100:
            normalized_score = 80
        elif total_value_added >= 75:
            normalized_score = 70
        elif total_value_added >= 50:
            normalized_score = 60
        elif total_value_added >= 25:
            normalized_score = 50
        elif total_value_added >= 0:
            normalized_score = 40
        elif total_value_added >= -25:
            normalized_score = 30
        elif total_value_added >= -50:
            normalized_score = 20
        else:
            normalized_score = 10
        
        return {
            'mac_value': round(normalized_score, 1),
            'value_added_pmpm': round(total_value_added, 2),
            'components': {
                'part_c_benefit_value': round(part_c_benefit_value, 2),
                'part_d_benefit_value': round(part_d_benefit_value, 2),
                'part_b_buydown': round(part_b_buydown, 2),
                'total_member_premium': round(total_member_premium, 2),
                'rebate_amount': round(rebate_amount, 2),
                'supplemental_benefits_pmpm': round(supplemental_benefits_pmpm, 2)
            },
            'calculation_details': {
                'rebate_percentage': round(rebate_percentage * 100, 1),
                'star_rating': star_rating,
                'gross_savings': round(gross_savings, 2),
                'benchmark': round(benchmark, 2),
                'estimated_bid': round(estimated_bid, 2)
            },
            'methodology': 'Milliman MACVAT',
            'formula': 'Part C + Part D + Part B Buydown - Member Premiums'
        }
        
    except Exception as e:
        return {
            'mac_value': 0,
            'value_added_pmpm': 0,
            'error': str(e),
            'components': {
                'part_c_benefit_value': 0,
                'part_d_benefit_value': 0,
                'part_b_buydown': 0,
                'total_member_premium': 0,
                'rebate_amount': 0,
                'supplemental_benefits_pmpm': 0
            },
            'methodology': 'Milliman MACVAT',
            'formula': 'Part C + Part D + Part B Buydown - Member Premiums'
        }

# ... [REST OF THE FILE CONTENT - This is a truncated view due to length limits]
# The full file contains all the API handler methods and server logic

if __name__ == '__main__':
    main()