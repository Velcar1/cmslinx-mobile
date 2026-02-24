import { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2, Save, FileVideo, Link as LinkIcon, AlertCircle, CheckCircle2, Upload, X } from 'lucide-react';
import { pb, type PWAConfig } from '../lib/pocketbase';

export default function ConfigForm() {
    const [configId, setConfigId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [errorStatus, setErrorStatus] = useState<string | null>(null);
    const [successStatus, setSuccessStatus] = useState<string | null>(null);
    const [currentVideoFilename, setCurrentVideoFilename] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const { register, handleSubmit, reset, formState: { errors } } = useForm<{
        redirect_url: string;
    }>();

    useEffect(() => {
        async function loadConfig() {
            try {
                const record = await pb.collection('pwa_config').getFirstListItem<PWAConfig>('');

                if (record) {
                    setConfigId(record.id);
                    setCurrentVideoFilename(record.video_url);
                    reset({
                        redirect_url: record.redirect_url,
                    });
                }
            } catch (err: any) {
                if (err.isAbort) return;

                if (err.status === 404) {
                    setErrorStatus("No se encontró la configuración. Guarde para crear una nueva.");
                } else {
                    setErrorStatus("Error de conexión con PocketBase. Asegúrese de que el servidor está corriendo.");
                    console.error("PocketBase connection error:", err);
                }
            } finally {
                setIsLoading(false);
            }
        }
        loadConfig();
    }, [reset]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const removeSelectedFile = () => {
        setSelectedFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const onSubmit = async (data: { redirect_url: string }) => {
        setIsSaving(true);
        setErrorStatus(null);
        setSuccessStatus(null);

        try {
            const formData = new FormData();
            formData.append('redirect_url', data.redirect_url);

            if (selectedFile) {
                formData.append('video_url', selectedFile);
            }

            let record;
            if (configId) {
                // Update existing record
                record = await pb.collection('pwa_config').update(configId, formData);
            } else {
                // Create new record
                // Handle case where no file is selected for a new record if it's required
                if (!selectedFile) {
                    throw new Error("Se requiere un video para crear una nueva configuración.");
                }
                record = await pb.collection('pwa_config').create(formData);
                setConfigId(record.id);
            }

            setCurrentVideoFilename(record.video_url);
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';

            setSuccessStatus("Configuración guardada exitosamente.");
        } catch (err: any) {
            setErrorStatus(err.message || "Error al guardar la configuración.");
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
                <p className="text-slate-500 text-sm mt-1">Cargue el video y ajuste la redirección de la campaña a continuación.</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6 mt-4">

                {/* Video Upload */}
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-text-primary ml-1 flex items-center gap-2">
                        Video en bucle (video_url)
                    </label>

                    <div className="space-y-3">
                        {/* Current file display */}
                        {currentVideoFilename && !selectedFile && (
                            <div className="flex items-center gap-3 p-3 bg-blue-50/50 border border-blue-100 rounded-xl text-text-primary">
                                <FileVideo className="w-5 h-5 text-blue-500" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-blue-400 font-medium uppercase tracking-wider">Archivo actual</p>
                                    <p className="text-sm truncate font-medium">{currentVideoFilename}</p>
                                </div>
                            </div>
                        )}

                        {/* Selected file preview */}
                        {selectedFile && (
                            <div className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-100 rounded-xl text-text-primary animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <FileVideo className="w-5 h-5 text-primary" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-primary font-medium uppercase tracking-wider">Nuevo archivo seleccionado</p>
                                    <p className="text-sm truncate font-medium">{selectedFile.name}</p>
                                    <p className="text-[10px] text-slate-400">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={removeSelectedFile}
                                    className="p-1 hover:bg-white rounded-full transition-colors text-slate-400 hover:text-red-500"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        )}

                        {/* Upload Button Area */}
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-xl p-6 transition-all cursor-pointer flex flex-col items-center justify-center gap-2
                ${selectedFile
                                    ? 'border-primary/30 bg-primary/5 opacity-50'
                                    : 'border-slate-200 hover:border-primary/50 hover:bg-slate-50/50'}`}
                        >
                            <Upload className={`w-8 h-8 ${selectedFile ? 'text-primary' : 'text-slate-300'}`} />
                            <div className="text-center text-sm">
                                <span className="text-primary font-semibold">Haz clic para subir</span>
                                <span className="text-slate-500 whitespace-nowrap"> un nuevo video</span>
                            </div>
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium mt-1">MP4, MOV o similar</p>

                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept="video/*"
                                className="hidden"
                            />
                        </div>
                    </div>
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

