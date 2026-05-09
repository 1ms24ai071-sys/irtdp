export default function AboutSection() {
  return (
    <div className="mb-8 p-6 bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm">
      <h2 className="text-xl font-grotesk text-neon mb-4">About IRTDP</h2>
      <p className="text-cream/70 font-mono text-sm leading-relaxed">
        Incident Reporting & Tracking Detection Platform is a real-time system that correlates incoming
        incident reports to compute drift parameters, trajectory forecasts, and dynamic hotspot evolution.
        All data is securely handled through an encrypted microservice infrastructure.
      </p>
    </div>
  );
}
