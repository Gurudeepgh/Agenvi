from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
import os
from crewai import Agent, Task, Crew, Process
# from langchain_google_genai import ChatGoogleGenerativeAI # crewai uses langchain internally
# from langchain_google_genai import ChatGoogleGenerativeAI
import models, auth, database, schemas

router = APIRouter(prefix="/execution", tags=["Execution"])

# Ensure Google API Key is set in Environment
if "GOOGLE_API_KEY" not in os.environ:
    # Optional: Log warning or raise error. For now, letting it proceed to fail naturally if missing.
    print("WARNING: GOOGLE_API_KEY not found in environment variables.")

# CrewAI/LiteLLM compatibility: Ensure GEMINI_API_KEY is also set if GOOGLE is set
if "GOOGLE_API_KEY" in os.environ and "GEMINI_API_KEY" not in os.environ:
    os.environ["GEMINI_API_KEY"] = os.environ["GOOGLE_API_KEY"]

def run_crew_async(workflow_id: int, db: Session):
    # Re-query inside async task (or pass data, but re-query is safer for robust code)
    # However, db session might be closed. Better to create new session or pass data.
    # For simplicity, we'll run synchronously in the endpoint for now, or use a fresh session.
    # CrewAI kickoff is blocking.
    pass

@router.post("/{workflow_id}/run")
def run_workflow(workflow_id: int, request: schemas.WorkflowExecutionRequest = None, background_tasks: BackgroundTasks = None, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    inputs = request.inputs if request else None

    workflow = db.query(models.Workflow).filter(models.Workflow.id == workflow_id).first()
    # Allow if owner OR public
    if not workflow:
         raise HTTPException(status_code=404, detail="Workflow not found")
    if workflow.owner_id != current_user.id and not workflow.is_public:
         raise HTTPException(status_code=404, detail="Workflow not found or private")

    if not workflow.tasks:
        raise HTTPException(status_code=400, detail="Workflow has no tasks")

    # Construct Agents
    crew_agents = {}
    
    # ... (Mapping logic same as before) ...

    # Collect all unique agents from tasks
    unique_agent_ids = set()
    for task in workflow.tasks:
        if task.agent_id:
            unique_agent_ids.add(task.agent_id)
            
    # Set dummy OPENAI key to satisfy strict checks if any
    if "OPENAI_API_KEY" not in os.environ:
        os.environ["OPENAI_API_KEY"] = "NA"

    # Fetch agent details
    db_agents = db.query(models.Agent).filter(models.Agent.id.in_(unique_agent_ids)).all()
    
    for db_agent in db_agents:

        # Parse tools
        agent_tools = []
        if db_agent.tools:
            try:
                import json
                # Ensure it's a list. It might be stored as string of list "[1, 2]"
                tool_ids = json.loads(db_agent.tools)
                if isinstance(tool_ids, list):
                    # Fetch tools from DB
                    tools_data = db.query(models.Tool).filter(models.Tool.id.in_(tool_ids)).all()
                    for tool_data in tools_data:
                        if tool_data.is_preset:
                            # Load preset tools dynamically
                            try:
                                if tool_data.name == "DuckDuckGoSearchRun":
                                    from langchain_community.tools import DuckDuckGoSearchRun
                                    agent_tools.append(DuckDuckGoSearchRun())
                                elif tool_data.name == "ScrapeWebsiteTool":
                                    from crewai_tools import ScrapeWebsiteTool
                                    agent_tools.append(ScrapeWebsiteTool())
                            except Exception as e:
                                print(f"Error loading preset tool {tool_data.name}: {e}")
                        elif tool_data.code:
                            # Load custom tool from code
                            # WARNING: 'exec' is unsafe. For this MVP/Demo we assume trusted user.
                            # We expect the code to define a class inheriting from BaseTool or a tool function
                            try:
                                # Create a local namespace
                                local_scope = {}
                                exec(tool_data.code, {}, local_scope)
                                # Look for an object that is a Tool or a class
                                # Simplest convention: Expect a variable named 'tool' or class named 'Tool'
                                # Or just iterate and pick the first Tool-like object
                                found = False
                                for name, obj in local_scope.items():
                                    if name == 'tool': # User defined 'tool = ...'
                                        agent_tools.append(obj)
                                        found = True
                                        break
                                
                                if not found:
                                     # If class, instantiate? Let's stick to 'tool = InstantiatedTool()' convention in code for now.
                                     pass
                            except Exception as e:
                                print(f"Error loading custom tool {tool_data.name}: {e}")

            except Exception as e:
                print(f"Error parsing agent tools: {e}")

        crew_agents[db_agent.id] = Agent(
            role=db_agent.role,
            goal=db_agent.goal,
            backstory=db_agent.backstory,
            verbose=True,
            allow_delegation=False,
            # Use string for Gemini via LiteLLM. Requires GOOGLE_API_KEY env var (set above).
            llm="gemini/gemini-2.5-flash-lite",
            memory=False, # Disable memory to avoid OpenAI embedding requirement
            tools=agent_tools
        )

    # Construct Tasks
    crew_tasks = []
    for db_task in workflow.tasks:
        if db_task.agent_id not in crew_agents:
             raise HTTPException(status_code=400, detail=f"Agent for task {db_task.id} missing")
        
        t = Task(
            description=db_task.description,
            expected_output=db_task.expected_output,
            agent=crew_agents[db_task.agent_id]
        )
        crew_tasks.append(t)

    # Create Crew
    crew = Crew(
        agents=list(crew_agents.values()),
        tasks=crew_tasks,
        verbose=True,
        process=Process.sequential if workflow.process_type == "sequential" else Process.hierarchical # Hierarchical needs manager_llm
    )

    # For MVP, running synchronously to return result immediately.
    # In real app, this should be background task.
    try:
        print(f"Starting Crew execution for workflow {workflow.id}")
        result = crew.kickoff(inputs=inputs)
        print(f"Crew execution finished: {result}")
        return {"result": str(result)}
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Error executing crew: {error_trace}")
        raise HTTPException(status_code=500, detail=f"Execution failed: {str(e)}\n\nTraceback: {error_trace}")
