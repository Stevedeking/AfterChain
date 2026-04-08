// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title AfterchainWill
 * @notice One contract per user. Holds ETH and ERC-20 tokens.
 *         Owner must call heartbeat() at least every heartbeatInterval seconds.
 *         If the heartbeat lapses, anyone can call executeWill() to distribute assets.
 */
contract AfterchainWill {
     using SafeERC20 for IERC20;

     // -------------------------------------------------------------------------
     // State
     // -------------------------------------------------------------------------

     address public owner;
     uint256 public lastHeartbeat;
     uint256 public heartbeatInterval; // seconds, default 30 days
     bool public executed;

     struct Beneficiary {
          address wallet;
          uint256 percentage; // out of 100
          string label;       // e.g. "wife", "charity"
     }

     Beneficiary[] public beneficiaries;

     // -------------------------------------------------------------------------
     // Events
     // -------------------------------------------------------------------------

     event HeartbeatSent(address indexed owner, uint256 timestamp);
     event WillExecuted(address indexed executor, uint256 timestamp);
     event WillUpdated(address indexed owner, uint256 beneficiaryCount);
     event EthDistributed(address indexed beneficiary, uint256 amount);
     event TokenDistributed(address indexed token, address indexed beneficiary, uint256 amount);
     event WillFunded(address indexed sender, uint256 amount);

     // -------------------------------------------------------------------------
     // Modifiers
     // -------------------------------------------------------------------------

     modifier onlyOwner() {
          require(msg.sender == owner, "AfterchainWill: not owner");
          _;
     }

     modifier notExecuted() {
          require(!executed, "AfterchainWill: will already executed");
          _;
     }

     // -------------------------------------------------------------------------
     // Constructor
     // -------------------------------------------------------------------------
     constructor(
          address _owner,
          uint256 _heartbeatIntervalDays,
          Beneficiary[] memory _beneficiaries
     ) {
          require(_owner != address(0), "AfterchainWill: zero owner");
          _validateBeneficiaries(_beneficiaries);

          owner = _owner;
          heartbeatInterval = _heartbeatIntervalDays * 1 days;
          lastHeartbeat = block.timestamp;

          for (uint256 i = 0; i < _beneficiaries.length; i++) {
               beneficiaries.push(_beneficiaries[i]);
          }
     }

     // -------------------------------------------------------------------------
     // Receive ETH
     // -------------------------------------------------------------------------

     receive() external payable {
          emit WillFunded(msg.sender, msg.value);
     }

     // -------------------------------------------------------------------------
     // Core functions
     // -------------------------------------------------------------------------

     /**
      * @notice Owner calls this to prove liveness and reset the countdown.
      */
     function heartbeat() external onlyOwner notExecuted {
          lastHeartbeat = block.timestamp;
          emit HeartbeatSent(owner, block.timestamp);
     }

     /**
      * @notice Callable by anyone once the heartbeat interval has lapsed.
           *         Distributes all ETH held by this contract proportionally.
           *         For ERC-20 tokens, call executeWillTokens() separately.
     */
     function executeWill() external notExecuted {
                    require(
                              block.timestamp > lastHeartbeat + heartbeatInterval,
                              "AfterchainWill: owner is still alive"
                    );

                    executed = true;
                    emit WillExecuted(msg.sender, block.timestamp);

                    uint256 totalEth = address(this).balance;
                    if (totalEth > 0) {
                              _distributeEth(totalEth);
                    }
          }

     /**
      * @notice Distribute ERC-20 tokens after the will has been executed.
      *         Can be called multiple times for different token addresses.
      */
     function executeWillTokens(address tokenAddress) external {
          require(executed, "AfterchainWill: will not yet executed");
          require(tokenAddress != address(0), "AfterchainWill: zero token address");

          IERC20 token = IERC20(tokenAddress);
          uint256 totalBalance = token.balanceOf(address(this));
          require(totalBalance > 0, "AfterchainWill: no token balance");

          for (uint256 i = 0; i < beneficiaries.length; i++) {
               uint256 share = (totalBalance * beneficiaries[i].percentage) / 100;
               if (share > 0) {
                    token.safeTransfer(beneficiaries[i].wallet, share);
                    emit TokenDistributed(tokenAddress, beneficiaries[i].wallet, share);
               }
          }
     }

     /**
      * @notice Owner can update beneficiaries at any time before execution.
      */
     function updateWill(Beneficiary[] memory _beneficiaries) external onlyOwner notExecuted {
          _validateBeneficiaries(_beneficiaries);

          delete beneficiaries;
          for (uint256 i = 0; i < _beneficiaries.length; i++) {
               beneficiaries.push(_beneficiaries[i]);
          }

          emit WillUpdated(owner, _beneficiaries.length);
     }

     /**
      * @notice Returns current will status.
      */
     function getWillStatus()
          external
          view
          returns (
               bool _executed,
               uint256 _lastHeartbeat,
               uint256 _daysRemaining
          )
     {
          _executed = executed;
          _lastHeartbeat = lastHeartbeat;

          if (executed) {
               _daysRemaining = 0;
          } else {
               uint256 deadline = lastHeartbeat + heartbeatInterval;
               if (block.timestamp >= deadline) {
                    _daysRemaining = 0;
               } else {
                    _daysRemaining = (deadline - block.timestamp) / 1 days;
               }
          }
     }

     /**
      * @notice Returns all beneficiaries.
      */
     function getBeneficiaries() external view returns (Beneficiary[] memory) {
          return beneficiaries;
     }

     // -------------------------------------------------------------------------
     // Internal helpers
     // -------------------------------------------------------------------------

     function _distributeEth(uint256 totalEth) internal {
          for (uint256 i = 0; i < beneficiaries.length; i++) {
               uint256 share = (totalEth * beneficiaries[i].percentage) / 100;
               if (share > 0) {
                    (bool success, ) = beneficiaries[i].wallet.call{value: share}("");
                    require(success, "AfterchainWill: ETH transfer failed");
                    emit EthDistributed(beneficiaries[i].wallet, share);
               }
          }
     }

     function _validateBeneficiaries(Beneficiary[] memory _beneficiaries) internal pure {
          require(_beneficiaries.length > 0, "AfterchainWill: no beneficiaries");
          uint256 total = 0;
          for (uint256 i = 0; i < _beneficiaries.length; i++) {
               require(_beneficiaries[i].wallet != address(0), "AfterchainWill: zero beneficiary address");
               require(_beneficiaries[i].percentage > 0, "AfterchainWill: zero percentage");
               total += _beneficiaries[i].percentage;
          }
          require(total == 100, "AfterchainWill: percentages must sum to 100");
     }
}