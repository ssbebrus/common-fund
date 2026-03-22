from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

# Participant Schemas
class ParticipantBase(BaseModel):
    name: str = Field(..., max_length=100)

class ParticipantCreate(ParticipantBase):
    pass

class Participant(ParticipantBase):
    id: int
    created_at: datetime
    contribution: float = 0.0

    model_config = {"from_attributes": True}

# Transaction Schemas
class TransactionBase(BaseModel):
    amount: float
    description: Optional[str] = Field(None, max_length=255)

class TransactionCreate(TransactionBase):
    participant_name: Optional[str] = None # For deposits

class Transaction(TransactionBase):
    id: int
    category: str
    timestamp: datetime
    is_voided: bool
    participant_id: Optional[int] = None

    model_config = {"from_attributes": True}

# Summary Schemas
class FundSummary(BaseModel):
    total_balance: float
    total_deposits: float
    total_expenses: float
    participant_contributions: List[Participant]
