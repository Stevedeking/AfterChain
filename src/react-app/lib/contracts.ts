/**
 * Afterchain Contract Configuration
 *
 * After deploying via `cd contracts && npm run deploy:etherlink`,
 * copy the AfterchainRegistry address from contracts/deployments.json
 * and paste it into REGISTRY_ADDRESS below.
 */

// ============================================================================
// Contract Addresses — update after deployment
// ============================================================================

export const REGISTRY_ADDRESS = "0xB60ED709EB213764D3Fda0504553ee5B85F48227" as `0x${string}`;

// ============================================================================
// AfterchainWill ABI
// ============================================================================

export const WILL_ABI = [
  // State reads
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "lastHeartbeat",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "heartbeatInterval",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "executed",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  // getWillStatus
  {
    inputs: [],
    name: "getWillStatus",
    outputs: [
      { internalType: "bool", name: "_executed", type: "bool" },
      { internalType: "uint256", name: "_lastHeartbeat", type: "uint256" },
      { internalType: "uint256", name: "_daysRemaining", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  // getBeneficiaries
  {
    inputs: [],
    name: "getBeneficiaries",
    outputs: [
      {
        components: [
          { internalType: "address", name: "wallet", type: "address" },
          { internalType: "uint256", name: "percentage", type: "uint256" },
          { internalType: "string", name: "label", type: "string" },
        ],
        internalType: "struct AfterchainWill.Beneficiary[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  // heartbeat
  {
    inputs: [],
    name: "heartbeat",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // executeWill
  {
    inputs: [],
    name: "executeWill",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // executeWillTokens
  {
    inputs: [{ internalType: "address", name: "tokenAddress", type: "address" }],
    name: "executeWillTokens",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // updateWill
  {
    inputs: [
      {
        components: [
          { internalType: "address", name: "wallet", type: "address" },
          { internalType: "uint256", name: "percentage", type: "uint256" },
          { internalType: "string", name: "label", type: "string" },
        ],
        internalType: "struct AfterchainWill.Beneficiary[]",
        name: "_beneficiaries",
        type: "tuple[]",
      },
    ],
    name: "updateWill",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "owner", type: "address" },
      { indexed: false, internalType: "uint256", name: "timestamp", type: "uint256" },
    ],
    name: "HeartbeatSent",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "executor", type: "address" },
      { indexed: false, internalType: "uint256", name: "timestamp", type: "uint256" },
    ],
    name: "WillExecuted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "owner", type: "address" },
      { indexed: false, internalType: "uint256", name: "beneficiaryCount", type: "uint256" },
    ],
    name: "WillUpdated",
    type: "event",
  },
] as const;

// ============================================================================
// AfterchainRegistry ABI
// ============================================================================

export const REGISTRY_ABI = [
  // deployWill
  {
    inputs: [
      { internalType: "uint256", name: "heartbeatIntervalDays", type: "uint256" },
      {
        components: [
          { internalType: "address", name: "wallet", type: "address" },
          { internalType: "uint256", name: "percentage", type: "uint256" },
          { internalType: "string", name: "label", type: "string" },
        ],
        internalType: "struct AfterchainWill.Beneficiary[]",
        name: "beneficiaries",
        type: "tuple[]",
      },
    ],
    name: "deployWill",
    outputs: [{ internalType: "address", name: "willAddress", type: "address" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  // getWill
  {
    inputs: [{ internalType: "address", name: "owner", type: "address" }],
    name: "getWill",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  // getAllWills
  {
    inputs: [],
    name: "getAllWills",
    outputs: [{ internalType: "address[]", name: "", type: "address[]" }],
    stateMutability: "view",
    type: "function",
  },
  // getTotalWills
  {
    inputs: [],
    name: "getTotalWills",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  // ownerToWill
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "ownerToWill",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "owner", type: "address" },
      { indexed: true, internalType: "address", name: "willContract", type: "address" },
      { indexed: false, internalType: "uint256", name: "timestamp", type: "uint256" },
    ],
    name: "WillDeployed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "owner", type: "address" },
      { indexed: true, internalType: "address", name: "willContract", type: "address" },
      { indexed: false, internalType: "uint256", name: "timestamp", type: "uint256" },
    ],
    name: "WillRegistered",
    type: "event",
  },
] as const;

// ============================================================================
// Types
// ============================================================================

export interface Beneficiary {
  wallet: `0x${string}`;
  percentage: number;
  label: string;
}

export interface ParsedWill {
  valid: boolean;
  beneficiaries: Beneficiary[];
  heartbeatIntervalDays: number;
  conditions: string[];
  error: string | null;
}
