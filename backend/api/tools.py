from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import models, schemas, auth, database

router = APIRouter(prefix="/tools", tags=["Tools"])

# --- Tools Endpoints ---

@router.post("/", response_model=schemas.Tool)
def create_tool(tool: schemas.ToolCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_tool = models.Tool(**tool.dict(), owner_id=current_user.id)
    db.add(db_tool)
    db.commit()
    db.refresh(db_tool)
    return db_tool

@router.get("/", response_model=List[schemas.Tool])
def read_tools(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    # Return custom tools for user
    tools = db.query(models.Tool).filter(models.Tool.owner_id == current_user.id).offset(skip).limit(limit).all()
    return tools

@router.get("/presets", response_model=List[schemas.Tool])
def read_preset_tools(db: Session = Depends(database.get_db)):
    # Return hardcoded system tools as Tool objects
    # In a real app, these might be in DB with is_preset=True, 
    # but for simplicity we mock them here or fetch from DB if we seeded them.
    # Let's mock them as transient objects for the UI.
    presets = [
        schemas.Tool(
            id=999901,
            owner_id=0,
            name="DuckDuckGoSearchRun",
            description="A search tool used to query the DuckDuckGo search engine.",
            is_preset=True,
            code=None
        ),
        schemas.Tool(
            id=999902,
            owner_id=0,
            name="ScrapeWebsiteTool",
            description="A tool that can scrape content from a given website URL.",
            is_preset=True,
            code=None
        )
    ]
    return presets

@router.delete("/{tool_id}")
def delete_tool(tool_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    tool = db.query(models.Tool).filter(models.Tool.id == tool_id, models.Tool.owner_id == current_user.id).first()
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")
    
    db.delete(tool)
    db.commit()
    return {"message": "Tool deleted successfully"}
