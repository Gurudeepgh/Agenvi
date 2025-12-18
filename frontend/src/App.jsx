import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AgentBuilder from './pages/AgentBuilder';
import WorkflowBuilder from './pages/WorkflowBuilder';
import Tools from './pages/Tools';
import Explore from './pages/Explore';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/agents" element={<AgentBuilder />} />
            <Route path="/workflows" element={<WorkflowBuilder />} />
            <Route path="/tools" element={<Tools />} />
            <Route path="/explore" element={<Explore />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
