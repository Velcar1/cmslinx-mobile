import { useState, useEffect, useRef } from 'react';
import { Loader2, UploadCloud, Trash2, Image as ImageIcon, Video, FileVideo, Building2 } from 'lucide-react';
import { pb, type Media } from '../lib/pocketbase';
import { useOrganization } from '../context/OrganizationContext';
import { useAuth } from '../context/AuthContext';

export default function MediaLibrary() {
    const [mediaList, setMediaList] = useState<Media[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const { activeOrganization } = useOrganization();
    const { hasPermission } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const canManageContent = hasPermission('manage_content');

    const fetchMedia = async () => {
        if (!activeOrganization) {
            setMediaList([]);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const records = await pb.collection('media').getFullList<Media>({
                sort: '-created',
                filter: `organization = "${activeOrganization.id}"`,
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
    }, [activeOrganization]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];

        setIsUploading(true);
        setUploadProgress(0);

        try {
            if (!activeOrganization) throw new Error("No hay una organización seleccionada.");

            const formData = new FormData();
            formData.append('file', file);
            formData.append('name', file.name);
            formData.append('organization', activeOrganization.id);

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
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Media Library</h1>
                    <p className="text-slate-500 mt-1">Manage your images and videos for screen broadcasting.</p>
                </div>

                {canManageContent && (
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
                            className="btn-primary flex items-center justify-center gap-2 min-w-[160px]"
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>{uploadProgress}%</span>
                                </>
                            ) : (
                                <>
                                    <UploadCloud className="w-5 h-5" />
                                    <span>Upload Media</span>
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>

            {isUploading && (
                <div className="card-premium border-primary/20 bg-primary/5 py-4 animate-in slide-in-from-top-4">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-bold text-primary italic">Uploading asset...</span>
                        <span className="text-sm font-bold text-primary">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                            className="bg-primary h-full transition-all duration-300 ease-out"
                            style={{ width: `${uploadProgress}%` }}
                        />
                    </div>
                </div>
            )}

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="w-12 h-12 text-primary animate-spin" />
                    <p className="text-slate-500 font-medium">Loading library...</p>
                </div>
            ) : !activeOrganization ? (
                <div className="card-premium flex flex-col items-center justify-center py-20 bg-slate-50/50 border-dashed">
                    <div className="bg-slate-200 p-6 rounded-3xl mb-4 text-slate-400">
                        <Building2 className="w-12 h-12" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">No hay empresa seleccionada</h3>
                    <p className="text-slate-500 mt-2">Por favor, selecciona o crea una empresa en el menú lateral.</p>
                </div>
            ) : mediaList.length === 0 ? (
                <div className="card-premium flex flex-col items-center justify-center py-20 bg-slate-50/50 border-dashed">
                    <div className="bg-slate-200 p-6 rounded-3xl mb-4 text-slate-400">
                        <ImageIcon className="w-12 h-12" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">No media found</h3>
                    <p className="text-slate-500 mt-2 mb-8">Upload your first image or video to start broadcasting.</p>
                    {canManageContent && (
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="btn-primary"
                        >
                            Add Media
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {mediaList.map((media) => {
                        const fileUrl = pb.files.getURL(media, media.file);
                        const videoFile = isVideo(media.file);

                        return (
                            <div key={media.id} className="card-premium !p-0 group overflow-hidden flex flex-col hover:border-primary/30 transition-all">
                                <div className="aspect-video bg-slate-50 relative overflow-hidden flex items-center justify-center">
                                    {videoFile ? (
                                        <>
                                            <video src={`${fileUrl}#t=0.1`} className="w-full h-full object-cover" muted preload="metadata" />
                                            <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-md rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 border border-white/10">
                                                <Video className="w-3.5 h-3.5 text-white" />
                                                <span className="text-[10px] text-white font-bold uppercase tracking-wider">Video</span>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <img src={fileUrl} alt={media.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                            <div className="absolute top-3 left-3 bg-white/80 backdrop-blur-md rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 border border-white/20">
                                                <ImageIcon className="w-3.5 h-3.5 text-slate-800" />
                                                <span className="text-[10px] text-slate-800 font-bold uppercase tracking-wider">Image</span>
                                            </div>
                                        </>
                                    )}

                                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-3 backdrop-blur-[2px]">
                                        {canManageContent && (
                                            <button
                                                onClick={() => handleDelete(media.id, media.name)}
                                                className="bg-white hover:bg-red-50 text-red-500 p-3 rounded-2xl shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-all duration-300"
                                                title="Delete media"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        )}
                                        <a
                                            href={fileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="bg-primary hover:bg-[#D98201] text-white p-3 rounded-2xl shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 delay-75"
                                            title="View Original"
                                        >
                                            <FileVideo className="w-5 h-5" />
                                        </a>
                                    </div>
                                </div>
                                <div className="p-5 border-t border-slate-50 bg-white">
                                    <p className="font-bold text-slate-800 truncate text-sm mb-1" title={media.name}>
                                        {media.name}
                                    </p>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] text-slate-400 font-mono">
                                            {media.id}
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded">
                                            {videoFile ? 'MP4' : 'STATIC'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
