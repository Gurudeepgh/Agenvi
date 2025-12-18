from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class UserBase(BaseModel):
    email: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    class Config:
        orm_mode = True

class Token(BaseModel):
    access_token: str
    token_type: str

class AgentBase(BaseModel):
    name: str
    role: str
    goal: str
    backstory: str
    tools: Optional[str] = None

class AgentCreate(AgentBase):
    pass

class Agent(AgentBase):
    id: int
    owner_id: int
    class Config:
        orm_mode = True

class ToolBase(BaseModel):
    name: str
    description: str
    code: Optional[str] = None
    is_preset: bool = False

class ToolCreate(ToolBase):
    pass

class Tool(ToolBase):
    id: int
    owner_id: int
    class Config:
        orm_mode = True

class TaskBase(BaseModel):
    description: str
    expected_output: str
    agent_id: int

class TaskCreate(TaskBase):
    pass

class Task(TaskBase):
    id: int
    workflow_id: Optional[int] = None
    class Config:
        orm_mode = True

class TaskResponse(TaskBase):
    id: int
    workflow_id: Optional[int] = None
    class Config:
        orm_mode = True

class WorkflowBase(BaseModel):
    name: str
    process_type: str = "sequential"
    is_public: bool = False

class WorkflowCreate(WorkflowBase):
    pass

class Workflow(WorkflowBase):
    id: int
    owner_id: int
    tasks: List[Task] = []
    class Config:
        orm_mode = True

class WorkflowResponse(WorkflowBase):
    id: int
    owner_id: int
    tasks: List[TaskResponse] = []
    
    class Config:
        orm_mode = True

class WorkflowExecutionRequest(BaseModel):
    inputs: Optional[Dict[str, Any]] = None
