from fastapi import APIRouter, HTTPException
from models import PredictionRequest, FilterRequest
import json
import random
import time
from datetime import datetime

router = APIRouter()

# Load sales data
with open("sales_data.json", "r") as f:
    sales_data = json.load(f)

# Real-time data simulation
def generate_live_data():
    """Generate live data updates for real-time dashboard"""
    current_time = datetime.now()
    
    # Simulate live sales data with small random variations
    live_data = {
        "timestamp": current_time.isoformat(),
        "live_metrics": {
            "total_revenue": 0,
            "total_sales": 0,
            "active_users": random.randint(45, 65),
            "conversion_rate": round(random.uniform(12.5, 18.3), 2),
            "avg_order_value": 0
        },
        "live_sales": [],
        "trending_products": [],
        "regional_performance": {}
    }
    
    # Calculate live metrics
    for product in sales_data["products"]:
        for sale in product["sales_data"]:
            # Add small random variations to simulate live data
            variation = random.uniform(0.95, 1.05)
            live_sales = int(sale["sales"] * variation)
            live_revenue = sale["revenue"] * variation
            
            live_data["live_metrics"]["total_revenue"] += live_revenue
            live_data["live_metrics"]["total_sales"] += live_sales
            
            # Add to live sales
            live_data["live_sales"].append({
                "product_name": product["name"],
                "region": sale["region"],
                "sales": live_sales,
                "revenue": live_revenue,
                "timestamp": current_time.isoformat()
            })
    
    # Calculate average order value
    if live_data["live_metrics"]["total_sales"] > 0:
        live_data["live_metrics"]["avg_order_value"] = round(
            live_data["live_metrics"]["total_revenue"] / live_data["live_metrics"]["total_sales"], 2
        )
    
    # Generate trending products
    products_by_sales = {}
    for sale in live_data["live_sales"]:
        if sale["product_name"] not in products_by_sales:
            products_by_sales[sale["product_name"]] = 0
        products_by_sales[sale["product_name"]] += sale["sales"]
    
    live_data["trending_products"] = sorted(
        products_by_sales.items(), 
        key=lambda x: x[1], 
        reverse=True
    )[:3]
    
    # Regional performance
    regions = {}
    for sale in live_data["live_sales"]:
        if sale["region"] not in regions:
            regions[sale["region"]] = {"revenue": 0, "sales": 0}
        regions[sale["region"]]["revenue"] += sale["revenue"]
        regions[sale["region"]]["sales"] += sale["sales"]
    
    live_data["regional_performance"] = regions
    
    return live_data

# Load case studies
with open("case_studies.json", "r") as f:
    case_studies = json.load(f)

@router.get("/")
def root():
    return {"message": "VR Sales Analytics Lab API", "version": "1.0"}

@router.get("/data")
def get_data():
    """Legacy endpoint for backward compatibility"""
    return sales_data

@router.get("/sales/products")
def get_products():
    """Get all products with their sales data"""
    return sales_data["products"]

@router.get("/sales/regions")
def get_regions():
    """Get all available regions"""
    return sales_data["regions"]

@router.get("/sales/categories")
def get_categories():
    """Get all product categories"""
    return sales_data["categories"]

@router.get("/sales/months")
def get_months():
    """Get all available months"""
    return sales_data["months"]

@router.post("/sales/filter")
def filter_sales_data(filters: FilterRequest):
    """Filter sales data based on region, category, or month"""
    filtered_products = []
    
    for product in sales_data["products"]:
        if filters.category and product["category"] != filters.category:
            continue
            
        filtered_sales = []
        for sale in product["sales_data"]:
            if filters.region and sale["region"] != filters.region:
                continue
            if filters.month and sale["month"] != filters.month:
                continue
            filtered_sales.append(sale)
        
        if filtered_sales:
            product_copy = product.copy()
            product_copy["sales_data"] = filtered_sales
            filtered_products.append(product_copy)
    
    return {"products": filtered_products}

@router.post("/sales/predict")
def predict_sales(request: PredictionRequest):
    """Simple AI prediction model for sales forecasting"""
    # Find the product
    product = None
    for p in sales_data["products"]:
        if p["id"] == request.product_id:
            product = p
            break
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Get historical data for the specific region
    region_data = [sale for sale in product["sales_data"] if sale["region"] == request.region]
    
    print(f"Debug: Looking for region '{request.region}' in product {product['name']}")
    print(f"Debug: Found {len(region_data)} data points")
    print(f"Debug: Available regions: {set(sale['region'] for sale in product['sales_data'])}")
    
    if len(region_data) < 3:
        raise HTTPException(status_code=400, detail=f"Insufficient historical data for prediction. Found {len(region_data)} data points for region '{request.region}'. Available regions: {list(set(sale['region'] for sale in product['sales_data']))}")
    
    # Simple linear regression for trend
    sales_values = [sale["sales"] for sale in region_data]
    months = list(range(len(sales_values)))
    
    # Calculate trend
    n = len(sales_values)
    sum_x = sum(months)
    sum_y = sum(sales_values)
    sum_xy = sum(x * y for x, y in zip(months, sales_values))
    sum_x2 = sum(x * x for x in months)
    
    slope = (n * sum_xy - sum_x * sum_y) / (n * sum_x2 - sum_x * sum_x)
    intercept = (sum_y - slope * sum_x) / n
    
    # Predict future sales
    future_month = len(months) + request.months_ahead - 1
    base_prediction = slope * future_month + intercept
    
    # Apply price change effect (simple elasticity model)
    price_effect = 1 + (request.price_change_percent / 100) * -0.5  # -0.5 price elasticity
    
    # Apply marketing budget effect
    marketing_effect = 1 + (request.marketing_budget_change / 100) * 0.3  # 0.3 marketing elasticity
    
    predicted_sales = max(0, base_prediction * price_effect * marketing_effect)
    predicted_revenue = predicted_sales * product["base_price"] * (1 + request.price_change_percent / 100)
    
    return {
        "product_name": product["name"],
        "region": request.region,
        "months_ahead": request.months_ahead,
        "predicted_sales": round(predicted_sales, 1),
        "predicted_revenue": round(predicted_revenue, 2),
        "confidence": "High" if len(region_data) >= 6 else "Medium",
        "factors": {
            "price_change_percent": request.price_change_percent,
            "marketing_budget_change": request.marketing_budget_change,
            "trend": "Increasing" if slope > 0 else "Decreasing"
        }
    }

@router.get("/sales/summary")
def get_sales_summary():
    """Get overall sales summary statistics"""
    total_revenue = 0
    total_sales = 0
    region_totals = {}
    category_totals = {}
    
    for product in sales_data["products"]:
        category = product["category"]
        if category not in category_totals:
            category_totals[category] = {"revenue": 0, "sales": 0}
        
        for sale in product["sales_data"]:
            region = sale["region"]
            if region not in region_totals:
                region_totals[region] = {"revenue": 0, "sales": 0}
            
            total_revenue += sale["revenue"]
            total_sales += sale["sales"]
            region_totals[region]["revenue"] += sale["revenue"]
            region_totals[region]["sales"] += sale["sales"]
            category_totals[category]["revenue"] += sale["revenue"]
            category_totals[category]["sales"] += sale["sales"]
    
    return {
        "total_revenue": total_revenue,
        "total_sales": total_sales,
        "region_breakdown": region_totals,
        "category_breakdown": category_totals,
        "average_order_value": round(total_revenue / total_sales, 2) if total_sales > 0 else 0
    }

# Real-time Dashboard Endpoints
@router.get("/dashboard/live")
def get_live_dashboard():
    """Get real-time dashboard data"""
    return generate_live_data()

@router.get("/dashboard/metrics")
def get_live_metrics():
    """Get live business metrics"""
    live_data = generate_live_data()
    return live_data["live_metrics"]

@router.get("/dashboard/trending")
def get_trending_products():
    """Get trending products in real-time"""
    live_data = generate_live_data()
    return {
        "trending_products": live_data["trending_products"],
        "timestamp": live_data["timestamp"]
    }

@router.get("/dashboard/regional")
def get_regional_performance():
    """Get real-time regional performance"""
    live_data = generate_live_data()
    return {
        "regional_performance": live_data["regional_performance"],
        "timestamp": live_data["timestamp"]
    }

# Case Studies Endpoints
@router.get("/case-studies")
def get_case_studies():
    """Get all available case studies"""
    return case_studies["case_studies"]

@router.get("/case-studies/{case_id}")
def get_case_study(case_id: int):
    """Get a specific case study by ID"""
    for case in case_studies["case_studies"]:
        if case["id"] == case_id:
            return case
    raise HTTPException(status_code=404, detail="Case study not found")

@router.post("/case-studies/{case_id}/submit-answers")
def submit_case_study_answers(case_id: int, answers: dict):
    """Submit answers for a case study and get results"""
    case = None
    for c in case_studies["case_studies"]:
        if c["id"] == case_id:
            case = c
            break
    
    if not case:
        raise HTTPException(status_code=404, detail="Case study not found")
    
    # Calculate score
    total_questions = len(case["questions"])
    correct_answers = 0
    results = []
    
    for question in case["questions"]:
        user_answer = answers.get(str(question["id"]))
        is_correct = user_answer == question["correct"]
        if is_correct:
            correct_answers += 1
        
        results.append({
            "question_id": question["id"],
            "question": question["question"],
            "user_answer": user_answer,
            "correct_answer": question["correct"],
            "is_correct": is_correct,
            "explanation": question["explanation"]
        })
    
    score = (correct_answers / total_questions) * 100
    
    return {
        "case_id": case_id,
        "score": round(score, 1),
        "correct_answers": correct_answers,
        "total_questions": total_questions,
        "results": results,
        "recommendations": case["recommendations"]
    }

@router.get("/case-studies/{case_id}/data")
def get_case_study_data(case_id: int):
    """Get the data for a specific case study"""
    case = None
    for c in case_studies["case_studies"]:
        if c["id"] == case_id:
            case = c
            break
    
    if not case:
        raise HTTPException(status_code=404, detail="Case study not found")
    
    return case["data"]
