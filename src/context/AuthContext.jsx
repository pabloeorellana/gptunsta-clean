import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [authUser, setAuthUser] = useState(null);
    const [loadingAuth, setLoadingAuth] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        const userDataString = localStorage.getItem('userData') || sessionStorage.getItem('userData');

        if (token && userDataString) {
            try {
                const user = JSON.parse(userDataString);
                if (user && user.id) {
                    setAuthUser({ token, user });
                } else {
                    console.error('AUTH_CONTEXT: UserData parseado no tiene ID o es inválido.');
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('userData');
                    sessionStorage.removeItem('authToken');
                    sessionStorage.removeItem('userData');
                }
            } catch (e) {
                console.error("AUTH_CONTEXT: Error parseando userData desde storage:", e);
                localStorage.removeItem('authToken');
                localStorage.removeItem('userData');
                sessionStorage.removeItem('authToken');
                sessionStorage.removeItem('userData');
            }
        }
        setLoadingAuth(false);
    }, []);

    const login = (data) => { 
        if (data && data.token && data.user && data.user.id) {
            setAuthUser(data);
        } else {
        }
    };

    const logout = () => {
        setAuthUser(null);
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('userData');
        navigate('/profesional/login');
    };

    const value = {
        authUser,
        isAuthenticated: !!authUser,
        loadingAuth,
        login,
        logout
    };
    return (
        <AuthContext.Provider value={value}>
            {!loadingAuth && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};