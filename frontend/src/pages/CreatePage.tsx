import CreateIncidentForm from '../components/CreateIncidentForm';

export default function CreatePage() {
  return (
    <div className="p-4 md:p-10 flex-1 relative z-10 w-full max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="font-grotesk text-cream text-3xl uppercase tracking-wider mb-2">Report Incident</h1>
        <p className="font-mono text-cream/40 text-sm">Enter the incident details below to broadcast it to the network.</p>
      </div>
      <CreateIncidentForm onSuccess={() => window.history.back()} />
    </div>
  );
}
