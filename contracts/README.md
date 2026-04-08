     1|# Afterchain Contracts
     2|
     3|Solidity smart contracts for the Afterchain protocol, deployed on **Etherlink Ghostnet** (Tezos EVM testnet, chainId 128123).
     4|
     5|## Contracts
     6|
     7|### `AfterchainWill.sol`
     8|One contract per user. Holds ETH and ERC-20 tokens. Owner must call `heartbeat()` monthly to prove liveness. If the heartbeat lapses, anyone can call `executeWill()` to distribute assets proportionally to beneficiaries.
     9|
    10|### `AfterchainRegistry.sol`
    11|Global registry tracking all deployed will contracts. The liveness monitor reads `getAllWills()` to find contracts to check. Also provides `deployWill()` to deploy + register in a single transaction.
    12|
    13|## Setup
    14|
    15|```bash
    16|cd contracts
    17|npm install
    18|cp .env.example .env
    19|# Fill in PRIVATE_KEY in .env
    20|```
    21|
    22|## Compile
    23|
    24|```bash
    25|npm run compile
    26|```
    27|
    28|## Test
    29|
    30|```bash
    31|npm test
    32|```
    33|
    34|## Deploy to Etherlink Ghostnet
    35|
    36|```bash
    37|npm run deploy:etherlink
    38|```
    39|
    40|After deployment, copy the `AfterchainRegistry` address from `deployments.json` into:
    41|```
    42|src/react-app/lib/contracts.ts  →  REGISTRY_ADDRESS
    43|```
    44|
    45|## Get Testnet ETH
    46|
    47|Etherlink Ghostnet faucet: https://faucet.etherlink.com
    48|
    49|## Network Details
    50|
    51|| Property | Value |
    52||----------|-------|
    53|| Network | Etherlink Ghostnet |
    54|| Chain ID | 128123 |
    55|| RPC URL | https://node.ghostnet.etherlink.com |
    56|| Explorer | https://testnet-explorer.etherlink.com |
    57|| Currency | XTZ |
    58|