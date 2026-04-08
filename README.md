# Afterchain Dapp

## Overview
This project is a full-stack decentralized application (dapp) for managing on-chain wills using Etherlink Shadownet. It includes:
- React frontend (Vite, TypeScript)
- Hardhat smart contracts (Solidity)
- Cloudflare Worker backend (Hono)

## Prerequisites
- Node.js (v18+ recommended)
- npm
- Git
- Wrangler CLI (`npm install -g wrangler`)
- MetaMask or Rabby wallet (for EVM interaction)

## Environment Variables

### Frontend (.env)
Create a `.env` file in `src/react-app/` with:
```
VITE_ETHERLINK_RPC=https://node.shadownet.etherlink.com
VITE_AZURE_OPENAI_API_KEY=your-azure-openai-key
VITE_AZURE_OPENAI_ENDPOINT=your-azure-endpoint
```

### Worker (wrangler.jsonc)
Sensitive keys are set in `wrangler.jsonc` under `vars`:
```
"vars": {
  "AZURE_OPENAI_KEY": "your-azure-openai-key",
  "AZURE_OPENAI_ENDPOINT": "your-azure-endpoint",
  "AZURE_OPENAI_DEPLOYMENT": "your-deployment-name"
}
```
**Do not commit real secrets to GitHub!**

## Setup
1. Clone the repo:
   ```
   git clone https://github.com/your-username/your-repo.git
   cd your-repo
   ```
2. Install dependencies:
   ```
   npm install
   cd contracts && npm install
   ```
3. Configure environment variables as above.

## Deploy Contracts
1. Set your private key in `contracts/.env`:
   ```
   PRIVATE_KEY=your-evm-wallet-private-key
   ```
2. Deploy to Etherlink Shadownet:
   ```
   cd contracts
   npm run deploy:etherlink
   ```
3. Copy the deployed registry address to `src/react-app/lib/contracts.ts` as `REGISTRY_ADDRESS`.

## Run Frontend
```
cd src/react-app
npm install
npm run dev
```

## Deploy Worker
```
wrangler login
wrangler deploy
```

## Security
- Never commit `.env` or real secrets to GitHub.
- Add `.env`, `wrangler.jsonc`, and `contracts/.env` to `.gitignore`.
- Document required environment variables for collaborators.

## License
MIT