import { useLanguage } from '../context/LanguageContext';
import { Globe, Shield, Monitor, Bell, Palette } from 'lucide-react';

export default function Settings() {
    const { language, setLanguage, t } = useLanguage();

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
                {/* Language Selection Card */}
                <div className="lg:col-span-2 space-y-6">
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
