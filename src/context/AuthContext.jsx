import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [authUser, setAuthUser] = useState(null);
    const [loadingAuth, setLoadingAuth] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        //console.log('AUTH_CONTEXT: useEffect para cargar auth inicial.');
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        const userDataString = localStorage.getItem('userData') || sessionStorage.getItem('userData');
        //console.log('AUTH_CONTEXT: Token encontrado:', token ? 'Sí' : 'No');
        //console.log('AUTH_CONTEXT: UserData string encontrado:', userDataString ? 'Sí' : 'No');

        if (token && userDataString) {
            try {
                const user = JSON.parse(userDataString);
                //console.log('AUTH_CONTEXT: UserData parseado:', user);
                if (user && user.id) {
                    setAuthUser({ token, user });
                    //console.log('AUTH_CONTEXT: authUser establecido desde storage:', { token, user });
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
        //console.log('AUTH_CONTEXT: loadingAuth seteado a false.');
    }, []);

    const login = (data) => { 
        //console.log('AUTH_CONTEXT: Función login llamada con data:', data);
        if (data && data.token && data.user && data.user.id) {
            setAuthUser(data);
            //console.log('AUTH_CONTEXT: authUser establecido por función login:', data);
        } else {
            //console.error('AUTH_CONTEXT: Datos inválidos en función login:', data);
        }
    };

    const logout = () => {
        //console.log('AUTH_CONTEXT: Función logout llamada.');
        setAuthUser(null);
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('userData');
        //console.log('AUTH_CONTEXT: Storage limpiado.');
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