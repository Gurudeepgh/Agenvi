from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import models, schemas, auth, database

router = APIRouter(prefix="/agents", tags=["Agents"])

@router.post("/", response_model=schemas.Agent)
def create_agent(agent: schemas.AgentCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_agent = models.Agent(**agent.dict(), owner_id=current_user.id)
    db.add(db_agent)
    db.commit()
    db.refresh(db_agent)
    return db_agent

@router.get("/", response_model=List[schemas.Agent])
def read_agents(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    agents = db.query(models.Agent).filter(models.Agent.owner_id == current_user.id).offset(skip).limit(limit).all()
    return agents

@router.get("/{agent_id}", response_model=schemas.Agent)
def read_agent(agent_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    agent = db.query(models.Agent).filter(models.Agent.id == agent_id, models.Agent.owner_id == current_user.id).first()
    if agent is None:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent

@router.put("/{agent_id}", response_model=schemas.Agent)
def update_agent(agent_id: int, agent_update: schemas.AgentCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_agent = db.query(models.Agent).filter(models.Agent.id == agent_id, models.Agent.owner_id == current_user.id).first()
    if not db_agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    for key, value in agent_update.dict().items():
        setattr(db_agent, key, value)
    
    db.commit()
    db.refresh(db_agent)
    return db_agent

@router.delete("/{agent_id}")
def delete_agent(agent_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    agent = db.query(models.Agent).filter(models.Agent.id == agent_id, models.Agent.owner_id == current_user.id).first()
    if agent is None:
        raise HTTPException(status_code=404, detail="Agent not found")
    db.delete(agent)
    db.commit()
    return {"ok": True}
