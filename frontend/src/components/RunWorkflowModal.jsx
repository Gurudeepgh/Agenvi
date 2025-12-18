import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { X, Play, Loader2 } from 'lucide-react';


const RunWorkflowModal = ({ workflow, isOpen, onClose, onRun, loading }) => {
    const [inputs, setInputs] = useState({});
    const [detectedVariables, setDetectedVariables] = useState([]);

    useEffect(() => {
        if (isOpen && workflow) {
            const vars = extractVariables(workflow);
            setDetectedVariables(vars);

            // Initialize inputs
            const initialInputs = {};
            vars.forEach(v => initialInputs[v] = "");
            setInputs(initialInputs);
        }
    }, [isOpen, workflow]);

    const extractVariables = (wf) => {
        if (!wf || !wf.tasks) return [];

        const textToScan = [];
        // Scan Tasks
        wf.tasks.forEach(t => {
            textToScan.push(t.description);
            textToScan.push(t.expected_output);
        });
        // Scan Agents (we might not have fill agent details in workflow object if it's just IDs, 
        // but usually we want to pass them. For now, let's assume the backend handles the merging,
        // but for the UI to know variables in Agent fields, we'd need the agent data. 
        // The current WorkflowResponse includes tasks, but tasks include agent_id. 
        // The backend `inputs` are global to the crew, so they fill ANY placeholder.
        // So we scan what we have. If the user put {{topic}} in an agent's goal, and we don't have that text here,
        // we won't prompt for it.
        // LIMITATION: We only scan what's visible. Ideally we should scan the agents too.
        // For MVP Phase 2, let's scan what we have. If we need to scan agents, we'd need to fetch them.
        // Let's assume the user puts the *inputs* mostly in the Task Description.

        // Regex for {{variable}}
        const regex = /{{(.*?)}}/g;
        const variables = new Set();

        textToScan.forEach(text => {
            if (text) {
                let match;
                while ((match = regex.exec(text)) !== null) {
                    variables.add(match[1].trim());
                }
            }
        });

        return Array.from(variables);
    };

    const handleInputChange = (varName, value) => {
        setInputs(prev => ({
            ...prev,
            [varName]: value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onRun(inputs);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <Card className="w-full max-w-md bg-zinc-900 border-zinc-800 text-zinc-100 shadow-2xl">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Run Workflow: {workflow?.name}</CardTitle>
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-zinc-400 hover:text-white">
                        <X className="h-4 w-4" />
                    </Button>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        {detectedVariables.length > 0 ? (
                            <>
                                <p className="text-sm text-zinc-400 mb-2">
                                    This workflow requires the following inputs:
                                </p>
                                {detectedVariables.map(v => (
                                    <div key={v} className="space-y-1">
                                        <label className="text-xs font-semibold uppercase text-zinc-500">{v}</label>
                                        <Input
                                            value={inputs[v]}
                                            onChange={(e) => handleInputChange(v, e.target.value)}
                                            placeholder={`Enter value for ${v}`}
                                            required
                                            className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600 focus-visible:ring-indigo-500"
                                        />
                                    </div>
                                ))}
                            </>
                        ) : (
                            <p className="text-sm text-zinc-400">
                                Ready to execute? detecting no variables.
                            </p>
                        )}
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={onClose} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white">
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Running...
                                </>
                            ) : (
                                <>
                                    <Play className="mr-2 h-4 w-4" />
                                    Run Workflow
                                </>
                            )}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
};

export default RunWorkflowModal;
