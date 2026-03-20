import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { Loader2, LogIn, AlertCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function Login() {
    const { t, language } = useLanguage();
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
            setError(t('login.error'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="card-premium w-full max-w-md p-6 md:p-8 text-center animate-in fade-in zoom-in duration-500">
                <div className="mb-3 flex justify-center">
                    <div className="inline-flex justify-center w-full">
                        <img src="/logo-sidebar.png" alt="L1NX Logo" className="w-[80%] h-auto max-h-40 object-contain" />
                    </div>
                </div>
                
                <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight mb-0.5">{t('login.welcome')}</h1>
                <p className="text-slate-500 mb-3">{t('login.subtitle')}</p>
                
                <form onSubmit={handleSubmit} className="space-y-5 text-left">
                    {error && (
                        <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-center gap-3 border border-red-200 text-sm font-medium">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            {error}
                        </div>
                    )}
                    
                    <div className="space-y-2">
                        <label htmlFor="email" className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">{t('login.email')}</label>
                        <input 
                            id="email"
                            name="email"
                            type="email" 
                            required
                            autoComplete="email"
                            placeholder="admin@l1nx.com"
                            className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-3 px-4 text-slate-800 outline-none transition-all"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <label htmlFor="password" className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">{language === 'es' ? 'Contraseña' : 'Password'}</label>
                        <input 
                            id="password"
                            name="password"
                            type="password" 
                            required
                            autoComplete="current-password"
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
                                <LogIn className="w-5 h-5" /> {t('login.enter')}
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
