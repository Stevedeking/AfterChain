import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useWallet } from '../lib/wallet';
import type { ParsedWill } from '../lib/contracts';
import WalletHeader from '../components/WalletHeader';

const EXAMPLES = [
  'Send 50% to 0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B (my wife), 30% to 0x4B0897b0513fdC7C541B6d9D7E929C4e5364D2dB (my kids), and donate the remaining 20% to 0x6C8f2A135f6ed072DE4503Bd7C4999a1a17F824B.',
  'Give everything equally to 0x1234567890123456789012345678901234567890 and 0xabcdefabcdefabcdefabcdefabcdefabcdefabcd — 50% each.',
];

export default function WriteWillPage() {
  const { isConnected } = useWallet();
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/parse-will', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: input.trim() }),
      });

      const json = await res.json() as { ok: boolean; data?: ParsedWill; error?: { message: string } };

      if (!res.ok || !json.ok) {
        setError(json.error?.message ?? 'Failed to parse your will. Please try again.');
        return;
      }

      const parsed = json.data as ParsedWill;

      if (!parsed.valid) {
        setError(parsed.error ?? 'Your instructions could not be validated. Please check percentages and wallet addresses.');
        return;
      }

      // Store in sessionStorage and navigate to summary
      sessionStorage.setItem('afterchain_parsed_will', JSON.stringify(parsed));
      sessionStorage.setItem('afterchain_raw_input', input.trim());
      navigate('/summary');
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <WalletHeader />

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 fade-in">
        <div className="w-full max-w-2xl">
          <p className="text-gold font-mono text-xs tracking-[0.3em] uppercase mb-4">Step 1 of 3</p>
          <h1 className="text-4xl font-serif text-parchment mb-2 heading-rule">Write Your Will</h1>
          <p className="text-muted-foreground text-sm mt-6 mb-8 leading-relaxed">
            Describe your wishes in plain English. Include wallet addresses, percentages, and any conditions.
            The AI will extract the details and present them for your review.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <textarea
              value={input}
              onChange={(e) => setInput((e.target as HTMLTextAreaElement).value)}
              placeholder="e.g. Send 40% to 0x... (my wife), 30% to 0x... (my children), and donate the rest to 0x... (charity)."
              rows={8}
              className="w-full bg-input border border-border text-parchment font-serif text-base p-4 resize-none focus:outline-none focus:border-gold transition-colors placeholder:text-muted-foreground leading-relaxed"
              disabled={loading}
            />

            {error && (
              <div className="border border-destructive bg-destructive/10 p-4 text-destructive-foreground text-sm font-mono">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs font-mono">
                {input.length} characters
              </span>
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="px-8 py-3 bg-gold text-navy font-mono text-sm tracking-widest uppercase hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {loading ? 'Parsing...' : 'Parse Will →'}
              </button>
            </div>
          </form>

          {/* Examples */}
          <div className="mt-10 pt-8 border-t border-border">
            <p className="text-muted-foreground text-xs font-mono tracking-widest uppercase mb-4">Examples</p>
            <div className="flex flex-col gap-3">
              {EXAMPLES.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => setInput(ex)}
                  className="text-left text-sm text-muted-foreground hover:text-parchment transition-colors border border-border p-3 hover:border-gold"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
