import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card';
import { Loader2, Plus, Trash2, Wrench, Code } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function Tools() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState("system"); // 'my' or 'system'
    const [myTools, setMyTools] = useState([]);
    const [systemTools, setSystemTools] = useState([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [code, setCode] = useState('');
    const [createLoading, setCreateLoading] = useState(false);

    useEffect(() => {
        fetchTools();
    }, [user.token]);

    const fetchTools = async () => {
        setLoading(true);
        try {
            const [myRes, systemRes] = await Promise.all([
                axios.get(`${API_URL}/tools/`, { headers: { Authorization: `Bearer ${user.token}` } }),
                axios.get(`${API_URL}/tools/presets`)
            ]);
            setMyTools(myRes.data);
            setSystemTools(systemRes.data);
        } catch (error) {
            console.error("Failed to fetch tools", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTool = async (e) => {
        e.preventDefault();
        setCreateLoading(true);
        try {
            await axios.post(`${API_URL}/tools/`, {
                name, description, code, is_preset: false
            }, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            fetchTools();
            setName(''); setDescription(''); setCode('');
            setActiveTab('my');
        } catch (error) {
            alert("Failed to create tool");
        } finally {
            setCreateLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure?")) return;
        try {
            await axios.delete(`${API_URL}/tools/${id}`, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            fetchTools();
        } catch (error) {
            console.error("Delete failed", error);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in-up">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Tools Management</h2>
                    <p className="text-muted-foreground">Extend your agents with custom capabilities.</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-2 border-b border-zinc-800 pb-1 mb-6">
                <button
                    onClick={() => setActiveTab('system')}
                    className={`flex items-center px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'system' ? 'border-indigo-500 text-indigo-500' : 'border-transparent text-muted-foreground hover:text-white'}`}
                >
                    <Wrench className="w-4 h-4 mr-2" />
                    System Tools
                </button>
                <button
                    onClick={() => setActiveTab('my')}
                    className={`flex items-center px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'my' ? 'border-indigo-500 text-indigo-500' : 'border-transparent text-muted-foreground hover:text-white'}`}
                >
                    <Code className="w-4 h-4 mr-2" />
                    My Tools
                </button>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Left Column: List */}
                <div className="space-y-4">
                    <h3 className="text-xl font-semibold">
                        {activeTab === 'system' ? "Available System Tools" : "Your Custom Tools"}
                    </h3>

                    {loading ? <Loader2 className="animate-spin" /> : (
                        <div className="grid gap-4">
                            {(activeTab === 'system' ? systemTools : myTools).map(tool => (
                                <Card key={tool.id} className="relative group bg-zinc-900/50">
                                    {activeTab === 'my' && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-destructive/10"
                                            onClick={() => handleDelete(tool.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-lg">{tool.name}</CardTitle>
                                        <CardDescription>{tool.description}</CardDescription>
                                    </CardHeader>
                                    {tool.code && (
                                        <CardContent>
                                            <pre className="text-xs bg-black/50 p-2 rounded overflow-x-auto text-muted-foreground">
                                                {tool.code.substring(0, 100)}...
                                            </pre>
                                        </CardContent>
                                    )}
                                </Card>
                            ))}
                            {(activeTab === 'system' ? systemTools : myTools).length === 0 && (
                                <p className="text-muted-foreground">No tools found.</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Column: Create Form (Only for My Tools) */}
                {activeTab === 'my' && (
                    <Card className="h-fit border-indigo-500/20">
                        <CardHeader>
                            <CardTitle>Create Custom Tool</CardTitle>
                            <CardDescription>Define a Python class or function for your tool.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleCreateTool} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Tool Name</label>
                                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. WeatherFetcher" required />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Description</label>
                                    <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Fetches weather data" required />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Python Code</label>
                                    <p className="text-xs text-muted-foreground mb-1">
                                        Must define an instantiated object named <code>tool</code>.
                                        Example:
                                    </p>
                                    <textarea
                                        className="flex min-h-[200px] w-full rounded-md border border-input bg-zinc-950 px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                        value={code}
                                        onChange={(e) => setCode(e.target.value)}
                                        placeholder={`from crewai_tools import BaseTool\n\nclass MyTool(BaseTool):\n    name: str = "MyTool"\n    description: str = "Does something"\n    def _run(self, argument: str) -> str:\n        return "Result"\n\ntool = MyTool()`}
                                        required
                                    />
                                </div>
                                <Button type="submit" disabled={createLoading} className="w-full">
                                    {createLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <><Plus className="mr-2 h-4 w-4" /> Create Tool</>}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                )}

                {activeTab === 'system' && (
                    <div className="p-4 border border-dashed border-zinc-700 rounded-lg text-center text-muted-foreground h-fit">
                        <p>System tools are pre-configured and cannot be modified.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
