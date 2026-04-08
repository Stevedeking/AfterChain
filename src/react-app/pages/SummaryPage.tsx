import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useWallet } from '../lib/wallet';
import type { ParsedWill, Beneficiary } from '../lib/contracts';
import WalletHeader from '../components/WalletHeader';

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function SummaryPage() {
  const { isConnected } = useWallet();
  const navigate = useNavigate();
  const [parsed, setParsed] = useState<ParsedWill | null>(null);
  const [rawInput, setRawInput] = useState('');

  useEffect(() => {
    const stored = sessionStorage.getItem('afterchain_parsed_will');
    const raw = sessionStorage.getItem('afterchain_raw_input');
    if (!stored) {
      navigate('/write');
      return;
    }
    try {
      setParsed(JSON.parse(stored) as ParsedWill);
      setRawInput(raw ?? '');
    } catch {
      navigate('/write');
    }
  }, [navigate]);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <WalletHeader />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 fade-in">
          <p className="text-muted-foreground font-mono text-sm">Connect your wallet to continue</p>
        </div>
      </div>
    );
  }

  if (!parsed) return null;

  const handleDeploy = () => {
    navigate('/deploy');
  };

  const handleEdit = () => {
    navigate('/write');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <WalletHeader />

      <main className="flex-1 flex flex-col items-center px-6 py-12 fade-in">
        <div className="w-full max-w-2xl">
          <p className="text-gold font-mono text-xs tracking-[0.3em] uppercase mb-4">Step 2 of 3</p>
          <h1 className="text-4xl font-serif text-parchment mb-2 heading-rule">Review Your Will</h1>
          <p className="text-muted-foreground text-sm mt-6 mb-8 leading-relaxed">
            The AI has parsed your instructions. Review the details carefully before deploying to Etherlink.
            This will become a binding smart contract.
          </p>

          {/* Original input */}
          <div className="bg-panel border border-border p-5 mb-6">
            <p className="text-gold font-mono text-xs tracking-widest uppercase mb-3">Your Instructions</p>
            <p className="text-muted-foreground text-sm leading-relaxed font-serif italic">"{rawInput}"</p>
          </div>

          {/* Beneficiaries */}
          <div className="bg-panel border border-border p-5 mb-6">
            <p className="text-gold font-mono text-xs tracking-widest uppercase mb-4">Beneficiaries</p>
            <div className="flex flex-col gap-3">
              {parsed.beneficiaries.map((b: Beneficiary, i: number) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <div className="flex flex-col gap-1">
                    {b.label && (
                      <span className="text-parchment text-sm font-serif capitalize">{b.label}</span>
                    )}
                    <span className="text-muted-foreground text-xs font-mono">{truncateAddress(b.wallet)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-gold text-2xl font-serif">{b.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
            {/* Total */}
            <div className="flex items-center justify-between pt-4 mt-2">
              <span className="text-muted-foreground text-xs font-mono tracking-widest uppercase">Total</span>
              <span className="text-parchment font-mono text-sm">
                {parsed.beneficiaries.reduce((s: number, b: Beneficiary) => s + b.percentage, 0)}%
              </span>
            </div>
          </div>

          {/* Heartbeat interval */}
          <div className="bg-panel border border-border p-5 mb-6">
            <p className="text-gold font-mono text-xs tracking-widest uppercase mb-3">Liveness Interval</p>
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-sm">
                You must send a heartbeat every
              </p>
              <span className="text-parchment font-serif text-xl">{parsed.heartbeatIntervalDays} days</span>
            </div>
            <p className="text-muted-foreground text-xs mt-2 font-mono">
              If missed, the will executes automatically.
            </p>
          </div>

          {/* Conditions */}
          {parsed.conditions && parsed.conditions.length > 0 && (
            <div className="bg-panel border border-border p-5 mb-6">
              <p className="text-gold font-mono text-xs tracking-widest uppercase mb-3">Conditions</p>
              <ul className="flex flex-col gap-2">
                {parsed.conditions.map((c: string, i: number) => (
                  <li key={i} className="text-muted-foreground text-sm font-serif">— {c}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-4 mt-4">
            <button
              onClick={handleEdit}
              className="flex-1 py-3 border border-border text-muted-foreground font-mono text-sm tracking-widest uppercase hover:border-gold hover:text-parchment transition-colors"
            >
              ← Edit
            </button>
            <button
              onClick={handleDeploy}
              className="flex-1 py-3 bg-gold text-navy font-mono text-sm tracking-widest uppercase hover:opacity-90 transition-opacity"
            >
              Deploy Will →
            </button>
          </div>

          <p className="text-muted-foreground text-xs font-mono text-center mt-4">
            Deploying will require a wallet signature and gas on Etherlink Ghostnet.
          </p>
        </div>
      </main>
    </div>
  );
}
