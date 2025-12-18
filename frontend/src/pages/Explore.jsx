import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';

import { Globe, User, Play, Loader2, Trash2, Copy, Share2 } from 'lucide-react';
import RunWorkflowModal from '../components/RunWorkflowModal';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function Explore() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState("my"); // 'my' or 'global'
    const [myWorkflows, setMyWorkflows] = useState([]);
    const [globalWorkflows, setGlobalWorkflows] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal
    const [selectedWorkflow, setSelectedWorkflow] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [executing, setExecuting] = useState(false);
    const [executionResult, setExecutionResult] = useState(null); // Just for show, maybe alert it? The modal logic in Builder handles it inline. 
    // Actually, running from Explore:
    // 1. Open Modal -> Collect Inputs
    // 2. Execute
    // 3. Show result? The modal current logic executes and returns result to parent? 
    //      Builder handles it by setting `executionResult` state to show in side panel.
    //      Here we probably need a Result Modal or just an Alert for now. Or a simplified Result View.

    useEffect(() => {
        fetchData();
    }, [user.token]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [myRes, globalRes] = await Promise.all([
                axios.get(`${API_URL}/workflows/`, { headers: { Authorization: `Bearer ${user.token}` } }),
                axios.get(`${API_URL}/workflows/public`)
            ]);
            setMyWorkflows(myRes.data);
            setGlobalWorkflows(globalRes.data);
        } catch (error) {
            console.error("Failed to fetch workflows", error);
        } finally {
            setLoading(false);
        }
    };

    const handleRunClick = (wf) => {
        setSelectedWorkflow(wf);
        setIsModalOpen(true);
    };

    const handleDelete = async (wfId) => {
        if (!window.confirm("Are you sure you want to delete this workflow?")) return;
        try {
            await axios.delete(`${API_URL}/workflows/${wfId}`, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setMyWorkflows(prev => prev.filter(w => w.id !== wfId));
        } catch (error) {
            console.error("Delete failed", error);
            alert("Failed to delete workflow");
        }
    };

    const handlePublish = async (wf, e) => {
        e.stopPropagation();
        try {
            // Toggle public status
            const updatedWf = { ...wf, is_public: !wf.is_public };
            await axios.put(`${API_URL}/workflows/${wf.id}`, updatedWf, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            fetchData(); // Refresh both lists
        } catch (error) {
            console.error("Publish update failed", error);
            alert("Failed to update status");
        }
    };

    const handleClone = async (wf, e) => {
        e.stopPropagation();
        if (!window.confirm(`Clone "${wf.name}" to your workflows?`)) return;
        try {
            await axios.post(`${API_URL}/workflows/${wf.id}/clone`, {}, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            alert("Workflow cloned successfully!");
            setActiveTab('my');
            fetchData();
        } catch (error) {
            console.error("Clone failed", error);
            alert("Failed to clone workflow: " + (error.response?.data?.detail || error.message));
        }
    };

    const handleExecute = async (inputs) => {
        if (!selectedWorkflow) return;
        setExecuting(true);
        setExecutionResult(null); // We might want to show this somewhere
        setIsModalOpen(false);

        try {
            const runRes = await axios.post(`${API_URL}/execution/${selectedWorkflow.id}/run`, {
                inputs: inputs
            }, {
                headers: { Authorization: `Bearer ${user.token}` }
            });

            // For Explore, since we don't have a console view, let's just alert for now or show a generic modal?
            // "WOW" factor: Let's create a simple Result Modal or reuse a generic one.
            // For now, Alert is safest/simplest, but I'll make it a nice alert.
            const result = runRes.data.result;
            // Simple approach: Alert key part, or log to console. 
            // Better: Set a "resultModal" state.
            setExecutionResult(result);

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
                onRun={handleExecute}
                workflow={selectedWorkflow}
                loading={false}
            />

            {/* Result Display Overlay (Simple) */}
            {executionResult && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <Card className="w-full max-w-2xl bg-zinc-900 border-zinc-700 text-white max-h-[80vh] flex flex-col">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Execution Result</CardTitle>
                            <Button variant="ghost" size="icon" onClick={() => setExecutionResult(null)}>X</Button>
                        </CardHeader>
                        <CardContent className="overflow-y-auto font-mono text-sm bg-black/50 p-4 m-4 rounded">
                            <div className="whitespace-pre-wrap">{executionResult}</div>
                        </CardContent>
                        <CardFooter>
                            <Button onClick={() => setExecutionResult(null)} className="ml-auto">Close</Button>
                        </CardFooter>
                    </Card>
                </div>
            )}

            {/* Loading Overlay */}
            {executing && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-xl flex items-center space-x-4">
                        <Loader2 className="animate-spin text-primary h-8 w-8" />
                        <span className="text-lg font-medium">Running Agent Crew...</span>
                    </div>
                </div>
            )}

            <div>
                <h2 className="text-3xl font-bold tracking-tight">Explore Workflows</h2>
                <p className="text-muted-foreground">Manage your workflows or discover community creations.</p>
            </div>

            {/* Tabs */}
            <div className="flex space-x-2 border-b border-zinc-800 pb-1 mb-6">
                <button
                    onClick={() => setActiveTab('my')}
                    className={`flex items-center px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'my' ? 'border-indigo-500 text-indigo-500' : 'border-transparent text-muted-foreground hover:text-white'}`}
                >
                    <User className="w-4 h-4 mr-2" />
                    My Workflows
                </button>
                <button
                    onClick={() => setActiveTab('global')}
                    className={`flex items-center px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'global' ? 'border-indigo-500 text-indigo-500' : 'border-transparent text-muted-foreground hover:text-white'}`}
                >
                    <Globe className="w-4 h-4 mr-2" />
                    Global Workflows
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {activeTab === 'my' && myWorkflows.length === 0 && (
                        <p className="col-span-3 text-center py-10 text-muted-foreground">You haven't created any workflows yet.</p>
                    )}
                    {(activeTab === 'my' ? myWorkflows : globalWorkflows).map((wf) => (
                        <Card key={wf.id} className="relative group hover:shadow-xl transition-shadow border-zinc-800 bg-zinc-900/50 flex flex-col">
                            {/* Actions for My Workflows: Publish/Delete */}
                            {activeTab === 'my' && (
                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-black/40 p-1 rounded">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className={`h-8 w-8 hover:bg-blue-500/20 ${wf.is_public ? 'text-blue-400' : 'text-zinc-500 hover:text-blue-400'}`}
                                        title={wf.is_public ? "Unpublish (Make Private)" : "Publish (Make Global)"}
                                        onClick={(e) => handlePublish(wf, e)}
                                    >
                                        <Share2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-zinc-500 hover:text-red-500 hover:bg-red-500/10"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(wf.id);
                                        }}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}

                            <CardHeader>
                                <CardTitle className="flex justify-between items-center pr-8">
                                    <span className="truncate">{wf.name}</span>
                                    {wf.is_public && <span className="text-[10px] bg-blue-900 text-blue-200 px-2 py-0.5 rounded-full ml-2">Public</span>}
                                </CardTitle>
                                <CardDescription>Type: {wf.process_type}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1">
                                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                                    This workflow has {wf.tasks?.length || 0} tasks.
                                </p>
                            </CardContent>
                            <CardFooter className="gap-2">
                                {activeTab === 'global' && (
                                    <Button variant="secondary" onClick={(e) => handleClone(wf, e)} className="flex-1">
                                        <Copy className="w-4 h-4 mr-2" /> Clone
                                    </Button>
                                )}
                                <Button onClick={() => handleRunClick(wf)} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
                                    <Play className="w-4 h-4 mr-2" /> Run
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
