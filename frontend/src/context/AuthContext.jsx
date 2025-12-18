import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check local storage for token
        const token = localStorage.getItem("token");
        if (token) {
            // Ideally validate token with backend, but for now just set present
            // in real app fetch /users/me
            setUser({ token });
        }
        setLoading(false);
    }, []);

    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

    const login = async (email, password) => {
        try {
            const formData = new FormData();
            formData.append("username", email);
            formData.append("password", password);

            const response = await axios.post(`${API_URL}/token`, formData);
            const { access_token } = response.data;

            localStorage.setItem("token", access_token);
            setUser({ token: access_token });
            return true;
        } catch (error) {
            console.error("Login failed", error);
            throw error;
        }
    };

    const register = async (email, password) => {
        try {
            await axios.post(`${API_URL}/register`, {
                email, password
            });
            return true;
        } catch (error) {
            console.error("Register failed", error);
            throw error;
        }
    }

    useEffect(() => {
        // Axios interceptor to handle 401s
        const interceptor = axios.interceptors.response.use(
            response => response,
            error => {
                if (error.response && error.response.status === 401) {
                    console.log("Session expired, logging out...");
                    logout();
                }
                return Promise.reject(error);
            }
        );

        return () => axios.interceptors.response.eject(interceptor);
    }, []);

    const logout = () => {
        localStorage.removeItem("token");
        setUser(null);
        // Optional: Redirect to login if using router, but state update should trigger re-render of App.jsx
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};
