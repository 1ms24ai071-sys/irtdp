import { ReactNode } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen text-cream font-mono relative overflow-hidden flex flex-col" style={{ background: '#010828' }}>
      <div className="texture-overlay pointer-events-none fixed inset-0 opacity-20" aria-hidden />
      <div className="blob w-96 h-96 top-0 -left-32 fixed blur-[100px] opacity-20 pointer-events-none rounded-full" style={{ background: '#6FFF00' }} aria-hidden />
      <div className="blob w-80 h-80 bottom-0 right-0 fixed blur-[100px] opacity-20 pointer-events-none rounded-full" style={{ background: '#1a3aff' }} aria-hidden />
      <main className="flex-1 relative z-10 flex flex-col">
        {children}
      </main>
    </div>
  );
}
