import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { pb } from '../lib/pocketbase';
import { Globe, Shield, Monitor, Bell, Palette, Lock, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function Settings() {
    const { language, setLanguage, t } = useLanguage();
    const { user } = useAuth(); // Re-re-added to help with ID verification

    // Password change state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPasswords, setShowPasswords] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [updateError, setUpdateError] = useState<string | null>(null);
    const [updateSuccess, setUpdateSuccess] = useState(false);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setUpdateError(null);
        setUpdateSuccess(false);

        if (newPassword.length < 8) {
            setUpdateError(t('settings.security.passwordShort'));
            return;
        }

        if (newPassword !== confirmPassword) {
            setUpdateError(t('settings.security.passwordsNoMatch'));
            return;
        }

        setIsUpdating(true);
        try {
            const authModel = pb.authStore.model;
            if (!authModel) throw new Error("No session model found");
            
            const idToUpdate = authModel.id;
            const isRecord = 'collectionId' in authModel;

            console.log(`[Settings:Security] Updating ${isRecord ? 'user' : 'admin'} with ID: ${idToUpdate}`);

            if (isRecord) {
                // If the user record exists in an auth collection
                // Typically 'users', but using .id is sufficient for self-update usually
                await pb.collection(authModel.collectionName || 'users').update(idToUpdate, {
                    oldPassword: currentPassword,
                    password: newPassword,
                    passwordConfirm: confirmPassword,
                });
            } else {
                // If it is a system super-administrator (pb.admins)
                await pb.admins.update(idToUpdate, {
                    password: newPassword,
                    passwordConfirm: confirmPassword,
                });
            }

            console.log("[Settings:Security] SUCCESS: Password reset.");
            setUpdateSuccess(true);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            console.error("[Settings:Security] FAILED:", err);
            
            // Helpful error mapping specifically for 404 (common PB rule mismatch error)
            if (err.status === 404) {
                setUpdateError(`${t('settings.security.updateError')} (Error 404: Verifica los permisos "API Rules > Update Rule" en PocketBase para la colección 'users')`);
            } else {
                setUpdateError(t('settings.security.updateError'));
            }
        } finally {
            setIsUpdating(false);
        }
    };

    const sections = [
        {
            title: t('settings.appearance'),
            icon: Palette,
            content: (
                <div className="space-y-4">
                    <p className="text-sm text-slate-500 italic">Próximamente: Temas y personalización de colores.</p>
                </div>
            )
        },
        {
            title: t('settings.system'),
            icon: Monitor,
            content: (
                <div className="space-y-4">
                    <p className="text-sm text-slate-500 italic">Próximamente: Configuración de notificaciones y logs.</p>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 text-primary rounded-2xl">
                    <Globe className="w-8 h-8" />
                </div>
                <h1 className="text-3xl font-bold text-slate-800">{t('settings.title')}</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Settings Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Language Selection Card */}
                    <div className="card-premium">
                        <div className="flex items-center gap-3 mb-8">
                            <Globe className="w-5 h-5 text-primary" />
                            <h2 className="text-xl font-bold text-slate-800">{t('settings.language')}</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button
                                onClick={() => setLanguage('es')}
                                className={`flex items-center justify-between p-6 rounded-2xl border-2 transition-all group ${
                                    language === 'es' 
                                    ? 'border-primary bg-primary/5 shadow-md' 
                                    : 'border-slate-100 hover:border-slate-200 bg-white'
                                }`}
                            >
                                <div className="flex items-center gap-4">
                                    <span className="text-2xl">🇪🇸</span>
                                    <div className="text-left">
                                        <p className={`font-bold ${language === 'es' ? 'text-primary' : 'text-slate-800'}`}>
                                            {t('settings.spanish')}
                                        </p>
                                        <p className="text-xs text-slate-500">Seleccionar Español</p>
                                    </div>
                                </div>
                                {language === 'es' && (
                                    <div className="w-2 h-2 rounded-full bg-primary" />
                                )}
                            </button>

                            <button
                                onClick={() => setLanguage('en')}
                                className={`flex items-center justify-between p-6 rounded-2xl border-2 transition-all group ${
                                    language === 'en' 
                                    ? 'border-primary bg-primary/5 shadow-md' 
                                    : 'border-slate-100 hover:border-slate-200 bg-white'
                                }`}
                            >
                                <div className="flex items-center gap-4">
                                    <span className="text-2xl">🇺🇸</span>
                                    <div className="text-left">
                                        <p className={`font-bold ${language === 'en' ? 'text-primary' : 'text-slate-800'}`}>
                                            {t('settings.english')}
                                        </p>
                                        <p className="text-xs text-slate-500">Select English</p>
                                    </div>
                                </div>
                                {language === 'en' && (
                                    <div className="w-2 h-2 rounded-full bg-primary" />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Change Password Card */}
                    <div className="card-premium">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <Lock className="w-5 h-5 text-primary" />
                                <h2 className="text-xl font-bold text-slate-800">{t('settings.security.title')}</h2>
                            </div>
                            <button 
                                type="button"
                                onClick={() => setShowPasswords(!showPasswords)}
                                className="text-slate-400 hover:text-primary transition-colors p-2"
                                title={showPasswords ? "Hide" : "Show"}
                            >
                                {showPasswords ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>

                        <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-md">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">
                                    {t('settings.security.currentPassword')}
                                </label>
                                <input 
                                    type={showPasswords ? "text" : "password"}
                                    value={currentPassword}
                                    onChange={e => setCurrentPassword(e.target.value)}
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-3 px-4 text-slate-800 outline-none transition-all text-sm"
                                    placeholder="••••••••"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 min-h-[32px] flex items-end pb-1">
                                        {t('settings.security.newPassword')}
                                    </label>
                                    <input 
                                        type={showPasswords ? "text" : "password"}
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        required
                                        className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-3 px-4 text-slate-800 outline-none transition-all text-sm"
                                        placeholder="Min 8 caracteres"
                                    />
                                </div>
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 min-h-[32px] flex items-end pb-1">
                                        {t('settings.security.confirmPassword')}
                                    </label>
                                    <input 
                                        type={showPasswords ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        required
                                        className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-3 px-4 text-slate-800 outline-none transition-all text-sm"
                                        placeholder="Repetir..."
                                    />
                                </div>
                            </div>

                            {updateError && (
                                <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-center gap-3 border border-red-200 text-xs font-medium animate-in fade-in duration-300">
                                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                    {updateError}
                                </div>
                            )}

                            {updateSuccess && (
                                <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl flex items-center gap-3 border border-emerald-200 text-xs font-medium animate-in fade-in duration-300">
                                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                                    {t('settings.security.updateSuccess')}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isUpdating || !currentPassword || !newPassword || !confirmPassword}
                                className="bg-primary hover:bg-[#D98201] text-white px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                            >
                                {isUpdating ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        {t('common.loading')}
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-4 h-4" />
                                        {t('settings.security.changePassword')}
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    {/* Placeholder Sections */}
                    {sections.map((section, idx) => (
                        <div key={idx} className="card-premium opacity-60 grayscale-[0.5]">
                            <div className="flex items-center gap-3 mb-6">
                                <section.icon className="w-5 h-5 text-slate-400" />
                                <h2 className="text-xl font-bold text-slate-700">{section.title}</h2>
                            </div>
                            {section.content}
                        </div>
                    ))}
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    <div className="card-premium bg-slate-900 text-white border-none shadow-xl">
                        <div className="flex items-center gap-3 mb-4">
                            <Shield className="w-5 h-5 text-primary" />
                            <h3 className="font-bold uppercase tracking-wider text-xs text-slate-400">Security</h3>
                        </div>
                        <p className="text-sm text-slate-300 leading-relaxed">
                            Tus ajustes se guardan localmente en este dispositivo. Algunos cambios pueden requerir reiniciar la aplicación.
                            <br /><br />
                            <span className="text-slate-500 font-bold uppercase text-[10px]">Recomendación:</span> Usa contraseñas fuertes y no las compartas con terceros.
                        </p>
                    </div>

                    <div className="p-6 rounded-3xl bg-primary/5 border border-primary/10">
                        <div className="flex items-center gap-3 mb-3">
                            <Bell className="w-5 h-5 text-primary" />
                            <h3 className="font-bold text-slate-800">Support</h3>
                        </div>
                        <p className="text-sm text-slate-500">
                            Si encuentras errores de traducción o quieres reportar un problema, contacta con el administrador.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
