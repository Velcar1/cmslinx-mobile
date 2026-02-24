import ConfigForm from './components/ConfigForm';

function App() {
  return (
    <div className="min-h-screen bg-slate-100 bg-gradient-brand text-slate-800 pb-16">

      {/* Decorative background shapes */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -right-[5%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[100px]" />
        <div className="absolute top-[60%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-500/20 blur-[120px]" />
      </div>

      <header className="w-full bg-white/10 backdrop-blur-md border-b border-white/20 relative z-10 sticky top-0">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="https://gtf-sap-repo.s3.us-east-1.amazonaws.com/images/l1nx/logo2-L1NX-azulnaranja%2B(2).png"
              alt="LINX Logo"
              className="h-10 object-contain drop-shadow-sm bg-white p-1 rounded backdrop-blur-md"
            />
            <span className="text-white font-bold tracking-tight text-xl ml-2 hidden sm:block border-l border-white/30 pl-4 py-1">Panel de Control</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-16 mt-8 relative z-10">

        <div className="flex flex-col items-center mb-12 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight drop-shadow-md">
            Configuración PWA
          </h1>
          <p className="text-blue-100 max-w-2xl text-lg opacity-90 mx-auto">
            Administre la experiencia del usuario y recursos dinámicos.
          </p>
        </div>

        <ConfigForm />

      </main>

    </div>
  );
}

export default App;
