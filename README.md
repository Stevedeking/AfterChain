# Afterchain

Onchain AI Wills & Estate Protocol built on Etherlink (Tezos EVM).

## What it does
Write your crypto will in plain English. An AI agent parses your instructions, deploys a smart contract on Etherlink Shadownet, and executes your wishes automatically — no lawyers, no intermediaries.

## Stack
- React + Vite + TypeScript
- viem (no wagmi / RainbowKit)
- Cloudflare Workers
- Azure OpenAI (GPT-4o)
- Etherlink Shadownet (Tezos EVM)

## Features
- AI-parsed will creation from plain English
- Smart contract deployment per user
- Heartbeat liveness mechanism — confirm you're alive on a 30-day cycle
- Automatic execution on inactivity
- Beneficiary management with percentage splits
- Zero intermediaries — fully onchain

## Setup

1. Clone the repo
2. Copy `.env.example` to `.env` and fill in your values
3. `npm install`
4. `npm run dev`

## Environment Variables

```env
VITE_ETHERLINK_RPC=https://node.shadownet.etherlink.com
AZURE_OPENAI_KEY=
AZURE_OPENAI_ENDPOINT=
AZURE_OPENAI_DEPLOYMENT=
```

## Deploy

```bash
npm run deploy
```

Deploys to Cloudflare Workers.

## Network

Etherlink Shadownet (Tezos EVM)  
Chain ID: 127823  
Explorer: https://shadownet.explorer.etherlink.com  
RPC: https://node.shadownet.etherlink.com
