import { useState, useEffect, useRef } from 'react';
import { Loader2, UploadCloud, Trash2, Image as ImageIcon, Video, FileVideo, Plus } from 'lucide-react';
import { pb, type Media } from '../lib/pocketbase';

export default function MediaLibrary() {
    const [mediaList, setMediaList] = useState<Media[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchMedia = async () => {
        setIsLoading(true);
        try {
            const records = await pb.collection('media').getFullList<Media>({
                sort: '-created',
            });
            setMediaList(records);
        } catch (error) {
            console.error('Error fetching media:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMedia();
    }, []);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];

        setIsUploading(true);
        setUploadProgress(0);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('name', file.name);

            // Fake progress since pocketbase fetch doesn't expose axios-like progress natively easily in standard get/post
            const interval = setInterval(() => {
                setUploadProgress(prev => (prev >= 90 ? 90 : prev + 10));
            }, 200);

            await pb.collection('media').create(formData);

            clearInterval(interval);
            setUploadProgress(100);

            setTimeout(() => {
                fetchMedia();
                setIsUploading(false);
                setUploadProgress(0);
            }, 500);

        } catch (error) {
            console.error('Error uploading file:', error);
            alert('Error al subir el archivo.');
            setIsUploading(false);
            setUploadProgress(0);
        } finally {
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (window.confirm(`¿Estás seguro de eliminar el archivo "${name}"? Esta acción no se puede deshacer y podría afectar las pantallas configuradas con este archivo.`)) {
            try {
                // Set loading state for specific item could be done, but a full refresh is safer for now
                await pb.collection('media').delete(id);
                fetchMedia();
            } catch (error) {
                console.error("Error deleting media:", error);
                alert("Error al eliminar el archivo.");
            }
        }
    };

    const isVideo = (filename: string) => {
        return filename.toLowerCase().endsWith('.mp4');
    };

    return (
        <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-500 max-w-6xl mx-auto w-full">
            <header className="flex flex-col sm:flex-row items-center justify-between gap-4 glass bg-white/70 p-6 rounded-3xl m-2">
                <div>
                    <h1 className="text-3xl font-black text-text-primary tracking-tight">Multimedios</h1>
                    <p className="text-sm font-medium text-slate-500 mt-1">Sube imágenes y videos para asignarlos a tus grupos de pantallas.</p>
                </div>

                <div className="flex items-center gap-4">
                    <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*,video/mp4"
                        onChange={handleFileUpload}
                        className="hidden"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="bg-primary hover:bg-[#D98201] text-white px-6 py-3 rounded-xl font-bold transition-all shadow-md flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isUploading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Subiendo... {uploadProgress}%
                            </>
                        ) : (
                            <>
                                <UploadCloud className="w-5 h-5" />
                                Subir Nuevo
                            </>
                        )}
                    </button>
                </div>
            </header>

            <main className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 p-2">
                {isLoading ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="w-12 h-12 text-primary animate-spin" />
                        <p className="text-slate-500 font-medium">Cargando biblioteca...</p>
                    </div>
                ) : mediaList.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 glass bg-white/50 rounded-3xl border-2 border-dashed border-slate-200">
                        <div className="bg-primary/10 p-4 rounded-2xl mb-4">
                            <ImageIcon className="w-12 h-12 text-primary" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800">No hay archivos</h2>
                        <p className="text-slate-500 text-sm mt-1 mb-6 text-center max-w-sm">
                            Sube tu primera imagen o video publicitario para poder usarlo en las pantallas.<br />
                            <span className="text-xs">(Recomendados: .jpg, .png para imágenes. .mp4 optimizado para video)</span>
                        </p>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-white border-2 border-primary text-primary hover:bg-primary/5 px-6 py-2 rounded-xl font-bold transition-all flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" /> Seleccionar Archivo
                        </button>
                    </div>
                ) : (
                    mediaList.map((media) => {
                        const fileUrl = pb.files.getURL(media, media.file);
                        const videoFile = isVideo(media.file);

                        return (
                            <div key={media.id} className="glass bg-white rounded-2xl overflow-hidden group hover:shadow-xl hover:shadow-primary/10 transition-all border border-slate-100 flex flex-col">
                                <div className="aspect-video bg-slate-100 relative overflow-hidden flex items-center justify-center">
                                    {videoFile ? (
                                        <>
                                            <video src={`${fileUrl}#t=0.1`} className="w-full h-full object-cover" muted preload="metadata" />
                                            <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md rounded px-2 py-1 flex items-center gap-1">
                                                <Video className="w-3 h-3 text-white" />
                                                <span className="text-[10px] text-white font-bold uppercase">Video</span>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <img src={fileUrl} alt={media.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                            <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md rounded px-2 py-1 flex items-center gap-1">
                                                <ImageIcon className="w-3 h-3 text-white" />
                                                <span className="text-[10px] text-white font-bold uppercase">Imagen</span>
                                            </div>
                                        </>
                                    )}

                                    {/* Mover el botón de borrar aquí para que aparezca al hacer hover sobre la imagen referenciada */}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                                        <button
                                            onClick={() => handleDelete(media.id, media.name)}
                                            className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-xl shadow-lg transform hover:scale-110 transition-all"
                                            title="Eliminar archivo"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                        {videoFile && (
                                            <a
                                                href={fileUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-xl shadow-lg transform hover:scale-110 transition-all"
                                                title="Ver archivo original"
                                            >
                                                <FileVideo className="w-5 h-5" />
                                            </a>
                                        )}
                                    </div>
                                </div>
                                <div className="p-4 bg-white z-10">
                                    <p className="font-semibold text-slate-800 truncate text-sm" title={media.name}>
                                        {media.name}
                                    </p>
                                    <p className="text-[10px] text-slate-400 mt-1 uppercase font-medium">
                                        ID: {media.id}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}
            </main>
        </div>
    );
}
