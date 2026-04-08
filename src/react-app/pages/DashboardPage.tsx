import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useWallet } from '../lib/wallet';
import { WILL_ABI, REGISTRY_ABI, REGISTRY_ADDRESS } from '../lib/contracts';
import WalletHeader from '../components/WalletHeader';
import type { Abi } from 'viem';

const EXPLORER = 'https://explorer.shadownet.etherlink.com';

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

type WillStatus = [boolean, bigint, bigint];
type BeneficiaryData = { wallet: string; percentage: bigint; label: string };

export default function DashboardPage() {
  const { isConnected, address, readContract, writeContract, waitForTransaction } = useWallet();
  const navigate = useNavigate();
  const [willAddress, setWillAddress] = useState<`0x${string}` | null>(null);
  const [willStatus, setWillStatus] = useState<WillStatus | null>(null);
  const [beneficiaries, setBeneficiaries] = useState<BeneficiaryData[]>([]);
  const [heartbeatSent, setHeartbeatSent] = useState(false);
  const [hbPending, setHbPending] = useState(false);
  const [hbError, setHbError] = useState<string | null>(null);
  const [, setAllWills] = useState<`0x${string}`[]>([]);

  // Reset state when wallet changes
  useEffect(() => {
    setWillAddress(null);
    setBeneficiaries([]);
    setWillStatus(null);
    setHeartbeatSent(false);
    setHbError(null);
    localStorage.removeItem('afterchain_will_address');
  }, [address]);

  // Fetch will address from registry
  useEffect(() => {
    if (!address || REGISTRY_ADDRESS === '0x0000000000000000000000000000000000000000') return;
    readContract<`0x${string}`>({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI as Abi,
      functionName: 'getWill',
      args: [address],
    }).then((result) => {
      if (result && result !== '0x0000000000000000000000000000000000000000') {
        setWillAddress(result);
        localStorage.setItem('afterchain_will_address', result);
      }
    }).catch(() => {});
  }, [address, readContract]);

  // Fetch will status
  const fetchStatus = useCallback(async () => {
    if (!willAddress) return;
    try {
      const status = await readContract<WillStatus>({
        address: willAddress,
        abi: WILL_ABI as Abi,
        functionName: 'getWillStatus',
      });
      setWillStatus(status);
    } catch {}
  }, [willAddress, readContract]);

  // Fetch beneficiaries
  useEffect(() => {
    if (!willAddress) return;
    readContract<BeneficiaryData[]>({
      address: willAddress,
      abi: WILL_ABI as Abi,
      functionName: 'getBeneficiaries',
    }).then(setBeneficiaries).catch(() => {});
  }, [willAddress, readContract]);

  // Poll status every 30s
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30_000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Fetch all wills
  useEffect(() => {
    if (!address || REGISTRY_ADDRESS === '0x0000000000000000000000000000000000000000') return;
    readContract<`0x${string}`[]>({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI as Abi,
      functionName: 'getAllWills',
    })
      .then((wills) => {
        setAllWills(wills.filter(w => w !== '0x0000000000000000000000000000000000000000'));
      })
      .catch(() => setAllWills([]));
  }, [address, readContract]);

  const handleHeartbeat = async () => {
    if (!willAddress) return;
    setHbPending(true);
    setHbError(null);
    try {
      const hash = await writeContract({
        address: willAddress,
        abi: WILL_ABI as Abi,
        functionName: 'heartbeat',
      });
      await waitForTransaction(hash);
      setHeartbeatSent(true);
      fetchStatus();
      setTimeout(() => setHeartbeatSent(false), 5000);
    } catch (err: unknown) {
      setHbError(err instanceof Error ? err.message.split('\n')[0] : 'Transaction failed');
    } finally {
      setHbPending(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <WalletHeader />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 fade-in">
          <p className="text-muted-foreground font-mono text-sm">Connect your wallet to view your dashboard</p>
        </div>
      </div>
    );
  }

  const executed = willStatus ? willStatus[0] : false;
  const lastHeartbeatTs = willStatus ? Number(willStatus[1]) : 0;
  const daysRemaining = willStatus ? Number(willStatus[2]) : null;

  const lastHeartbeatDate = lastHeartbeatTs
    ? new Date(lastHeartbeatTs * 1000).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  const urgency =
    daysRemaining !== null
      ? daysRemaining <= 3
        ? 'critical'
        : daysRemaining <= 7
        ? 'warning'
        : 'healthy'
      : 'unknown';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <WalletHeader />

      <main className="flex-1 px-6 py-12 fade-in">
        <div className="max-w-2xl mx-auto">
          <p className="text-gold font-mono text-xs tracking-[0.3em] uppercase mb-4">Your Estate</p>
          <h1 className="text-4xl font-serif text-parchment mb-2 heading-rule">Dashboard</h1>

          {!willAddress ? (
            <div className="mt-10 bg-panel border border-border p-8 text-center">
              <p className="text-muted-foreground font-serif mb-6">No will found for this wallet.</p>
              <button
                onClick={() => navigate('/write')}
                className="px-8 py-3 bg-gold text-navy font-mono text-sm tracking-widest uppercase hover:opacity-90 transition-opacity"
              >
                Write Your Will
              </button>
            </div>
          ) : (
            <div className="mt-8 flex flex-col gap-6">

              {executed && (
                <div className="border border-destructive bg-destructive/10 p-4">
                  <p className="text-destructive-foreground font-mono text-sm">
                    ⚠ This will has been executed. Assets have been distributed.
                  </p>
                </div>
              )}

              {/* Heartbeat card */}
              <div className="bg-panel border border-border p-6">
                <p className="text-gold font-mono text-xs tracking-widest uppercase mb-4">Liveness Status</p>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-muted-foreground text-xs font-mono mb-1">Days Remaining</p>
                    <p className={`text-5xl font-serif ${
                      urgency === 'critical' ? 'text-destructive' :
                      urgency === 'warning' ? 'text-gold' : 'text-parchment'
                    }`}>
                      {daysRemaining !== null ? daysRemaining : '—'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground text-xs font-mono mb-1">Last Heartbeat</p>
                    <p className="text-parchment text-sm font-serif">{lastHeartbeatDate ?? '—'}</p>
                  </div>
                </div>

                {daysRemaining !== null && (
                  <div className="w-full h-1 bg-secondary mb-6">
                    <div
                      className={`h-1 transition-all ${urgency === 'critical' ? 'bg-destructive' : 'bg-gold'}`}
                      style={{ width: `${Math.min(100, (daysRemaining / 30) * 100)}%` }}
                    />
                  </div>
                )}

                {heartbeatSent ? (
                  <div className="text-center py-3 border border-gold/40 text-gold font-mono text-sm">
                    ✓ Heartbeat sent — liveness confirmed
                  </div>
                ) : (
                  <button
                    onClick={handleHeartbeat}
                    disabled={hbPending || executed}
                    className="w-full py-3 bg-gold text-navy font-mono text-sm tracking-widest uppercase hover:opacity-90 transition-opacity disabled:opacity-40"
                  >
                    {hbPending ? 'Confirming...' : 'Send Heartbeat'}
                  </button>
                )}

                {hbError && (
                  <p className="text-destructive text-xs font-mono mt-2">{hbError}</p>
                )}
              </div>

              {/* Will contract */}
              <div className="bg-panel border border-border p-5">
                <p className="text-gold font-mono text-xs tracking-widest uppercase mb-3">Will Contract</p>
                <p className="text-parchment font-mono text-sm break-all">{willAddress}</p>
                <a
                  href={`${EXPLORER}/address/${willAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gold text-xs font-mono hover:underline mt-2 inline-block"
                >
                  View on Explorer →
                </a>
              </div>

              {/* Beneficiaries */}
              {beneficiaries.length > 0 && (
                <div className="bg-panel border border-border p-5">
                  <p className="text-gold font-mono text-xs tracking-widest uppercase mb-4">Beneficiaries</p>
                  <div className="flex flex-col gap-3">
                    {beneficiaries.map((b, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <div>
                          {b.label && <p className="text-parchment text-sm font-serif capitalize">{b.label}</p>}
                          <p className="text-muted-foreground text-xs font-mono">{truncateAddress(b.wallet)}</p>
                        </div>
                        <span className="text-gold font-serif text-xl">{Number(b.percentage)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-4">
                <button
                  onClick={() => navigate('/write')}
                  className="flex-1 py-3 border border-border text-muted-foreground font-mono text-sm tracking-widest uppercase hover:border-gold hover:text-parchment transition-colors"
                >
                  Update Will
                </button>
                <button
                  onClick={() => navigate('/beneficiary')}
                  className="flex-1 py-3 border border-border text-muted-foreground font-mono text-sm tracking-widest uppercase hover:border-gold hover:text-parchment transition-colors"
                >
                  Beneficiary View
                </button>
              </div>

            </div>
          )}
        </div>
      </main>
    </div>
  );
}