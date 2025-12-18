import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Loader2, Plus, Trash2, Edit } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function AgentBuilder() {
    const { user } = useAuth();
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [name, setName] = useState('');
    const [role, setRole] = useState('');
    const [goal, setGoal] = useState('');
    const [backstory, setBackstory] = useState('');
    const [createLoading, setCreateLoading] = useState(false);

    // Tools State
    const [availableTools, setAvailableTools] = useState([]);
    const [selectedTools, setSelectedTools] = useState([]);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAgent, setEditingAgent] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [agentsRes, toolsRes, presetsRes] = await Promise.all([
                axios.get(`${API_URL}/agents/`, { headers: { Authorization: `Bearer ${user.token}` } }),
                axios.get(`${API_URL}/tools/`, { headers: { Authorization: `Bearer ${user.token}` } }),
                axios.get(`${API_URL}/tools/presets`)
            ]);
            setAgents(agentsRes.data);
            setAvailableTools([...presetsRes.data, ...toolsRes.data]);
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingAgent(null);
        setName(''); setRole(''); setGoal(''); setBackstory(''); setSelectedTools([]);
        setIsModalOpen(true);
    };

    const openEditModal = (agent) => {
        setEditingAgent(agent);
        setName(agent.name);
        setRole(agent.role);
        setGoal(agent.goal);
        setBackstory(agent.backstory);
        try {
            setSelectedTools(agent.tools ? JSON.parse(agent.tools) : []);
        } catch (e) {
            setSelectedTools([]);
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setCreateLoading(true);
        try {
            const payload = {
                name, role, goal, backstory,
                tools: JSON.stringify(selectedTools)
            };

            if (editingAgent) {
                await axios.put(`${API_URL}/agents/${editingAgent.id}`, payload, {
                    headers: { Authorization: `Bearer ${user.token}` }
                });
            } else {
                await axios.post(`${API_URL}/agents/`, payload, {
                    headers: { Authorization: `Bearer ${user.token}` }
                });
            }
            fetchData();
            setIsModalOpen(false);
        } catch (error) {
            alert("Failed to save agent");
        } finally {
            setCreateLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this agent?")) return;
        try {
            await axios.delete(`${API_URL}/agents/${id}`, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            fetchData();
        } catch (error) {
            console.error("Delete failed", error);
        }
    }

    return (
        <div className="space-y-8 animate-fade-in-up">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Agent Builder</h2>
                    <p className="text-muted-foreground">Craft your AI workforce with specific roles and goals.</p>
                </div>
                <Button onClick={openCreateModal}>
                    <Plus className="mr-2 h-4 w-4" /> Create Agent
                </Button>
            </div>

            {loading ? <Loader2 className="animate-spin mx-auto" /> : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {agents.map(agent => (
                        <Card key={agent.id} className="relative group hover:shadow-lg transition-shadow bg-zinc-900/50 flex flex-col h-full border-zinc-800">
                            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-black/50 p-1 rounded backdrop-blur-sm">
                                <Button variant="secondary" size="icon" className="h-8 w-8" onClick={() => openEditModal(agent)}>
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDelete(agent.id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                            <CardHeader>
                                <CardTitle>{agent.name}</CardTitle>
                                <CardDescription className="line-clamp-1">{agent.role}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1">
                                <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{agent.goal}</p>
                                <div className="mt-auto">
                                    {agent.tools && (() => {
                                        try {
                                            const tools = JSON.parse(agent.tools);
                                            return tools.length > 0 && (
                                                <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30">
                                                    {tools.length} Tools
                                                </span>
                                            );
                                        } catch (e) { return null; }
                                    })()}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    {agents.length === 0 && (
                        <div className="col-span-full text-center py-20 border border-dashed border-zinc-800 rounded-lg">
                            <p className="text-muted-foreground mb-4">No agents found. Create your first agent!</p>
                            <Button variant="outline" onClick={openCreateModal}>Create Agent</Button>
                        </div>
                    )}
                </div>
            )}

            {/* Modal Overlay */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
                    <Card className="w-full max-w-lg bg-zinc-950 border-zinc-800 max-h-[90vh] overflow-y-auto shadow-2xl">
                        <CardHeader className="border-b border-zinc-800 pb-4">
                            <CardTitle>{editingAgent ? 'Edit Agent' : 'Create New Agent'}</CardTitle>
                            <CardDescription>Define the personality and capabilities of your agent.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Name</label>
                                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Researcher" required className="bg-zinc-900 border-zinc-700 focus:ring-indigo-500" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Role</label>
                                    <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Leading Research Analyst" required className="bg-zinc-900 border-zinc-700 focus:ring-indigo-500" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Goal</label>
                                    <Input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. Uncover cutting-edge developments" required className="bg-zinc-900 border-zinc-700 focus:ring-indigo-500" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Backstory</label>
                                    <textarea
                                        className="flex min-h-[100px] w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                                        value={backstory}
                                        onChange={(e) => setBackstory(e.target.value)}
                                        placeholder="e.g. A seasoned analyst with years of experience..."
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Tools</label>
                                    <div className="border border-zinc-700 rounded-md p-3 max-h-[150px] overflow-y-auto space-y-2 bg-zinc-900">
                                        {availableTools.map(tool => (
                                            <div key={tool.id} className="flex items-center space-x-2">
                                                <input
                                                    type="checkbox"
                                                    id={`tool-${tool.id}`}
                                                    className="cursor-pointer accent-indigo-500"
                                                    checked={selectedTools.includes(tool.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) setSelectedTools([...selectedTools, tool.id]);
                                                        else setSelectedTools(selectedTools.filter(id => id !== tool.id));
                                                    }}
                                                />
                                                <label htmlFor={`tool-${tool.id}`} className="text-sm cursor-pointer select-none text-zinc-300">
                                                    {tool.name} <span className="text-xs text-muted-foreground ml-1">({tool.is_preset ? 'System' : 'Custom'})</span>
                                                </label>
                                            </div>
                                        ))}
                                        {availableTools.length === 0 && <p className="text-xs text-muted-foreground">No tools available. Create some in Tools page.</p>}
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-zinc-800">
                                    <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                                    <Button type="submit" disabled={createLoading}>
                                        {createLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (editingAgent ? 'Save Changes' : 'Create Agent')}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
