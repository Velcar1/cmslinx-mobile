import ConfigForm from '../components/ConfigForm';

export default function DashboardHome() {
    return (
        <div className="flex flex-col items-center mb-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight drop-shadow-md">
                Configuración PWA
            </h1>
            <p className="text-blue-100 max-w-2xl text-lg opacity-90 mx-auto mb-8">
                Administre la experiencia del usuario y recursos dinámicos.
            </p>

            <div className="w-full text-left">
                <ConfigForm />
            </div>
        </div>
    );
}
