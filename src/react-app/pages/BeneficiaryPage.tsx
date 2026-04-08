import { useState } from 'react';
// import { useNavigate } from 'react-router';
import { useWallet } from '../lib/wallet';
import { WILL_ABI, REGISTRY_ABI, REGISTRY_ADDRESS } from '../lib/contracts';
import WalletHeader from '../components/WalletHeader';
import type { Abi } from 'viem';

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

type WillStatus = [boolean, bigint, bigint];
type BeneficiaryData = { wallet: string; percentage: bigint; label: string };

export default function BeneficiaryPage() {
  // Removed unused navigate variable
  const { readContract } = useWallet();
  const [ownerInput, setOwnerInput] = useState('');
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isLooking, setIsLooking] = useState(false);
  const [activeWill, setActiveWill] = useState<`0x${string}` | null>(null);
  const [willStatus, setWillStatus] = useState<WillStatus | null>(null);
  const [beneficiaries, setBeneficiaries] = useState<BeneficiaryData[]>([]);

  const isRegistryDeployed = REGISTRY_ADDRESS !== '0x0000000000000000000000000000000000000000';

  const loadWillData = async (willAddr: `0x${string}`) => {
    setActiveWill(willAddr);
    try {
      const status = await readContract<WillStatus>({
        address: willAddr,
        abi: WILL_ABI as Abi,
        functionName: 'getWillStatus',
      });
      setWillStatus(status);
    } catch {}
    try {
      const bens = await readContract<BeneficiaryData[]>({
        address: willAddr,
        abi: WILL_ABI as Abi,
        functionName: 'getBeneficiaries',
      });
      setBeneficiaries(bens);
    } catch {}
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLookupError(null);
    const val = ownerInput.trim();
    if (!val.startsWith('0x') || val.length !== 42) {
      setLookupError('Please enter a valid Ethereum address (0x...)');
      return;
    }
    setIsLooking(true);
    setActiveWill(null);
    setWillStatus(null);
    setBeneficiaries([]);

    try {
      if (isRegistryDeployed) {
        // Look up via registry
        const result = await readContract<`0x${string}`>({
          address: REGISTRY_ADDRESS,
          abi: REGISTRY_ABI as Abi,
          functionName: 'getWill',
          args: [val as `0x${string}`],
        });
        if (result && result !== '0x0000000000000000000000000000000000000000') {
          await loadWillData(result);
        } else {
          setLookupError('No will found for this address.');
        }
      } else {
        // Direct will contract lookup
        await loadWillData(val as `0x${string}`);
      }
    } catch {
      setLookupError('Lookup failed. Check the address and try again.');
    } finally {
      setIsLooking(false);
    }
  };

  const executed = willStatus ? willStatus[0] : false;
  const lastHeartbeatTs = willStatus ? Number(willStatus[1]) : 0;
  const daysRemaining = willStatus ? Number(willStatus[2]) : null;

  const lastHeartbeatDate = lastHeartbeatTs
    ? new Date(lastHeartbeatTs * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  const urgency = daysRemaining !== null
    ? daysRemaining <= 3 ? 'critical' : daysRemaining <= 7 ? 'warning' : 'healthy'
    : 'unknown';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <WalletHeader />

      <main className="flex-1 px-6 py-12 fade-in">
        <div className="max-w-2xl mx-auto">
          <p className="text-gold font-mono text-xs tracking-[0.3em] uppercase mb-4">Beneficiary Portal</p>
          <h1 className="text-4xl font-serif text-parchment mb-2 heading-rule">Check Inheritance Status</h1>
          <p className="text-muted-foreground text-sm mt-6 mb-8 leading-relaxed">
            Enter the will owner's wallet address to view the status of their estate and your pending inheritance.
          </p>

          {/* Lookup form */}
          <div className="bg-panel border border-border p-6 mb-8">
            <p className="text-gold font-mono text-xs tracking-widest uppercase mb-4">Look Up a Will</p>
            <form onSubmit={handleLookup} className="flex gap-3">
              <input
                type="text"
                value={ownerInput}
                onChange={(e) => setOwnerInput((e.target as HTMLInputElement).value)}
                placeholder={isRegistryDeployed ? "Owner wallet address (0x...)" : "Will contract address (0x...)"}
                className="flex-1 bg-input border border-border text-parchment font-mono text-sm p-3 focus:outline-none focus:border-gold transition-colors placeholder:text-muted-foreground"
              />
              <button
                type="submit"
                disabled={isLooking}
                className="px-6 py-3 bg-gold text-navy font-mono text-xs tracking-widest uppercase hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {isLooking ? '...' : 'Look Up'}
              </button>
            </form>
            {!isRegistryDeployed && (
              <p className="text-muted-foreground text-xs font-mono mt-2">
                Registry not deployed — enter the will contract address directly.
              </p>
            )}
            {lookupError && (
              <p className="text-destructive text-xs font-mono mt-2">{lookupError}</p>
            )}
          </div>

          {/* Will details */}
          {activeWill && (
            <div className="flex flex-col gap-6 fade-in">
              {/* Status */}
              <div className={`border p-5 ${executed ? 'border-destructive bg-destructive/10' : 'border-border bg-panel'}`}>
                <p className="text-gold font-mono text-xs tracking-widest uppercase mb-3">Will Status</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-2xl font-serif ${executed ? 'text-destructive-foreground' : 'text-parchment'}`}>
                      {executed ? 'Executed' : 'Active'}
                    </p>
                    <p className="text-muted-foreground text-xs font-mono mt-1">
                      {executed ? 'Assets have been distributed to beneficiaries.' : 'Awaiting liveness trigger.'}
                    </p>
                  </div>
                  {!executed && daysRemaining !== null && (
                    <div className="text-right">
                      <p className="text-muted-foreground text-xs font-mono mb-1">Days Until Execution</p>
                      <p className={`text-4xl font-serif ${
                        urgency === 'critical' ? 'text-destructive' :
                        urgency === 'warning' ? 'text-gold' : 'text-parchment'
                      }`}>
                        {daysRemaining}
                      </p>
                    </div>
                  )}
                </div>
                {lastHeartbeatDate && (
                  <p className="text-muted-foreground text-xs font-mono mt-3">
                    Last heartbeat: {lastHeartbeatDate}
                  </p>
                )}
              </div>

              {/* Will contract */}
              <div className="bg-panel border border-border p-5">
                <p className="text-gold font-mono text-xs tracking-widest uppercase mb-2">Will Contract</p>
                <p className="text-parchment font-mono text-sm break-all">{activeWill}</p>
                <a
                  href={`https://shadownet.explorer.etherlink.com/address/${activeWill}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gold text-xs font-mono hover:underline mt-2 inline-block"
                >
                  View on Explorer →
                </a>
              </div>

              {/* Beneficiaries */}
              {beneficiaries && (beneficiaries as BeneficiaryData[]).length > 0 && (
                <div className="bg-panel border border-border p-5">
                  <p className="text-gold font-mono text-xs tracking-widest uppercase mb-4">Beneficiaries</p>
                  <div className="flex flex-col gap-3">
                    {(beneficiaries as BeneficiaryData[]).map((b, i) => (
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
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
