     1|import { expect } from "chai";
     2|import { ethers } from "hardhat";
     3|import { time } from "@nomicfoundation/hardhat-network-helpers";
     4|import { AfterchainWill, AfterchainRegistry } from "../typechain-types";
     5|
     6|describe("AfterchainWill", function () {
     7|  async function deployFixture() {
     8|    const [owner, beneficiary1, beneficiary2, stranger] = await ethers.getSigners();
     9|
    10|    const Registry = await ethers.getContractFactory("AfterchainRegistry");
    11|    const registry = (await Registry.deploy()) as AfterchainRegistry;
    12|
    13|    const beneficiaries = [
    14|      { wallet: beneficiary1.address, percentage: 60, label: "spouse" },
    15|      { wallet: beneficiary2.address, percentage: 40, label: "charity" },
    16|    ];
    17|
    18|    const tx = await registry.connect(owner).deployWill(30, beneficiaries);
    19|    const receipt = await tx.wait();
    20|
    21|    const willAddress = await registry.getWill(owner.address);
    22|    const will = (await ethers.getContractAt("AfterchainWill", willAddress)) as AfterchainWill;
    23|
    24|    return { will, registry, owner, beneficiary1, beneficiary2, stranger };
    25|  }
    26|
    27|  describe("Deployment", function () {
    28|    it("sets the correct owner", async function () {
    29|      const { will, owner } = await deployFixture();
    30|      expect(await will.owner()).to.equal(owner.address);
    31|    });
    32|
    33|    it("sets heartbeat interval to 30 days", async function () {
    34|      const { will } = await deployFixture();
    35|      expect(await will.heartbeatInterval()).to.equal(30 * 24 * 60 * 60);
    36|    });
    37|
    38|    it("registers the will in the registry", async function () {
    39|      const { registry, owner, will } = await deployFixture();
    40|      expect(await registry.getWill(owner.address)).to.equal(await will.getAddress());
    41|    });
    42|  });
    43|
    44|  describe("Heartbeat", function () {
    45|    it("owner can send heartbeat", async function () {
    46|      const { will, owner } = await deployFixture();
    47|      await expect(will.connect(owner).heartbeat()).to.emit(will, "HeartbeatSent");
    48|    });
    49|
    50|    it("non-owner cannot send heartbeat", async function () {
    51|      const { will, stranger } = await deployFixture();
    52|      await expect(will.connect(stranger).heartbeat()).to.be.revertedWith("AfterchainWill: not owner");
    53|    });
    54|  });
    55|
    56|  describe("Execute Will", function () {
    57|    it("cannot execute before interval lapses", async function () {
    58|      const { will, stranger } = await deployFixture();
    59|      await expect(will.connect(stranger).executeWill()).to.be.revertedWith(
    60|        "AfterchainWill: owner is still alive"
    61|      );
    62|    });
    63|
    64|    it("executes and distributes ETH after interval", async function () {
    65|      const { will, owner, beneficiary1, beneficiary2 } = await deployFixture();
    66|
    67|      // Fund the will
    68|      await owner.sendTransaction({ to: await will.getAddress(), value: ethers.parseEther("1.0") });
    69|
    70|      // Advance time past heartbeat interval
    71|      await time.increase(31 * 24 * 60 * 60);
    72|
    73|      const b1Before = await ethers.provider.getBalance(beneficiary1.address);
    74|      const b2Before = await ethers.provider.getBalance(beneficiary2.address);
    75|
    76|      await expect(will.executeWill()).to.emit(will, "WillExecuted");
    77|
    78|      const b1After = await ethers.provider.getBalance(beneficiary1.address);
    79|      const b2After = await ethers.provider.getBalance(beneficiary2.address);
    80|
    81|      expect(b1After - b1Before).to.equal(ethers.parseEther("0.6"));
    82|      expect(b2After - b2Before).to.equal(ethers.parseEther("0.4"));
    83|    });
    84|
    85|    it("cannot execute twice", async function () {
    86|      const { will } = await deployFixture();
    87|      await time.increase(31 * 24 * 60 * 60);
    88|      await will.executeWill();
    89|      await expect(will.executeWill()).to.be.revertedWith("AfterchainWill: will already executed");
    90|    });
    91|  });
    92|
    93|  describe("Update Will", function () {
    94|    it("owner can update beneficiaries", async function () {
    95|      const { will, owner, beneficiary1, beneficiary2 } = await deployFixture();
    96|      const newBeneficiaries = [
    97|        { wallet: beneficiary1.address, percentage: 100, label: "sole heir" },
    98|      ];
    99|      await expect(will.connect(owner).updateWill(newBeneficiaries)).to.emit(will, "WillUpdated");
   100|    });
   101|
   102|    it("rejects percentages not summing to 100", async function () {
   103|      const { will, owner, beneficiary1 } = await deployFixture();
   104|      const bad = [{ wallet: beneficiary1.address, percentage: 50, label: "partial" }];
   105|      await expect(will.connect(owner).updateWill(bad)).to.be.revertedWith(
   106|        "AfterchainWill: percentages must sum to 100"
   107|      );
   108|    });
   109|  });
   110|
   111|  describe("Status", function () {
   112|    it("returns correct days remaining", async function () {
   113|      const { will } = await deployFixture();
   114|      const [executed, , daysRemaining] = await will.getWillStatus();
   115|      expect(executed).to.be.false;
   116|      expect(daysRemaining).to.be.closeTo(30n, 1n);
   117|    });
   118|  });
   119|});
   120|