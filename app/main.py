from fastapi import FastAPI, Depends, HTTPException, Header, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from . import crud, models, schemas, database, config

app = FastAPI(title=config.settings.PROJECT_NAME)

@app.on_event("startup")
async def startup():
    async with database.engine.begin() as conn:
        await conn.run_sync(models.Base.metadata.create_all)

# Dependency to check admin token
async def verify_admin(x_admin_token: str = Header(...)):
    if x_admin_token != config.settings.ADMIN_SECRET_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate admin credentials",
        )

@app.get("/funds/balance", response_model=schemas.FundSummary)
async def get_funds_summary(db: AsyncSession = Depends(database.get_db)):
    total_balance = await crud.get_total_balance(db)
    
    # Calculate totals
    deposits_res = await db.execute(
        select(func.sum(models.Transaction.amount))
        .where(models.Transaction.category == "DEPOSIT")
        .where(models.Transaction.is_voided == False)
    )
    total_deposits = deposits_res.scalar() or 0.0
    
    expenses_res = await db.execute(
        select(func.sum(models.Transaction.amount))
        .where(models.Transaction.category == "EXPENSE")
        .where(models.Transaction.is_voided == False)
    )
    total_expenses = abs(expenses_res.scalar() or 0.0)
    
    participants = await crud.get_participants(db)
    participant_list = []
    for p in participants:
        balance = await crud.get_participant_balance(db, p.id)
        p_schema = schemas.Participant.model_validate(p)
        p_schema.contribution = balance
        participant_list.append(p_schema)
        
    return {
        "total_balance": total_balance,
        "total_deposits": total_deposits,
        "total_expenses": total_expenses,
        "participant_contributions": participant_list
    }

@app.get("/funds/history", response_model=List[schemas.Transaction])
async def get_history(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(database.get_db)):
    return await crud.get_transactions(db, skip=skip, limit=limit)

@app.get("/participants", response_model=List[schemas.Participant])
async def list_participants(db: AsyncSession = Depends(database.get_db)):
    participants = await crud.get_participants(db)
    res = []
    for p in participants:
        balance = await crud.get_participant_balance(db, p.id)
        p_schema = schemas.Participant.model_validate(p)
        p_schema.contribution = balance
        res.append(p_schema)
    return res

# Admin Endpoints
@app.post("/admin/deposit", response_model=schemas.Transaction, dependencies=[Depends(verify_admin)])
async def create_deposit(transaction: schemas.TransactionCreate, db: AsyncSession = Depends(database.get_db)):
    if not transaction.participant_name:
        raise HTTPException(status_code=400, detail="Participant name is required for deposits")
    
    participant = await crud.get_participant_by_name(db, transaction.participant_name)
    if not participant:
        participant = await crud.create_participant(db, schemas.ParticipantCreate(name=transaction.participant_name))
    
    db_transaction = models.Transaction(
        amount=abs(transaction.amount),
        category="DEPOSIT",
        description=transaction.description,
        participant_id=participant.id
    )
    return await crud.create_transaction(db, db_transaction)

@app.post("/admin/expense", response_model=schemas.Transaction, dependencies=[Depends(verify_admin)])
async def create_expense(transaction: schemas.TransactionCreate, db: AsyncSession = Depends(database.get_db)):
    db_transaction = models.Transaction(
        amount=-abs(transaction.amount),
        category="EXPENSE",
        description=transaction.description
    )
    return await crud.create_transaction(db, db_transaction)

@app.get("/admin/verify", dependencies=[Depends(verify_admin)])
async def verify_admin_token():
    return {"status": "ok"}

@app.patch("/admin/transactions/{transaction_id}/rollback", response_model=schemas.Transaction, dependencies=[Depends(verify_admin)])
async def rollback_transaction(transaction_id: int, db: AsyncSession = Depends(database.get_db)):
    db_transaction = await crud.get_transaction(db, transaction_id)
    if not db_transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    if db_transaction.is_voided:
        raise HTTPException(status_code=400, detail="Transaction already voided")
    
    db_transaction.is_voided = True
    await db.commit()
    await db.refresh(db_transaction)
    return db_transaction
