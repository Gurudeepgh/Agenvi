import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card';
import { Loader2, Plus, Play, CheckCircle } from 'lucide-react';
import RunWorkflowModal from '../components/RunWorkflowModal';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function WorkflowBuilder() {
    const { user } = useAuth();
    const [agents, setAgents] = useState([]);
    // Workflow State
    const [workflowName, setWorkflowName] = useState('');
    const [tasks, setTasks] = useState([]); // Array of { description, expected_output, agent_id }
    const [executionResult, setExecutionResult] = useState(null);
    const [executing, setExecuting] = useState(false);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [savedWorkflow, setSavedWorkflow] = useState(null); // The full workflow object after saving

    // Form inputs for current task being added
    const [taskDesc, setTaskDesc] = useState('');
    const [taskOutput, setTaskOutput] = useState('');
    const [selectedAgent, setSelectedAgent] = useState('');

    useEffect(() => {
        // Fetch agents
        axios.get(`${API_URL}/agents/`, {
            headers: { Authorization: `Bearer ${user.token}` }
        }).then(res => setAgents(res.data));
    }, [user.token]);

    const addTask = () => {
        if (!taskDesc || !selectedAgent) return;
        setTasks([...tasks, { description: taskDesc, expected_output: taskOutput, agent_id: selectedAgent }]);
        setTaskDesc(''); setTaskOutput(''); setSelectedAgent('');
    };

    const handlePrepareRun = async () => {
        // Save the workflow first, then open the modal to collect inputs
        setExecuting(true);
        try {
            // 1. Create Workflow
            const wfRes = await axios.post(`${API_URL}/workflows/`, { name: workflowName || "Untitled Workflow" }, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            const workflowId = wfRes.data.id;

            // 2. Create and Link Tasks
            for (const task of tasks) {
                const taskRes = await axios.post(`${API_URL}/workflows/tasks`, {
                    description: task.description,
                    expected_output: task.expected_output || "Best effort",
                    agent_id: task.agent_id
                }, {
                    headers: { Authorization: `Bearer ${user.token}` }
                });

                await axios.post(`${API_URL}/workflows/${workflowId}/tasks/${taskRes.data.id}`, {}, {
                    headers: { Authorization: `Bearer ${user.token}` }
                });
            }

            // Construct full workflow object for the modal
            const fullWorkflow = {
                id: workflowId,
                name: workflowName || "Untitled Workflow",
                tasks: tasks // The modal needs descriptions to scan, and we have them in state matching the saved ones
            };
            setSavedWorkflow(fullWorkflow);
            setExecuting(false);
            setIsModalOpen(true);

        } catch (error) {
            console.error(error);
            alert("Failed to save workflow: " + (error.response?.data?.detail || error.message));
            setExecuting(false);
        }
    };

    const handleRunExecution = async (inputs) => {
        if (!savedWorkflow) return;
        setExecuting(true);
        setExecutionResult(null);
        setIsModalOpen(false); // Close modal and show loading in main UI

        try {
            const runRes = await axios.post(`${API_URL}/execution/${savedWorkflow.id}/run`, {
                inputs: inputs
            }, {
                headers: { Authorization: `Bearer ${user.token}` }
            });

            setExecutionResult(runRes.data.result);
        } catch (error) {
            console.error(error);
            alert("Execution failed: " + (error.response?.data?.detail || error.message));
        } finally {
            setExecuting(false);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in-up">
            <RunWorkflowModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onRun={handleRunExecution}
                workflow={savedWorkflow}
                loading={false} // Modal closes immediately to show main UI loading, or we could keep it open. Let's close it.
            />

            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Workflow Builder</h2>
                    <p className="text-muted-foreground">Assemble agents into a crew and execute tasks.</p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Builder Column */}
                <Card className="md:col-span-1">
                    <CardHeader>
                        <CardTitle>Compose Crew</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Workflow Name</label>
                            <Input value={workflowName} onChange={e => setWorkflowName(e.target.value)} placeholder="e.g. Market Research Crew" />
                        </div>

                        <div className="border rounded-md p-4 space-y-4 bg-muted/20">
                            <h4 className="font-semibold text-sm">Add Task</h4>
                            <div className="space-y-2">
                                <label className="text-sm">Description</label>
                                <textarea
                                    className="flex min-h-[60px] w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm"
                                    value={taskDesc} onChange={e => setTaskDesc(e.target.value)} placeholder="Usage: 'Research {{topic}}'"
                                />
                                <p className="text-xs text-muted-foreground">Tip: Use <b>{"{{variable}}"}</b> to create dynamic inputs.</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm">Expected Output</label>
                                <Input value={taskOutput} onChange={e => setTaskOutput(e.target.value)} placeholder="e.g. A bulleted list..." />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm">Assign Agent</label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={selectedAgent} onChange={e => setSelectedAgent(e.target.value)}
                                >
                                    <option value="">Select Agent...</option>
                                    {agents.map(a => <option key={a.id} value={a.id}>{a.name} ({a.role})</option>)}
                                </select>
                            </div>
                            <Button onClick={addTask} variant="secondary" className="w-full" disabled={!taskDesc || !selectedAgent}>
                                <Plus className="w-4 h-4 mr-2" /> Add Task
                            </Button>
                        </div>

                        {/* Task List Preview */}
                        <div className="space-y-2">
                            <h4 className="font-semibold text-sm">Task Queue</h4>
                            {tasks.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">No tasks added.</p> : (
                                tasks.map((t, i) => (
                                    <div key={i} className="flex items-center gap-2 p-3 border rounded text-sm bg-card">
                                        <span className="font-mono text-xs text-muted-foreground">{i + 1}.</span>
                                        <div className="flex-1">
                                            <p className="font-medium">{agents.find(a => a.id == t.agent_id)?.name || "Agent"}</p>
                                            <p className="text-muted-foreground truncate">{t.description}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button onClick={handlePrepareRun} disabled={tasks.length === 0 || executing} className="w-full bg-green-600 hover:bg-green-700">
                            {executing ? <Loader2 className="animate-spin mr-2" /> : <Play className="mr-2 w-4 h-4" />}
                            Run Crew
                        </Button>
                    </CardFooter>
                </Card>

                {/* Output Column */}
                <Card className="md:col-span-1 h-full min-h-[500px]">
                    <CardHeader>
                        <CardTitle>Execution Output</CardTitle>
                    </CardHeader>
                    <CardContent className="bg-black/90 text-green-400 font-mono text-sm p-6 rounded-md h-[400px] overflow-y-auto m-6">
                        {executing && !isModalOpen ? (
                            <div className="flex items-center gap-2">
                                <Loader2 className="animate-spin h-4 w-4" />
                                <span>Crew is working... (This may take a moment)</span>
                            </div>
                        ) : executionResult ? (
                            <div className="whitespace-pre-wrap">{executionResult}</div>
                        ) : (
                            <span className="text-gray-500">// Output will appear here...</span>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
