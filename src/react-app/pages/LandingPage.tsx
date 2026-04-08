import { useNavigate } from 'react-router';
import { useWallet } from '../lib/wallet';
import { useEffect } from 'react';
import { REGISTRY_ABI, REGISTRY_ADDRESS } from '../lib/contracts';
import type { Abi } from 'viem';

export default function LandingPage() {
  const { isConnected, address, connect, disconnect, isConnecting, readContract } = useWallet();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isConnected || !address) return;

    readContract<`0x${string}`>({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI as Abi,
      functionName: 'getWill',
      args: [address],
    }).then((result) => {
      if (result && result !== '0x0000000000000000000000000000000000000000') {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/write', { replace: true });
      }
    }).catch(() => {
      navigate('/write', { replace: true });
    });
  }, [isConnected, address]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-border">
        <div className="flex items-center gap-3">
          <span className="text-gold text-xl tracking-widest font-mono">⬡</span>
          <span className="text-parchment text-lg tracking-[0.2em] uppercase font-serif">Afterchain</span>
        </div>
        {isConnected ? (
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground font-mono text-xs address-mono">
              {address?.slice(0, 6)}…{address?.slice(-4)}
            </span>
            <button
              onClick={() => disconnect()}
              className="text-muted-foreground font-mono text-xs hover:text-parchment transition-colors"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <button
            onClick={() => connect()}
            disabled={isConnecting}
            className="px-5 py-2 border border-gold text-gold font-mono text-xs tracking-widest uppercase hover:bg-gold hover:text-navy transition-colors disabled:opacity-50"
          >
            {isConnecting ? 'Connecting…' : 'Connect Wallet'}
          </button>
        )}
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center fade-in">
        <div className="max-w-2xl mx-auto">
          <p className="text-gold font-mono text-xs tracking-[0.3em] uppercase mb-8">
            Onchain Estate Protocol
          </p>
          <h1 className="text-5xl md:text-6xl font-serif font-normal text-parchment leading-tight mb-6">
            Write your crypto will<br />in plain English.
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed mb-12 max-w-lg mx-auto">
            An AI agent parses your instructions, deploys a smart contract on Etherlink,
            and executes your wishes automatically — no lawyers, no intermediaries.
          </p>

          <div className="flex flex-col items-center gap-4">
            <button
              onClick={() => connect()}
              disabled={isConnecting}
              className="px-10 py-4 bg-gold text-navy font-mono text-sm tracking-widest uppercase hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isConnecting ? 'Connecting…' : 'Connect Wallet to Begin'}
            </button>
            <p className="text-muted-foreground text-xs font-mono">
              Etherlink Ghostnet · Tezos EVM
            </p>
          </div>
        </div>
      </main>

      {/* Feature strip */}
      <footer className="border-t border-border px-8 py-8">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          {[
            { label: 'Write', desc: 'Describe your wishes in plain English' },
            { label: 'Deploy', desc: 'AI parses and deploys your will onchain' },
            { label: 'Rest', desc: 'Heartbeat liveness — executes automatically' },
          ].map((f) => (
            <div key={f.label} className="fade-in">
              <p className="text-gold font-mono text-xs tracking-[0.3em] uppercase mb-2">{f.label}</p>
              <p className="text-muted-foreground text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </footer>
    </div>
  );
}