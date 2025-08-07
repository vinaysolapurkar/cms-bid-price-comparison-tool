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

def calculate_mac_value(plan, market_data=None):
    """
    Calculate Milliman MACVAT (Medicare Advantage Competitive Value Added Tool) Score
    Formula: Total value added = Part C benefit value + Part D benefit value + Part B premium buydown – total member (C + D) premium
    """
    try:
        # Debug logging - print input plan data
        contract_number = plan.get('contract_number', 'Unknown')
        organization = plan.get('organization_marketing_name', 'Unknown')
        
        print(f"\n=== MAC CALCULATION DEBUG for {organization} ({contract_number}) ===")
        print(f"Available database fields: {list(plan.keys())}")
        
        # Core MACVAT components (all in PMPM) - using actual database fields
        part_c_premium = float(plan.get('part_c_premium') or 0)
        part_d_premium = float(plan.get('part_d_premium') or 0)
        total_member_premium = part_c_premium + part_d_premium
        
        print(f"Part C Premium: ${part_c_premium:.2f}")
        print(f"Part D Premium: ${part_d_premium:.2f}")
        print(f"Total Member Premium: ${total_member_premium:.2f}")
        
        # Estimate Part B premium buydown (if plan covers it)
        part_b_buydown = plan.get('part_b_buydown', 0) or 0  # Usually 0 unless specifically offered
        print(f"Part B Buydown: {part_b_buydown}")
        
        # Calculate rebate using actual CMS methodology with available data
        # Use the same benchmark and bid values that are displayed in the plan data
        benchmark = float(plan.get('estimated_benchmark') or plan.get('benchmark_0pct') or 0)
        estimated_bid = float(plan.get('estimated_bid') or 0)
        
        # If no estimated_bid is available, calculate it as 95% of benchmark
        if not estimated_bid and benchmark > 0:
            estimated_bid = benchmark * 0.95
        
        star_rating = float(plan.get('overall_rating') or 0)
        
        print(f"Benchmark: ${benchmark:.2f}")
        print(f"Estimated Bid: ${estimated_bid:.2f}")
        print(f"Star Rating: {star_rating}")
        
        # CMS rebate percentage based on star rating
        if star_rating >= 4.5:
            rebate_percentage = 0.70
        elif star_rating >= 3.5:
            rebate_percentage = 0.65
        else:
            rebate_percentage = 0.50
            
        print(f"Rebate Percentage: {rebate_percentage * 100:.0f}%")
        
        # Calculate rebate if bid is below benchmark
        gross_savings = max(0, benchmark - estimated_bid) if benchmark and estimated_bid else 0
        rebate_amount = gross_savings * rebate_percentage
        
        print(f"Gross Savings: ${gross_savings:.2f}")
        print(f"Rebate Amount: ${rebate_amount:.2f}")
        
        # Part C benefit value = rebate + supplemental benefits (using actual database fields)
        total_supplemental_value = float(plan.get('total_supplemental_value') or 0)
        supplemental_benefits_pmpm = total_supplemental_value  # Already in PMPM format
        
        # Breakdown of supplemental benefits for debugging
        dental_vision = float(plan.get('supp_dental_vision_hearing') or 0)
        additional_medical = float(plan.get('supp_additional_medical') or 0)
        wellness = float(plan.get('supp_wellness_services') or 0)
        transportation = float(plan.get('supp_transportation') or 0)
        other_benefits = float(plan.get('supp_other_benefits') or 0)
        
        print(f"Supplemental Benefits Breakdown:")
        print(f"  - Total: ${total_supplemental_value:.2f}")
        print(f"  - Dental/Vision/Hearing: ${dental_vision:.2f}")
        print(f"  - Additional Medical: ${additional_medical:.2f}")
        print(f"  - Wellness: ${wellness:.2f}")
        print(f"  - Transportation: ${transportation:.2f}")
        print(f"  - Other: ${other_benefits:.2f}")
        
        part_c_benefit_value = rebate_amount + supplemental_benefits_pmpm
        print(f"Part C Benefit Value: ${part_c_benefit_value:.2f} (Rebate: ${rebate_amount:.2f} + Supplements: ${supplemental_benefits_pmpm:.2f})")
        
        # Part D benefit value (estimated based on coverage vs. standard)
        # Using simplified approach - allocate portion of rebate to Part D
        part_d_benefit_value = rebate_amount * 0.25  # 25% of rebate allocated to Part D
        print(f"Part D Benefit Value: ${part_d_benefit_value:.2f} (25% of rebate)")
        
        # Apply Milliman MACVAT formula
        total_value_added = (part_c_benefit_value + 
                           part_d_benefit_value + 
                           part_b_buydown - 
                           total_member_premium)
        
        print(f"MACVAT Formula:")
        print(f"  Part C Benefits: {part_c_benefit_value}")
        print(f"  + Part D Benefits: {part_d_benefit_value}")
        print(f"  + Part B Buydown: {part_b_buydown}")
        print(f"  - Member Premiums: {total_member_premium}")
        print(f"  = Total Value Added: {total_value_added}")
        
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
        
        print(f"Normalized MAC Score: {normalized_score}/100")
        print("=== END MAC CALCULATION DEBUG ===\n")
        
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
        print(f"ERROR in MAC calculation: {str(e)}")
        print(f"Plan data: {plan}")
        import traceback
        traceback.print_exc()
        
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

def calculate_competitive_score(plan, market_data):
    """Calculate comprehensive competitive score (0-100)"""
    try:
        # Get market benchmarks
        market_avg_rating = statistics.mean([p.get('overall_rating', 0) or 0 for p in market_data if p.get('overall_rating')])
        market_avg_value = statistics.mean([calculate_member_value_pmpm(p) for p in market_data])
        market_avg_enrollment = statistics.mean([p.get('ma_eligible_enrollment', 0) or 0 for p in market_data if p.get('ma_eligible_enrollment')])
        
        # Plan metrics
        plan_rating = plan.get('overall_rating', 0) or 0
        plan_value = calculate_member_value_pmpm(plan)
        plan_enrollment = plan.get('ma_eligible_enrollment', 0) or 0
        
        # Score components (0-100 scale)
        quality_score = min(100, (plan_rating / 5.0) * 100) if plan_rating else 0
        value_score = min(100, max(0, ((plan_value - market_avg_value) / abs(market_avg_value) + 1) * 50)) if market_avg_value else 50
        market_share_score = min(100, (plan_enrollment / market_avg_enrollment) * 50) if market_avg_enrollment and plan_enrollment else 0
        
        # Weighted composite score
        composite_score = (quality_score * 0.4) + (value_score * 0.4) + (market_share_score * 0.2)
        
        return {
            'composite_score': round(composite_score, 1),
            'quality_score': round(quality_score, 1),
            'value_score': round(value_score, 1),
            'market_share_score': round(market_share_score, 1)
        }
    except:
        return {
            'composite_score': 0,
            'quality_score': 0,
            'value_score': 0,
            'market_share_score': 0
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
            elif path == '/api/organizations-by-state':
                response_data = self.get_organizations_by_state(params)
            elif path == '/api/states':
                response_data = self.get_states()
            elif path == '/api/counties':
                response_data = self.get_counties(params)
            elif path == '/api/organization-states':
                response_data = self.get_organization_states(params)
            elif path == '/api/competition-analysis':
                response_data = self.get_competition_analysis(params)
            elif path == '/api/enterprise-bid-analysis':
                response_data = self.get_enterprise_bid_analysis(params)
            elif path == '/api/member-simulation':
                response_data = self.get_member_simulation(params)
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
    
    def do_POST(self):
        """Handle POST requests"""
        try:
            # Parse the URL
            parsed_url = urllib.parse.urlparse(self.path)
            path = parsed_url.path
            
            # Get the content length and read the body
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            # Parse JSON body
            try:
                post_params = json.loads(post_data.decode('utf-8'))
            except json.JSONDecodeError:
                self.send_error(400, "Invalid JSON")
                return
            
            # Set CORS headers
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.end_headers()
            
            # Route POST requests
            if path == '/api/ai-competition-insights':
                response_data = self.get_ai_competition_insights_post(post_params)
            elif path == '/api/contextual-chat':
                response_data = self.get_contextual_chat_response(post_params)
            else:
                self.send_error(404, "Not Found")
                return
            
            # Send JSON response
            self.wfile.write(json.dumps(response_data).encode())
            
        except Exception as e:
            print(f"Error handling POST request: {e}")
            self.send_error(500, f"Internal Server Error: {str(e)}")
    
    def get_db_connection(self):
        """Get database connection"""
        conn = sqlite3.connect(DATABASE_PATH)
        conn.row_factory = sqlite3.Row
        return conn
    
    def get_plans(self, params):
        """Get Medicare plans with filtering and MAC calculation"""
        organization = params.get('organization', '')
        state = params.get('state', '')
        county = params.get('county', '')
        page = int(params.get('page', '1'))
        limit = int(params.get('limit', '50'))
        offset = (page - 1) * limit
        
        conn = self.get_db_connection()
        cursor = conn.cursor()
        
        query = """
            SELECT contract_number, contract_name, organization_marketing_name, county, state, fips,
                   overall_rating, part_c_rating, part_d_rating,
                   part_c_premium, part_d_premium, total_supplemental_value,
                   supp_dental_vision_hearing, supp_wellness_services, 
                   supp_transportation, supp_additional_medical,
                   plan_type, parent_organization, ma_eligible_enrollment, benchmark_0pct
            FROM medicare_plans 
            WHERE 1=1
        """
        
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
                'contract_name': row['contract_name'],
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
                'margin_percentage': (rebate / benchmark * 100) if benchmark else 0,
                'member_value_pmpm': calculate_member_value_pmpm({
                    'rebate': rebate,
                    'total_supplemental_value': supplemental_value,
                    'part_c_premium': part_c_premium,
                    'part_d_premium': part_d_premium
                })
            }
            
            plans.append(plan_dict)
        
        # Calculate MAC values for each plan
        for plan in plans:
            mac_result = calculate_mac_value(plan, plans)
            plan['mac_value_scores'] = mac_result
        
        conn.close()
        return {
            'status': 'success',
            'count': len(plans),
            'plans': plans
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