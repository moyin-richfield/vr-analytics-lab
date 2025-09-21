from pydantic import BaseModel
from typing import Optional

class PredictionRequest(BaseModel):
    product_id: int
    region: str
    months_ahead: int = 1
    price_change_percent: float = 0.0
    marketing_budget_change: float = 0.0

class FilterRequest(BaseModel):
    region: Optional[str] = None
    category: Optional[str] = None
    month: Optional[str] = None
