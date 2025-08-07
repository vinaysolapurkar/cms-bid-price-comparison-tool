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

class APIHandler(http.server.BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def do_GET(self):
        """Handle GET requests"""
        try:
            # Parse the URL
            parsed_url = urllib.parse.urlparse(self.path)
            path = parsed_url.path
            query_params = urllib.parse.parse_qs(parsed_url.query)
            
            # Convert query params to single values, except for arrays
            params = {}
            for key, value_list in query_params.items():
                if key == 'organizations':
                    # Keep as array for multiple organizations
                    params[key] = value_list
                else:
                    params[key] = value_list[0] if value_list else ''
            
            # Route requests
            if path == '/api/plans':
                response_data = self.get_plans(params)
            elif path == '/api/organizations':
                response_data = self.get_organizations()
            elif path == '/api/states':
                response_data = self.get_states()
            elif path == '/api/counties':
                response_data = self.get_counties(params)
            elif path == '/api/mac-value-analysis':
                response_data = self.get_mac_value_analysis(params)
            else:
                self.send_error(404, "Not Found")
                return
            
            # Send response
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response_json = json.dumps(response_data, indent=2)
            self.wfile.write(response_json.encode('utf-8'))
            
        except Exception as e:
            print(f"Error processing request: {str(e)}")
            self.send_error(500, f"Internal Server Error: {str(e)}")
    
    def get_db_connection(self):
        """Get database connection"""
        conn = sqlite3.connect(DATABASE_PATH)
        conn.row_factory = sqlite3.Row
        return conn
    
    def get_plans(self, params):
        """Get Medicare plans with filtering and MAC value calculations"""
        organization = params.get('organization', '')
        state = params.get('state', '')
        county = params.get('county', '')
        page = int(params.get('page', '1'))
        limit = int(params.get('limit', '50'))
        offset = (page - 1) * limit
        
        conn = self.get_db_connection()
        cursor = conn.cursor()
        
        query = \"\"\"
            SELECT contract_number, organization_marketing_name, county, state, fips,
                   overall_rating, part_c_rating, part_d_rating,
                   part_c_premium, part_d_premium, total_supplemental_value,
                   supp_dental_vision_hearing, supp_wellness_services, 
                   supp_transportation, supp_additional_medical,
                   plan_type, parent_organization, ma_eligible_enrollment, benchmark_0pct
            FROM medicare_plans 
            WHERE 1=1
        \"\"\"
        
        query_params = []
        
        if organization:
            query += ' AND organization_marketing_name LIKE ?'
            query_params.append(f'%{organization}%')
        
        if state:
            query += ' AND state = ?'
            query_params.append(state.upper())
        
        if county:
            query += ' AND county LIKE ?'
            query_params.append(f'%{county}%')
        
        query += ' ORDER BY organization_marketing_name, county LIMIT ? OFFSET ?'
        query_params.extend([limit, offset])
        
        cursor.execute(query, query_params)
        rows = cursor.fetchall()
        
        plans = []
        for row in rows:
            # Calculate financial metrics
            benchmark = row['benchmark_0pct'] or 0
            part_c_premium = row['part_c_premium'] or 0
            part_d_premium = row['part_d_premium'] or 0
            total_premium = part_c_premium + part_d_premium
            supplemental_value = row['total_supplemental_value'] or 0
            
            estimated_bid = calculate_estimated_bid(benchmark, part_c_premium, supplemental_value)
            rebate = max(0, benchmark - estimated_bid) if benchmark and estimated_bid else 0
            
            plan_dict = {
                'contract_number': row['contract_number'],
                'organization': row['organization_marketing_name'],
                'county': row['county'],
                'state': row['state'],
                'fips': row['fips'],
                'overall_rating': row['overall_rating'],
                'part_c_rating': row['part_c_rating'],
                'part_d_rating': row['part_d_rating'],
                'part_c_premium': part_c_premium,
                'part_d_premium': part_d_premium,
                'total_premium': total_premium,
                'total_supplemental_value': supplemental_value,
                'supp_dental_vision_hearing': row['supp_dental_vision_hearing'],
                'supp_wellness_services': row['supp_wellness_services'],
                'supp_transportation': row['supp_transportation'],
                'supp_additional_medical': row['supp_additional_medical'],
                'plan_type': row['plan_type'],
                'parent_organization': row['parent_organization'],
                'ma_eligible_enrollment': row['ma_eligible_enrollment'],
                'estimated_benchmark': benchmark,
                'estimated_bid': estimated_bid or 0,
                'rebate': rebate,
                'margin_percentage': (rebate / benchmark * 100) if benchmark else 0
            }
            
            plans.append(plan_dict)
        
        # Calculate MAC values after we have all plans for market-relative scoring
        if plans:
            raw_mac_data = []
            for plan in plans:
                mac_result = calculate_mac_value(plan, plans)
                raw_mac_data.append({
                    'plan': plan,
                    'raw_value_added': mac_result['value_added_pmpm'],
                    'mac_result': mac_result
                })
            
            # Calculate market statistics for proper normalization
            value_added_amounts = [data['raw_value_added'] for data in raw_mac_data if data['raw_value_added'] is not None]
            
            if value_added_amounts and len(value_added_amounts) > 1:
                max_value = max(value_added_amounts)
                min_value = min(value_added_amounts)
                value_range = max_value - min_value
                
                # Market-relative scoring function
                def calculate_market_relative_score(value_added):
                    if value_range > 0:
                        relative_position = (value_added - min_value) / value_range
                        if relative_position >= 0.9:
                            return 100
                        elif relative_position >= 0.75:
                            return 90
                        elif relative_position >= 0.6:
                            return 80
                        elif relative_position >= 0.4:
                            return 70
                        elif relative_position >= 0.25:
                            return 60
                        elif relative_position >= 0.1:
                            return 50
                        else:
                            return 40
                    else:
                        return 60
            else:
                def calculate_market_relative_score(value_added):
                    return 60
            
            # Apply market-relative scoring to each plan
            for i, data in enumerate(raw_mac_data):
                mac_result = data['mac_result']
                market_relative_score = calculate_market_relative_score(data['raw_value_added'])
                mac_result['mac_value'] = round(market_relative_score, 1)
                
                # Add MAC scores to the plan
                plans[i]['mac_value_scores'] = mac_result
        
        conn.close()
        return {
            'status': 'success',
            'count': len(plans),
            'plans': plans
        }
    
    def get_organizations(self):
        """Get list of organizations"""
        conn = self.get_db_connection()
        cursor = conn.cursor()
        
        query = \"\"\"
            SELECT DISTINCT organization_marketing_name
            FROM medicare_plans 
            WHERE organization_marketing_name IS NOT NULL
            ORDER BY organization_marketing_name
        \"\"\"
        
        cursor.execute(query)
        rows = cursor.fetchall()
        
        organizations = [row[0] for row in rows]
        
        conn.close()
        return {
            'status': 'success',
            'organizations': organizations
        }
    
    def get_states(self):
        """Get list of states"""
        conn = self.get_db_connection()
        cursor = conn.cursor()
        
        query = \"\"\"
            SELECT DISTINCT state,
                   COUNT(*) as plan_count
            FROM medicare_plans 
            GROUP BY state
            ORDER BY state
        \"\"\"
        
        cursor.execute(query)
        rows = cursor.fetchall()
        
        states = [dict(row) for row in rows]
        
        conn.close()
        return {
            'status': 'success',
            'states': states
        }
    
    def get_counties(self, params):
        """Get list of counties"""
        state = params.get('state')
        
        conn = self.get_db_connection()
        cursor = conn.cursor()
        
        query = \"\"\"
            SELECT DISTINCT county,
                   COUNT(*) as plan_count
            FROM medicare_plans 
        \"\"\"
        
        query_params = []
        if state:
            query += ' WHERE state = ?'
            query_params.append(state.upper())
        
        query += ' GROUP BY county ORDER BY county'
        
        cursor.execute(query, query_params)
        rows = cursor.fetchall()
        
        counties = [dict(row) for row in rows]
        
        conn.close()
        return {
            'status': 'success',
            'counties': counties
        }

    def get_mac_value_analysis(self, params):
        """Get MAC Value analysis for plans in a market"""
        state = params.get('state')
        county = params.get('county')
        organizations = params.get('organizations', [])
        
        if not state:
            return {'error': 'State parameter is required'}
        
        conn = self.get_db_connection()
        cursor = conn.cursor()
        
        # Build query for MAC Value analysis
        base_query = \"\"\"
        SELECT 
            organization_marketing_name as organization,
            contract_name as plan_name,
            contract_number,
            county, 
            state,
            plan_type,
            overall_rating,
            part_c_rating,
            part_d_rating,
            benchmark_5pct as estimated_benchmark,
            part_c_premium,
            part_d_premium,
            total_supplemental_value,
            ma_eligible_enrollment
        FROM medicare_plans 
        WHERE state = ?
        \"\"\"
        
        query_params = [state]
        
        if county:
            base_query += " AND county = ?"
            query_params.append(county)
        
        if organizations:
            placeholders = ','.join(['?' for _ in organizations])
            base_query += f" AND organization_marketing_name IN ({placeholders})"
            query_params.extend(organizations)
        
        base_query += " ORDER BY organization_marketing_name"
        
        cursor.execute(base_query, query_params)
        rows = cursor.fetchall()
        
        plans = []
        for row in rows:
            plan_dict = dict(row)
            
            # Calculate financial metrics
            benchmark = plan_dict['estimated_benchmark'] or 0
            premium_c = plan_dict.get('part_c_premium', 0) or 0
            premium_d = plan_dict.get('part_d_premium', 0) or 0
            supplements = plan_dict.get('total_supplemental_value', 0) or 0
            
            total_premium = premium_c + premium_d
            
            plan_dict['estimated_bid'] = calculate_estimated_bid(
                benchmark, 
                total_premium,
                supplements
            )
            
            estimated_bid = plan_dict['estimated_bid']
            plan_dict['rebate'] = max(0, benchmark - estimated_bid) if benchmark and estimated_bid else 0
            plan_dict['margin_percentage'] = (plan_dict['rebate'] / benchmark * 100) if benchmark else 0
            
            plans.append(plan_dict)
        
        # First pass: Calculate raw MAC Values for all plans
        raw_mac_data = []
        for plan in plans:
            mac_scores = calculate_mac_value(plan, plans)
            raw_mac_data.append({
                'plan': plan,
                'raw_value_added': mac_scores['value_added_pmpm'],
                'mac_scores': mac_scores
            })
        
        # Calculate market statistics for proper normalization
        value_added_amounts = [data['raw_value_added'] for data in raw_mac_data if data['raw_value_added'] is not None]
        
        if value_added_amounts and len(value_added_amounts) > 1:
            max_value = max(value_added_amounts)
            min_value = min(value_added_amounts)
            avg_value = sum(value_added_amounts) / len(value_added_amounts)
            value_range = max_value - min_value
            
            # Market-relative scoring
            def calculate_market_relative_score(value_added):
                if value_range > 0:
                    # Normalize to 0-100 based on market position
                    relative_position = (value_added - min_value) / value_range
                    # Apply curve to spread scores better
                    if relative_position >= 0.9:
                        return 100
                    elif relative_position >= 0.75:
                        return 90
                    elif relative_position >= 0.6:
                        return 80
                    elif relative_position >= 0.4:
                        return 70
                    elif relative_position >= 0.25:
                        return 60
                    elif relative_position >= 0.1:
                        return 50
                    else:
                        return 40
                else:
                    return 60  # All same, give middle score
        else:
            # Single plan or no valid data
            def calculate_market_relative_score(value_added):
                return 60
        
        # Second pass: Apply market-relative scoring
        mac_analysis = []
        for data in raw_mac_data:
            plan = data['plan']
            mac_scores = data['mac_scores']
            market_relative_score = calculate_market_relative_score(data['raw_value_added'])
            
            # Update the MAC value with market-relative score
            mac_scores['mac_value'] = round(market_relative_score, 1)
            
            mac_analysis.append({
                'organization': plan['organization'],
                'plan_name': plan['plan_name'],
                'contract_number': plan['contract_number'],
                'county': plan['county'],
                'state': plan['state'],
                'overall_rating': plan.get('overall_rating', 0),
                'mac_value': mac_scores['mac_value'],
                'value_added_pmpm': mac_scores['value_added_pmpm'],
                'components': mac_scores['components'],
                'calculation_details': mac_scores.get('calculation_details', {}),
                'financial_summary': {
                    'estimated_bid': plan.get('estimated_bid', 0),
                    'estimated_benchmark': plan.get('estimated_benchmark', 0),
                    'rebate': plan.get('rebate', 0),
                    'member_premium': (plan.get('part_c_premium', 0) or 0) + (plan.get('part_d_premium', 0) or 0),
                    'supplemental_value': plan.get('total_supplemental_value', 0),
                    'margin_percentage': plan.get('margin_percentage', 0)
                }
            })
        
        # Sort by MAC Value (highest first)
        mac_analysis.sort(key=lambda x: x['mac_value'], reverse=True)
        
        # Calculate market statistics
        if mac_analysis:
            mac_values = [plan['mac_value'] for plan in mac_analysis]
            market_stats = {
                'total_plans': len(mac_analysis),
                'average_mac_value': sum(mac_values) / len(mac_values),
                'highest_mac_value': max(mac_values),
                'lowest_mac_value': min(mac_values),
                'market_leader': mac_analysis[0]['organization'] if mac_analysis else None
            }
        else:
            market_stats = {
                'total_plans': 0,
                'average_mac_value': 0,
                'highest_mac_value': 0,
                'lowest_mac_value': 0,
                'market_leader': None
            }
        
        conn.close()
        return {
            'status': 'success',
            'market_stats': market_stats,
            'plans': mac_analysis,
            'methodology': {
                'description': 'Milliman MAC (Member Advantage Composite) Value Score',
                'components': {
                    'part_c_benefit_value': 'Rebate amount + supplemental benefits PMPM',
                    'part_d_benefit_value': 'Estimated 25% of rebate allocated to Part D',
                    'part_b_buydown': 'Part B premium buydown (if offered)',
                    'total_member_premium': 'Part C + Part D member premium'
                },
                'formula': 'Part C + Part D + Part B Buydown - Member Premiums',
                'scale': '0-100 where 100 is optimal member value relative to market'
            }
        }

def main():
    # Check if database exists
    if not os.path.exists(DATABASE_PATH):
        print(f"Error: Database file {DATABASE_PATH} not found!")
        print("Please ensure the Medicare database is available.")
        return
    
    PORT = 5000
    
    print("Starting CMS Bid Price Comparison API Server...")
    print(f"Database: {DATABASE_PATH}")
    print(f"Server running on http://localhost:{PORT}")
    print("Press Ctrl+C to stop the server")
    
    try:
        with socketserver.TCPServer(("", PORT), APIHandler) as httpd:
            print(f"Server started successfully at {datetime.now()}")
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped by user")
    except Exception as e:
        print(f"Server error: {str(e)}")

if __name__ == '__main__':
    main()