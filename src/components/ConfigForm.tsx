import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2, Save, FileVideo, Link as LinkIcon, AlertCircle, CheckCircle2 } from 'lucide-react';
import { pb, type PWAConfig } from '../lib/pocketbase';

export default function ConfigForm() {
    const [configId, setConfigId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [errorStatus, setErrorStatus] = useState<string | null>(null);
    const [successStatus, setSuccessStatus] = useState<string | null>(null);

    const { register, handleSubmit, reset, formState: { errors } } = useForm<PWAConfig>();

    useEffect(() => {
        async function loadConfig() {
            try {
                // Fetch the first configuration record from the 'pwa_config' collection
                const record = await pb.collection('pwa_config').getFirstListItem<PWAConfig>('');

                if (record) {
                    setConfigId(record.id);
                    reset({
                        video_url: record.video_url,
                        redirect_url: record.redirect_url,
                    });
                }
            } catch (err: any) {
                // Ignore abort/cancellation errors which are common in React StrictMode
                if (err.isAbort) return;

                if (err.status === 404) {
                    setErrorStatus("No se encontró la configuración. Guarde para crear una nueva.");
                } else {
                    setErrorStatus("Error de conexión con PocketBase. Asegúrese de que el servidor está corriendo.");
                    console.error("PocketBase connection error:", err);
                }
            } finally {
                // Only set loading to false if not aborted
                setIsLoading(false);
            }
        }
        loadConfig();
    }, [reset]);

    const onSubmit = async (data: PWAConfig) => {
        setIsSaving(true);
        setErrorStatus(null);
        setSuccessStatus(null);

        try {
            if (configId) {
                // Update existing record
                await pb.collection('pwa_config').update(configId, {
                    video_url: data.video_url,
                    redirect_url: data.redirect_url,
                });
            } else {
                // Create new record
                const newRecord = await pb.collection('pwa_config').create({
                    video_url: data.video_url,
                    redirect_url: data.redirect_url,
                });
                setConfigId(newRecord.id);
            }
            setSuccessStatus("Configuración guardada exitosamente.");
        } catch (err: any) {
            setErrorStatus("Error al guardar la configuración.");
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="bg-white/80 p-8 rounded-2xl glass w-full max-w-2xl mx-auto flex flex-col gap-6 relative z-10">

            {errorStatus && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 border border-red-200">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm font-medium">{errorStatus}</p>
                </div>
            )}

            {successStatus && (
                <div className="bg-green-50 text-green-700 p-4 rounded-xl flex items-center gap-3 border border-green-200">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm font-medium">{successStatus}</p>
                </div>
            )}

            <div>
                <h2 className="text-2xl font-semibold text-text-primary">Configuración de la Interfaz</h2>
                <p className="text-slate-500 text-sm mt-1">Ajuste la URL del video y la redirección de la campaña a continuación.</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6 mt-4">

                {/* Video URL */}
                <div className="flex flex-col gap-2">
                    <label htmlFor="video_url" className="text-sm font-semibold text-text-primary ml-1 flex items-center gap-2">
                        Video en bucle (video_url)
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <FileVideo className="h-5 w-5" />
                        </div>
                        <input
                            id="video_url"
                            type="text"
                            placeholder="Ej: https://miservidor.com/miaudio.mp4"
                            className={`w-full bg-slate-50 border ${errors.video_url ? 'border-red-400 ring-1 ring-red-400' : 'border-border focus:border-primary focus:ring-1 focus:ring-primary'} rounded-xl py-3 pl-11 pr-4 text-slate-800 placeholder-slate-400 transition-all outline-none block`}
                            {...register("video_url", { required: "La URL del video es obligatoria." })}
                        />
                    </div>
                    {errors.video_url && <span className="text-xs text-red-500 ml-1">{errors.video_url.message}</span>}
                </div>

                {/* Redirect URL */}
                <div className="flex flex-col gap-2">
                    <label htmlFor="redirect_url" className="text-sm font-semibold text-text-primary ml-1 flex items-center gap-2">
                        URL de destino (redirect_url)
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <LinkIcon className="h-5 w-5" />
                        </div>
                        <input
                            id="redirect_url"
                            type="text"
                            placeholder="Ej: https://landing-page.com/"
                            className={`w-full bg-slate-50 border ${errors.redirect_url ? 'border-red-400 ring-1 ring-red-400' : 'border-border focus:border-primary focus:ring-1 focus:ring-primary'} rounded-xl py-3 pl-11 pr-4 text-slate-800 placeholder-slate-400 transition-all outline-none block`}
                            {...register("redirect_url", { required: "La URL de redirección es obligatoria." })}
                        />
                    </div>
                    {errors.redirect_url && <span className="text-xs text-red-500 ml-1">{errors.redirect_url.message}</span>}
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100 mt-2">
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="bg-primary hover:bg-[#D98201] text-white py-3 px-8 rounded-lg font-semibold flex items-center gap-2 transition-colors disabled:opacity-70 shadow-sm"
                    >
                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        Guardar Cambios
                    </button>
                </div>
            </form>
        </div>
    );
}
