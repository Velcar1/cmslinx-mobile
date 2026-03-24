import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Loader2, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { pb } from '../lib/pocketbase';

export default function ResetPassword() {
    const { language } = useLanguage();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    
    // El token llega por la URL: /reset-password?token=...
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage(language === 'es' ? 'Enlace de recuperación inválido o expirado.' : 'Invalid or expired recovery link.');
        }
    }, [token, language]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!token) return;
        
        if (password !== passwordConfirm) {
            setStatus('error');
            setMessage(language === 'es' ? 'Las contraseñas no coinciden.' : 'Passwords do not match.');
            return;
        }

        if (password.length < 8) {
            setStatus('error');
            setMessage(language === 'es' ? 'La contraseña debe tener al menos 8 caracteres.' : 'Password must be at least 8 characters long.');
            return;
        }
        
        setStatus('loading');
        setMessage('');

        try {
            await pb.collection('users').confirmPasswordReset(token, password, passwordConfirm);
            setStatus('success');
            setMessage(language === 'es' ? 'Contraseña actualizada correctamente. Redirigiendo...' : 'Password updated successfully. Redirecting...');
            
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (error: any) {
            console.error("Reset error:", error);
            setStatus('error');
            setMessage(language === 'es' ? 'Error al actualizar la contraseña. Es posible que el enlace haya expirado.' : 'Error updating password. The link might have expired.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="card-premium w-full max-w-md p-6 md:p-8 text-center animate-in fade-in zoom-in duration-500">
                <div className="mb-4 flex justify-center">
                    <div className="inline-flex justify-center w-full">
                        <img src="/logo-sidebar.png" alt="L1NX Logo" className="w-[80%] h-auto max-h-40 object-contain" />
                    </div>
                </div>
                
                <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight mb-2">
                    {language === 'es' ? 'Nueva Contraseña' : 'New Password'}
                </h1>
                
                {status === 'success' ? (
                    <div className="mt-6 flex flex-col items-center animate-in zoom-in duration-300">
                        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-4">
                            <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <p className="text-slate-800 font-bold text-lg">{message}</p>
                        <p className="text-slate-500 mt-2">
                            {language === 'es' ? 'Serás redirigido al inicio de sesión en unos segundos...' : 'You will be redirected to login in a few seconds...'}
                        </p>
                    </div>
                ) : (
                    <>
                        <p className="text-slate-500 mb-6">
                            {language === 'es' ? 'Ingresa tu nueva contraseña para acceder a tu cuenta.' : 'Enter your new password to access your account.'}
                        </p>
                        
                        <form onSubmit={handleSubmit} className="space-y-4 text-left">
                            {status === 'error' && (
                                <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-center gap-3 border border-red-200 text-sm font-medium">
                                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                    {message}
                                </div>
                            )}
                            
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">
                                    {language === 'es' ? 'Nueva Contraseña' : 'New Password'}
                                </label>
                                <input 
                                    type="password" 
                                    required
                                    placeholder="••••••••"
                                    className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-3 px-4 text-slate-800 outline-none transition-all"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    disabled={status === 'loading'}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">
                                    {language === 'es' ? 'Confirmar Contraseña' : 'Confirm Password'}
                                </label>
                                <input 
                                    type="password" 
                                    required
                                    placeholder="••••••••"
                                    className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-3 px-4 text-slate-800 outline-none transition-all"
                                    value={passwordConfirm}
                                    onChange={e => setPasswordConfirm(e.target.value)}
                                    disabled={status === 'loading'}
                                />
                            </div>
                            
                            <button 
                                type="submit" 
                                disabled={status === 'loading'}
                                className="w-full bg-primary hover:bg-[#D98201] text-white py-4 mt-6 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-md shadow-primary/20"
                            >
                                {status === 'loading' ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <Lock className="w-5 h-5" /> {language === 'es' ? 'Restablecer Contraseña' : 'Reset Password'}
                                    </>
                                )}
                            </button>
                        </form>
                    </>
                )}

                {!status.includes('success') && (
                    <div className="mt-6 pt-6 border-t border-slate-100">
                        <Link to="/login" className="text-slate-500 hover:text-slate-800 font-bold transition-colors">
                            {language === 'es' ? 'Volver al inicio de sesión' : 'Back to login'}
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
