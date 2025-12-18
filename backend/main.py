import signal
import sys
# Patch signals for Windows compatibility (CrewAI uses these)
if sys.platform == "win32":
    for sig in ['SIGHUP', 'SIGTSTP', 'SIGCONT', 'SIGALRM', 'SIGUSR1', 'SIGUSR2']:
        if not hasattr(signal, sig):
            setattr(signal, sig, 1) # Set to a dummy value

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Agento API", description="Backend for Agento Multi-Agent System")

origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
    "*", # Allow all for Vercel deployment (or you can specify your vercel domain later)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to Agento API"}

# Include Routers
from api import auth, agents, workflows, execution
app.include_router(auth.router)
app.include_router(agents.router)
app.include_router(workflows.router)
app.include_router(execution.router)
from api import tools
app.include_router(tools.router)

# Initialize DB
from database import engine, Base
Base.metadata.create_all(bind=engine)
