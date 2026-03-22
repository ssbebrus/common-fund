from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from . import models, schemas

async def get_participant_by_name(db: AsyncSession, name: str):
    result = await db.execute(select(models.Participant).where(models.Participant.name == name))
    return result.scalars().first()

async def create_participant(db: AsyncSession, participant: schemas.ParticipantCreate):
    db_participant = models.Participant(name=participant.name)
    db.add(db_participant)
    await db.commit()
    await db.refresh(db_participant)
    return db_participant

async def get_participants(db: AsyncSession):
    result = await db.execute(select(models.Participant))
    return result.scalars().all()

async def create_transaction(db: AsyncSession, transaction: models.Transaction):
    db.add(transaction)
    await db.commit()
    await db.refresh(transaction)
    return transaction

async def get_transactions(db: AsyncSession, skip: int = 0, limit: int = 100):
    result = await db.execute(
        select(models.Transaction)
        .order_by(models.Transaction.timestamp.desc())
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()

async def get_transaction(db: AsyncSession, transaction_id: int):
    result = await db.execute(select(models.Transaction).where(models.Transaction.id == transaction_id))
    return result.scalars().first()

async def get_total_balance(db: AsyncSession):
    # Sum of all non-voided transactions
    result = await db.execute(
        select(func.sum(models.Transaction.amount))
        .where(models.Transaction.is_voided == False)
    )
    return result.scalar() or 0.0

async def get_participant_balance(db: AsyncSession, participant_id: int):
    result = await db.execute(
        select(func.sum(models.Transaction.amount))
        .where(models.Transaction.participant_id == participant_id)
        .where(models.Transaction.is_voided == False)
    )
    return result.scalar() or 0.0
