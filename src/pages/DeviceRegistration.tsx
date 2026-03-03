import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2, Link as LinkIcon, CheckCircle2, AlertCircle, Smartphone, Folder, ArrowLeft } from 'lucide-react';
import { pb } from '../lib/pocketbase';
import { Link } from 'react-router-dom';

interface RegistrationInputs {
    pairing_code: string;
    name: string;
    group: string;
}

interface DeviceGroup {
    id: string;
    name: string;
}

export default function DeviceRegistration() {
    const [groups, setGroups] = useState<DeviceGroup[]>([]);
    const [isRegistering, setIsRegistering] = useState(false);
    const [errorStatus, setErrorStatus] = useState<string | null>(null);
    const [successStatus, setSuccessStatus] = useState<string | null>(null);

    const { register, handleSubmit, reset, formState: { errors } } = useForm<RegistrationInputs>();

    useEffect(() => {
        const fetchGroups = async () => {
            try {
                const records = await pb.collection('device_groups').getFullList<DeviceGroup>();
                setGroups(records);
            } catch (err) {
                console.error("Error fetching groups:", err);
            }
        };
        fetchGroups();
    }, []);

    const onSubmit = async (data: RegistrationInputs) => {
        setIsRegistering(true);
        setErrorStatus(null);
        setSuccessStatus(null);

        try {
            const cleanCode = data.pairing_code.trim().toUpperCase();

            const records = await pb.collection('devices').getList(1, 1, {
                filter: `pairing_code = "${cleanCode}"`,
            });

            if (records.items.length === 0) {
                throw new Error("Código no encontrado. Asegúrate de que la PWA está mostrando ese código.");
            }

            const device = records.items[0];

            if (device.is_registered) {
                throw new Error("Este código ya ha sido utilizado para registrar un dispositivo.");
            }

            await pb.collection('devices').update(device.id, {
                name: data.name,
                group: data.group,
                is_registered: true
            });

            setSuccessStatus(`¡Dispositivo "${data.name}" vinculado exitosamente!`);
            reset();
        } catch (err: any) {
            setErrorStatus(err.message || "Error al vincular el dispositivo.");
        } finally {
            setIsRegistering(false);
        }
    };

    return (
        <div className="flex flex-col items-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
            <div className="w-full max-w-xl mx-auto flex flex-col items-start gap-6 mb-8">
                <Link
                    to="/devices"
                    className="flex items-center gap-2 text-slate-500 hover:text-primary font-medium transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Screens
                </Link>

                <div className="text-left w-full">
                    <h1 className="text-4xl font-bold text-slate-800 mb-2 tracking-tight">
                        Vincular Nueva Pantalla
                    </h1>
                    <p className="text-slate-500 text-lg">
                        Ingrese el código que aparece en su dispositivo PWA para autorizarlo y asignarlo a un grupo.
                    </p>
                </div>
            </div>

            <div className="w-full max-w-xl mx-auto space-y-6">
                <div className="bg-white/80 p-8 rounded-2xl glass text-left relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Smartphone className="w-24 h-24 text-slate-900" />
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 relative z-10">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-text-primary flex items-center gap-2 uppercase tracking-wide">
                                <LinkIcon className="w-4 h-4 text-primary" /> Código de Vinculación
                            </label>
                            <input
                                type="text"
                                maxLength={6}
                                placeholder="ABC123"
                                className="w-full bg-slate-100 border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-4 px-5 text-2xl font-mono font-bold text-center tracking-widest text-slate-800 outline-none uppercase"
                                {...register("pairing_code", { required: "Código requerido" })}
                            />
                            {errors.pairing_code && <p className="text-red-500 text-xs font-medium">{errors.pairing_code.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-text-primary uppercase tracking-wide">
                                Nombre del Dispositivo
                            </label>
                            <input
                                type="text"
                                placeholder="Ej: Pantalla Recepción"
                                className="w-full bg-slate-50 border border-slate-200 focus:border-primary rounded-xl py-3 px-4 text-slate-800 outline-none"
                                {...register("name", { required: "Nombre requerido" })}
                            />
                            {errors.name && <p className="text-red-500 text-xs font-medium">{errors.name.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-text-primary flex items-center gap-2 uppercase tracking-wide">
                                <Folder className="w-4 h-4 text-primary" /> Asignar a Grupo
                            </label>
                            <select
                                className="w-full bg-slate-50 border border-slate-200 focus:border-primary rounded-xl py-3 px-4 text-slate-800 outline-none cursor-pointer"
                                {...register("group", { required: "Seleccione un grupo" })}
                            >
                                <option value="">Seleccione...</option>
                                {groups.map(g => (
                                    <option key={g.id} value={g.id}>{g.name}</option>
                                ))}
                            </select>
                            {errors.group && <p className="text-red-500 text-xs font-medium">{errors.group.message}</p>}
                        </div>

                        {errorStatus && (
                            <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-center gap-3 border border-red-200">
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

                        <button
                            type="submit"
                            disabled={isRegistering}
                            className="w-full bg-primary hover:bg-[#D98201] text-white py-4 px-6 rounded-xl font-bold flex items-center justify-center gap-3 transition-all disabled:opacity-50 uppercase tracking-wider"
                        >
                            {isRegistering ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle2 className="w-6 h-6" />}
                            {isRegistering ? "Vinculando..." : "Vincular Dispositivo"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
