// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./AfterchainWill.sol";

/**
 * @title AfterchainRegistry
 * @notice Global registry that tracks all deployed AfterchainWill contracts.
 *         The liveness monitor reads getAllWills() to find contracts to check.
 */
contract AfterchainRegistry {

     // -------------------------------------------------------------------------
     // State
     // -------------------------------------------------------------------------

     mapping(address => address) public ownerToWill;
     address[] public allWills;

     // -------------------------------------------------------------------------
     // Events
     // -------------------------------------------------------------------------

     event WillRegistered(address indexed owner, address indexed willContract, uint256 timestamp);
     event WillDeployed(address indexed owner, address indexed willContract, uint256 timestamp);

     // -------------------------------------------------------------------------
     // Deploy + Register (single tx)
     // -------------------------------------------------------------------------

     /**
      * @notice Deploys a new AfterchainWill for msg.sender and registers it.
      *         Reverts if the caller already has a will — call updateWill() on
      *         the existing contract instead.
      */
     function deployWill(
          uint256 heartbeatIntervalDays,
          AfterchainWill.Beneficiary[] memory beneficiaries
     ) external returns (address willAddress) {
          require(ownerToWill[msg.sender] == address(0), "AfterchainRegistry: will already exists");

          AfterchainWill will = new AfterchainWill(
               msg.sender,
               heartbeatIntervalDays,
               beneficiaries
          );

          willAddress = address(will);
          ownerToWill[msg.sender] = willAddress;
          allWills.push(willAddress);

          emit WillDeployed(msg.sender, willAddress, block.timestamp);
          emit WillRegistered(msg.sender, willAddress, block.timestamp);
     }

     // -------------------------------------------------------------------------
     // Register existing will (if deployed separately)
     // -------------------------------------------------------------------------

     /**
     /**
      * @notice Register a pre-deployed will contract.
      *         The will's owner must match msg.sender.
      */
     function registerWill(address willContract) external {
          require(willContract != address(0), "AfterchainRegistry: zero address");
          require(ownerToWill[msg.sender] == address(0), "AfterchainRegistry: already registered");

          AfterchainWill will = AfterchainWill(payable(willContract));
          require(will.owner() == msg.sender, "AfterchainRegistry: not will owner");

          ownerToWill[msg.sender] = willContract;
          allWills.push(willContract);

          emit WillRegistered(msg.sender, willContract, block.timestamp);
     }

     // -------------------------------------------------------------------------
     // Views
     // -------------------------------------------------------------------------

     function getWill(address owner) external view returns (address) {
          return ownerToWill[owner];
     }

     function getAllWills() external view returns (address[] memory) {
          return allWills;
     }

     function getTotalWills() external view returns (uint256) {
          return allWills.length;
     }
}