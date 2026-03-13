import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { Loader2, LogIn, AlertCircle } from 'lucide-react';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const { login, user } = useAuth();

    // If already logged in, redirect to home
    if (user) {
        return <Navigate to="/" replace />;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            await login(email, password);
            // navigate is handled inside login()
        } catch (err: any) {
            console.error('Login error:', err);
            setError('Credenciales incorrectas o problema de conexión.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="card-premium w-full max-w-md p-8 md:p-10 text-center animate-in fade-in zoom-in duration-500">
                <div className="mb-8 flex justify-center">
                    <div className="bg-primary/10 p-4 rounded-3xl inline-flex text-primary">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                        </svg>
                    </div>
                </div>
                
                <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight mb-2">Bienvenido</h1>
                <p className="text-slate-500 mb-8">Inicia sesión para gestionar tus pantallas</p>
                
                <form onSubmit={handleSubmit} className="space-y-5 text-left">
                    {error && (
                        <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-center gap-3 border border-red-200 text-sm font-medium">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            {error}
                        </div>
                    )}
                    
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Email</label>
                        <input 
                            type="email" 
                            required
                            placeholder="admin@l1nx.com"
                            className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-3 px-4 text-slate-800 outline-none transition-all"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Contraseña</label>
                        <input 
                            type="password" 
                            required
                            placeholder="••••••••"
                            className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-3 px-4 text-slate-800 outline-none transition-all"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                    </div>
                    
                    <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="w-full bg-primary hover:bg-[#D98201] text-white py-4 mt-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-md shadow-primary/20"
                    >
                        {isSubmitting ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                <LogIn className="w-5 h-5" /> Ingresar
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
