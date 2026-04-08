import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useWallet } from '../lib/wallet';
import { REGISTRY_ABI, REGISTRY_ADDRESS, type ParsedWill } from '../lib/contracts';
import WalletHeader from '../components/WalletHeader';
import type { Hash } from 'viem';

type DeployState = 'idle' | 'signing' | 'pending' | 'success' | 'error';

export default function DeployPage() {
  const { isConnected, address, writeContract, waitForTransaction } = useWallet();
  const navigate = useNavigate();
  const [parsed, setParsed] = useState<ParsedWill | null>(null);
  const [deployState, setDeployState] = useState<DeployState>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [willAddress] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<Hash | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('afterchain_parsed_will');
    if (!stored) { navigate('/write'); return; }
    try { setParsed(JSON.parse(stored) as ParsedWill); } catch { navigate('/write'); }
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

  const isRegistryDeployed = REGISTRY_ADDRESS !== '0x0000000000000000000000000000000000000000';

  const handleDeploy = async () => {
    if (!isRegistryDeployed) {
      setErrorMsg('Registry contract not yet deployed. Run `cd contracts && npm run deploy:etherlink` first.');
      setDeployState('error');
      return;
    }

    setDeployState('signing');
    setErrorMsg(null);

    try {
      const beneficiaries = parsed.beneficiaries.map((b) => ({
        wallet: b.wallet as `0x${string}`,
        percentage: BigInt(b.percentage),
        label: b.label,
      }));

      const hash = await writeContract({
        address: REGISTRY_ADDRESS,
        abi: REGISTRY_ABI,
        functionName: 'deployWill',
        args: [BigInt(parsed.heartbeatIntervalDays), beneficiaries],
      });

      setTxHash(hash);
      setDeployState('pending');

      await waitForTransaction(hash);
      setDeployState('success');
      // Will address would come from event logs — store tx hash for explorer link
      sessionStorage.setItem('afterchain_tx_hash', hash);
    } catch (err: unknown) {
      setDeployState('error');
      const msg = err instanceof Error ? err.message.split('\n')[0] : 'Transaction failed';
      setErrorMsg(msg);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <WalletHeader />

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 fade-in">
        <div className="w-full max-w-xl text-center">
          <p className="text-gold font-mono text-xs tracking-[0.3em] uppercase mb-4">Step 3 of 3</p>
          <h1 className="text-4xl font-serif text-parchment mb-2 heading-rule inline-block">Deploy Your Will</h1>

          {deployState === 'idle' && (
            <div className="mt-10 flex flex-col items-center gap-6">
              <div className="bg-panel border border-border p-6 w-full text-left">
                <p className="text-gold font-mono text-xs tracking-widest uppercase mb-4">Deployment Summary</p>
                <div className="flex flex-col gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Beneficiaries</span>
                    <span className="text-parchment">{parsed.beneficiaries.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Heartbeat interval</span>
                    <span className="text-parchment">{parsed.heartbeatIntervalDays} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Network</span>
                    <span className="text-parchment font-mono">Etherlink Ghostnet</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Owner</span>
                    <span className="text-parchment font-mono text-xs">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
                  </div>
                </div>
              </div>

              {!isRegistryDeployed && (
                <div className="border border-gold/40 bg-gold/5 p-4 w-full text-left">
                  <p className="text-gold text-xs font-mono mb-1">Registry Not Deployed</p>
                  <p className="text-muted-foreground text-xs">
                    Run <code className="text-gold">cd contracts && npm run deploy:etherlink</code> to deploy the registry, then update <code className="text-gold">REGISTRY_ADDRESS</code> in lib/contracts.ts.
                  </p>
                </div>
              )}

              <button
                onClick={handleDeploy}
                className="w-full py-4 bg-gold text-navy font-mono text-sm tracking-widest uppercase hover:opacity-90 transition-opacity"
              >
                Sign & Deploy Will
              </button>
              <button
                onClick={() => navigate('/summary')}
                className="text-muted-foreground font-mono text-xs hover:text-parchment transition-colors"
              >
                ← Back to Review
              </button>
            </div>
          )}

          {deployState === 'signing' && (
            <div className="mt-10 flex flex-col items-center gap-4">
              <div className="w-8 h-8 border border-gold border-t-transparent rounded-full animate-spin" />
              <p className="text-parchment font-serif text-lg">Awaiting signature...</p>
              <p className="text-muted-foreground text-sm font-mono">Confirm the transaction in your wallet</p>
            </div>
          )}

          {deployState === 'pending' && (
            <div className="mt-10 flex flex-col items-center gap-4">
              <div className="w-8 h-8 border border-gold border-t-transparent rounded-full animate-spin" />
              <p className="text-parchment font-serif text-lg">Deploying to Etherlink...</p>
              <p className="text-muted-foreground text-sm font-mono">Transaction submitted. Waiting for confirmation.</p>
              {txHash && (
                <a
                  href={`https://shadownet.explorer.etherlink.com/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gold text-xs font-mono hover:underline"
                >
                  View on Explorer →
                </a>
              )}
            </div>
          )}

          {deployState === 'success' && (
            <div className="mt-10 flex flex-col items-center gap-6 fade-in">
              <div className="text-gold text-4xl">✓</div>
              <p className="text-parchment font-serif text-2xl">Will Deployed</p>
              <p className="text-muted-foreground text-sm font-mono">Your will is now live on Etherlink Ghostnet.</p>

              {willAddress && (
                <div className="bg-panel border border-border p-4 w-full">
                  <p className="text-gold font-mono text-xs tracking-widest uppercase mb-2">Will Contract Address</p>
                  <p className="text-parchment font-mono text-sm break-all">{willAddress}</p>
                </div>
              )}

              {txHash && (
                <a
                  href={`https://shadownet.explorer.etherlink.com/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gold text-xs font-mono hover:underline"
                >
                  View Transaction →
                </a>
              )}

              <button
                onClick={() => navigate('/dashboard')}
                className="w-full py-4 bg-gold text-navy font-mono text-sm tracking-widest uppercase hover:opacity-90 transition-opacity"
              >
                Go to Dashboard →
              </button>
            </div>
          )}

          {deployState === 'error' && (
            <div className="mt-10 flex flex-col items-center gap-6">
              <div className="border border-destructive bg-destructive/10 p-4 w-full text-left">
                <p className="text-destructive-foreground text-sm font-mono">{errorMsg}</p>
              </div>
              <button
                onClick={() => { setDeployState('idle'); setErrorMsg(null); }}
                className="w-full py-4 bg-gold text-navy font-mono text-sm tracking-widest uppercase hover:opacity-90 transition-opacity"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
