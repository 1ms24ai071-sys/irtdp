export default function Footer() {
  return (
    <footer className="py-6 border-t border-white/10 text-center font-mono text-xs text-cream/40 relative z-10 mt-12 backdrop-blur-sm">
      <div className="flex items-center justify-center gap-2 mb-2">
        <span className="w-1.5 h-1.5 rounded-full bg-neon animate-pulse" />
        <span>IRTDP SYSTEM SECURE</span>
      </div>
      <div>© {new Date().getFullYear()} IRTDP Project</div>
    </footer>
  );
}
