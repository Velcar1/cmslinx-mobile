import { useState, useEffect } from 'react';
import { Folder, MonitorPlay, CalendarClock, ArrowLeft } from 'lucide-react';
import { pb } from '../lib/pocketbase';
import { useOrganization } from '../context/OrganizationContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import ConfigForm from '../components/ConfigForm';
import { useNavigate } from 'react-router-dom';

export default function Publish() {
    const { language } = useLanguage();
    const { activeOrganization } = useOrganization();
    const { hasPermission } = useAuth();
    const navigate = useNavigate();

    const [publishStep, setPublishStep] = useState<'select_group' | 'select_type' | 'configure'>('select_group');
    const [publishGroupId, setPublishGroupId] = useState('');
    const [publishType, setPublishType] = useState<'now' | 'schedule'>('now');
    const [groups, setGroups] = useState<{ id: string, name: string }[]>([]);

    useEffect(() => {
        if (!activeOrganization) return;
        const fetchGroups = async () => {
            try {
                const records = await pb.collection('device_groups').getFullList({
                    filter: `organization = "${activeOrganization.id}"`
                });
                setGroups(records as any);
            } catch (error) {
                console.error('Error fetching groups:', error);
            }
        };
        fetchGroups();
    }, [activeOrganization]);

    if (!hasPermission('manage_content')) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <p className="text-slate-500 font-medium">No permissions to manage content.</p>
            </div>
        );
    }

    const handleSuccess = () => {
        alert(language === 'es' ? 'Contenido publicado exitosamente.' : 'Content published successfully.');
        navigate('/groups'); 
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-black text-slate-800 tracking-tight">
                        {language === 'es' ? 'Publicar Contenido' : 'Publish Content'}
                    </h1>
                    <p className="text-slate-500 font-medium mt-2 text-lg">
                        {language === 'es' ? 'Asigna listas, medios web o videos a tus grupos de pantallas.' : 'Assign playlists, web media, or videos to your screen groups.'}
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                {/* Stepper Progress */}
                <div className="flex items-center mb-10 pb-6 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${publishStep === 'select_group' ? 'bg-indigo-600 text-white shadow-md' : 'bg-indigo-100 text-indigo-600'}`}>1</div>
                        <span className={`font-bold ${publishStep === 'select_group' ? 'text-slate-800' : 'text-slate-400'}`}>{language === 'es' ? 'Grupo' : 'Group'}</span>
                    </div>
                    <div className="flex-1 h-1 bg-slate-100 mx-4 rounded-full overflow-hidden">
                        <div className={`h-full bg-indigo-500 transition-all duration-500 ${publishStep !== 'select_group' ? 'w-full' : 'w-0'}`}></div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${publishStep === 'select_type' ? 'bg-indigo-600 text-white shadow-md' : (publishStep === 'configure' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400')}`}>2</div>
                        <span className={`font-bold ${publishStep === 'select_type' ? 'text-slate-800' : 'text-slate-400'}`}>{language === 'es' ? 'Tipo' : 'Type'}</span>
                    </div>
                    <div className="flex-1 h-1 bg-slate-100 mx-4 rounded-full overflow-hidden">
                         <div className={`h-full bg-indigo-500 transition-all duration-500 ${publishStep === 'configure' ? 'w-full' : 'w-0'}`}></div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${publishStep === 'configure' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}>3</div>
                        <span className={`font-bold ${publishStep === 'configure' ? 'text-slate-800' : 'text-slate-400'}`}>{language === 'es' ? 'Contenido' : 'Content'}</span>
                    </div>
                </div>

                {publishStep === 'select_group' && (
                    <div className="max-w-xl mx-auto space-y-8 animate-in slide-in-from-right-8 duration-300">
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-slate-800 mb-2">{language === 'es' ? '¿A qué grupo deseas publicar?' : 'Which group do you want to publish to?'}</h2>
                            <p className="text-slate-500">{language === 'es' ? 'Selecciona el grupo de pantallas destino.' : 'Select the target screen group.'}</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {groups.length === 0 ? (
                                <p className="col-span-2 text-center py-8 text-slate-400 font-medium">{language === 'es' ? 'No se encontraron grupos.' : 'No groups found.'}</p>
                            ) : groups.map(g => (
                                <button
                                    key={g.id}
                                    onClick={() => setPublishGroupId(g.id)}
                                    className={`p-6 rounded-2xl border-2 text-left transition-all flex items-center gap-4 ${publishGroupId === g.id ? 'border-indigo-500 bg-indigo-50 shadow-md transform scale-[1.02]' : 'border-slate-100 hover:border-indigo-200 hover:bg-slate-50'}`}
                                >
                                    <div className={`p-3 rounded-full ${publishGroupId === g.id ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                        <Folder className="w-6 h-6" />
                                    </div>
                                    <span className="font-bold text-lg text-slate-800">{g.name}</span>
                                </button>
                            ))}
                        </div>

                        <div className="flex justify-end pt-4">
                            <button
                                onClick={() => setPublishStep('select_type')}
                                disabled={!publishGroupId}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-4 px-10 font-bold disabled:opacity-50 transition-colors shadow-lg shadow-indigo-200"
                            >
                                {language === 'es' ? 'Siguiente Paso' : 'Next Step'}
                            </button>
                        </div>
                    </div>
                )}

                {publishStep === 'select_type' && (
                    <div className="max-w-xl mx-auto space-y-8 animate-in slide-in-from-right-8 duration-300">
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-slate-800 mb-2">{language === 'es' ? '¿Cómo deseas publicar?' : 'How do you want to publish?'}</h2>
                            <p className="text-slate-500">{language === 'es' ? 'Elige si será inmediato o programado para una fecha.' : 'Choose immediate or scheduled publishing.'}</p>
                        </div>

                        <div className="space-y-4">
                            <button
                                onClick={() => { setPublishType('now'); setPublishStep('configure'); }}
                                className="w-full flex items-center gap-5 p-6 rounded-2xl border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left group shadow-sm hover:shadow-md"
                            >
                                <div className="bg-indigo-100 p-4 rounded-full text-indigo-600 group-hover:bg-indigo-200 transition-colors">
                                    <MonitorPlay className="w-8 h-8" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-xl text-slate-800 mb-1">{language === 'es' ? 'Publicar ahora' : 'Publish now'}</h4>
                                    <p className="text-sm text-slate-500">{language === 'es' ? 'Reemplaza el contenido base del grupo inmediatamente.' : 'Replaces the base group content immediately.'}</p>
                                </div>
                            </button>
                            
                            <button
                                onClick={() => { setPublishType('schedule'); setPublishStep('configure'); }}
                                className="w-full flex items-center gap-5 p-6 rounded-2xl border-2 border-slate-100 hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left group shadow-sm hover:shadow-md"
                            >
                                <div className="bg-emerald-100 p-4 rounded-full text-emerald-600 group-hover:bg-emerald-200 transition-colors">
                                    <CalendarClock className="w-8 h-8" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-xl text-slate-800 mb-1">{language === 'es' ? 'Programar publicación' : 'Schedule publication'}</h4>
                                    <p className="text-sm text-slate-500">{language === 'es' ? 'Crea un evento temporal con fecha de inicio y fin.' : 'Creates a temporary event with start and end dates.'}</p>
                                </div>
                            </button>
                        </div>

                        <div className="flex justify-start pt-4">
                            <button
                                onClick={() => setPublishStep('select_group')}
                                className="py-4 px-6 text-slate-500 font-bold hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-2"
                            >
                                <ArrowLeft className="w-5 h-5" /> {language === 'es' ? 'Atrás' : 'Back'}
                            </button>
                        </div>
                    </div>
                )}

                {publishStep === 'configure' && (
                    <div className="animate-in slide-in-from-right-8 duration-300">
                        <div className="flex items-center gap-4 mb-8">
                            <button
                                onClick={() => setPublishStep('select_type')}
                                className="p-3 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800">{language === 'es' ? 'Configurar Contenido' : 'Configure Content'}</h2>
                                <p className="text-slate-500">{publishType === 'now' ? (language === 'es' ? 'Configurando contenido base' : 'Configuring base content') : (language === 'es' ? 'Configurando nueva programación' : 'Configuring new schedule')}</p>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                            <ConfigForm 
                                forceGroupId={publishGroupId} 
                                isSchedule={publishType === 'schedule'} 
                                onSaveSuccess={handleSuccess}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
