import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { pb, type User } from '../lib/pocketbase';

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (email: string, pass: string) => Promise<void>;
    logout: () => void;
    hasPermission: (action: string, targetOrganizationId?: string) => boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    isLoading: true,
    login: async () => {},
    logout: () => {},
    hasPermission: () => false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        // Initialize from local storage if available
        if (pb.authStore.isValid && pb.authStore.model) {
            setUser(pb.authStore.model as unknown as User);
        } else {
            setUser(null);
            if (location.pathname !== '/login') {
                navigate('/login', { replace: true });
            }
        }
        setIsLoading(false);

        // Listen for changes
        const unsubscribe = pb.authStore.onChange((token, model) => {
            if (token && model) {
                setUser(model as unknown as User);
            } else {
                setUser(null);
                if (location.pathname !== '/login') {
                    navigate('/login', { replace: true });
                }
            }
        });

        return () => {
            unsubscribe();
        };
    }, [navigate, location]);

    // Inactivity timeout
    useEffect(() => {
        if (!user) return; // Only track if logged in

        let timeoutId: number;
        const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes in milliseconds

        const logoutDueToInactivity = () => {
            pb.authStore.clear();
            navigate('/login', { replace: true });
        };

        const handleActivity = () => {
            if (timeoutId) {
                window.clearTimeout(timeoutId);
            }
            timeoutId = window.setTimeout(logoutDueToInactivity, TIMEOUT_MS);
        };

        // Standard user activity events
        const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];

        // Initialize the timer
        handleActivity();
        
        events.forEach(event => {
            window.addEventListener(event, handleActivity);
        });

        return () => {
            if (timeoutId) window.clearTimeout(timeoutId);
            events.forEach(event => {
                window.removeEventListener(event, handleActivity);
            });
        };
    }, [user, navigate]);

    const login = async (email: string, pass: string) => {
        setIsLoading(true);
        try {
            await pb.collection('users').authWithPassword(email, pass);
            navigate('/', { replace: true });
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        pb.authStore.clear();
        navigate('/login', { replace: true });
    };

    const hasPermission = (action: string, targetOrganizationId?: string): boolean => {
        if (!user) return false;
        
        switch (user.role) {
            case 'superadmin':
                return true; // Can do anything
                
            case 'admin':
                // Admins cannot manage organizations (it belongs to superadmin only)
                if (action === 'manage_organizations') {
                    return false;
                }
                // Admins can do anything else within their own organization
                if (targetOrganizationId && targetOrganizationId !== user.organization) {
                    return false;
                }
                return true; 
                
            case 'content_manager':
                // Content managers cannot manage users or organizations
                if (['manage_users', 'manage_organizations'].includes(action)) {
                    return false;
                }
                if (targetOrganizationId && targetOrganizationId !== user.organization) {
                    return false;
                }
                return true;
                
            case 'viewer':
                // Viewers can only read
                if (['read'].includes(action)) {
                    if (targetOrganizationId && targetOrganizationId !== user.organization) {
                        return false;
                    }
                    return true;
                }
                return false;
                
            default:
                return false;
        }
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout, hasPermission }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
