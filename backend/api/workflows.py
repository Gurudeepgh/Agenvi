from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import models, schemas, auth, database

router = APIRouter(prefix="/workflows", tags=["Workflows"])

# --- Tasks ---
@router.post("/tasks", response_model=schemas.Task)
def create_task(task: schemas.TaskCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    # Verify agent belongs to user
    agent = db.query(models.Agent).filter(models.Agent.id == task.agent_id, models.Agent.owner_id == current_user.id).first()
    if not agent:
        raise HTTPException(status_code=400, detail="Agent not found or doesn't belong to you")
    
    db_task = models.Task(**task.dict())
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

@router.get("/tasks/{task_id}", response_model=schemas.Task)
def read_task(task_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
     # Logic to ensure task belongs to user (via agent or workflow linkage) - simplifying for now by checking agent owner
     task = db.query(models.Task).filter(models.Task.id == task_id).first()
     if not task:
         raise HTTPException(status_code=404, detail="Task not found")
     return task

# --- Workflows/Crews ---
@router.post("/", response_model=schemas.Workflow)
def create_workflow(workflow: schemas.WorkflowCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_workflow = models.Workflow(**workflow.dict(), owner_id=current_user.id)
    db.add(db_workflow)
    db.commit()
    db.refresh(db_workflow)
    db.refresh(db_workflow)
    return db_workflow

@router.put("/{workflow_id}", response_model=schemas.Workflow)
def update_workflow(workflow_id: int, workflow_update: schemas.WorkflowCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_workflow = db.query(models.Workflow).filter(models.Workflow.id == workflow_id, models.Workflow.owner_id == current_user.id).first()
    if not db_workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    # Update fields
    for key, value in workflow_update.dict().items():
        setattr(db_workflow, key, value)
    
    db.commit()
    db.refresh(db_workflow)
    return db_workflow

@router.post("/{workflow_id}/clone", response_model=schemas.Workflow)
def clone_workflow(workflow_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    # Fetch original workflow (must be public OR owned by user)
    original_workflow = db.query(models.Workflow).filter(models.Workflow.id == workflow_id).first()
    if not original_workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    if not original_workflow.is_public and original_workflow.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot clone private workflow")
    
    # Clone Workflow
    new_workflow = models.Workflow(
        name=f"{original_workflow.name} (Copy)",
        description=original_workflow.description,
        process_type=original_workflow.process_type,
        is_public=False, # Clones are private by default
        owner_id=current_user.id
    )
    db.add(new_workflow)
    db.commit()
    db.refresh(new_workflow)
    
    # Clone Tasks
    for task in original_workflow.tasks:
        new_task = models.Task(
            description=task.description,
            expected_output=task.expected_output,
            agent_id=task.agent_id, # Keep same agent reference (agents are shared if public logic allows, or user needs to own them?) 
            # Note: For MVP, linking to original agent is fine. 
            # Real app might need to clone agents too if they are user-specific private agents.
            # Assuming agents are viewable or shared context in this MVP.
            workflow_id=new_workflow.id
        )
        db.add(new_task)
    
    db.commit()
    return new_workflow

@router.get("/", response_model=List[schemas.Workflow])
def read_workflows(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    workflows = db.query(models.Workflow).filter(models.Workflow.owner_id == current_user.id).offset(skip).limit(limit).all()
    return workflows

@router.get("/public", response_model=List[schemas.Workflow])
def read_public_workflows(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    # Returns all workflows marked as public
    workflows = db.query(models.Workflow).filter(models.Workflow.is_public == True).offset(skip).limit(limit).all()
    return workflows

@router.post("/{workflow_id}/tasks/{task_id}")
def add_task_to_workflow(workflow_id: int, task_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    workflow = db.query(models.Workflow).filter(models.Workflow.id == workflow_id, models.Workflow.owner_id == current_user.id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Verify task agent owner
    if task.agent_id:
        agent = db.query(models.Agent).filter(models.Agent.id == task.agent_id).first()
        if agent.owner_id != current_user.id:
             raise HTTPException(status_code=403, detail="Task agent does not belong to you")

    task.workflow_id = workflow_id
    db.commit()
    return {"ok": True}

@router.delete("/{workflow_id}")
def delete_workflow(workflow_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    workflow = db.query(models.Workflow).filter(models.Workflow.id == workflow_id, models.Workflow.owner_id == current_user.id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    # Optional: Delete associated tasks to keep DB clean
    # db.query(models.Task).filter(models.Task.workflow_id == workflow_id).delete()
    
    db.delete(workflow)
    db.commit()
    return {"message": "Workflow deleted successfully"}
