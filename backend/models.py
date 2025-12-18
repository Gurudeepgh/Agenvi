from sqlalchemy import Column, Integer, String, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    
    agents = relationship("Agent", back_populates="owner")
    workflows = relationship("Workflow", back_populates="owner")
    tools = relationship("Tool", back_populates="owner")

class Tool(Base):
    __tablename__ = "tools"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(Text)
    code = Column(Text) # For custom tools
    is_preset = Column(Boolean, default=False)
    owner_id = Column(Integer, ForeignKey("users.id"))
    
    owner = relationship("User", back_populates="tools")

class Agent(Base):
    __tablename__ = "agents"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    role = Column(String)
    goal = Column(Text)
    backstory = Column(Text)
    tools = Column(Text) # JSON string of tools
    owner_id = Column(Integer, ForeignKey("users.id"))

    owner = relationship("User", back_populates="agents")

class Workflow(Base): # Represents a Crew
    __tablename__ = "workflows"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(Text)
    process_type = Column(String, default="sequential") # sequential or hierarchical
    is_public = Column(Boolean, default=False)
    owner_id = Column(Integer, ForeignKey("users.id"))

    owner = relationship("User", back_populates="workflows")
    tasks = relationship("Task", back_populates="workflow")

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    description = Column(Text)
    expected_output = Column(Text)
    agent_id = Column(Integer, ForeignKey("agents.id"))
    workflow_id = Column(Integer, ForeignKey("workflows.id"))

    workflow = relationship("Workflow", back_populates="tasks")
