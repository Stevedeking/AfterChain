/**
 * WalletHeader — shared nav bar using the custom WalletContext.
 * No wagmi, no RainbowKit — uses window.ethereum + viem directly.
 */

import { useWallet } from '../lib/wallet';

export default function WalletHeader() {
  const { isConnected, address, connect, disconnect, isConnecting } = useWallet();

  return (
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
            onClick={disconnect}
            className="text-muted-foreground font-mono text-xs hover:text-parchment transition-colors"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <button
          onClick={connect}
          disabled={isConnecting}
          className="px-5 py-2 border border-gold text-gold font-mono text-xs tracking-widest uppercase hover:bg-gold hover:text-navy transition-colors disabled:opacity-50"
        >
          {isConnecting ? 'Connecting…' : 'Connect Wallet'}
        </button>
      )}
    </header>
  );
}