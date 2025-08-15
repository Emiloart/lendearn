// App.js - final merged on-chain version (P2PLoan v3) - updated with cancelLoan
import React, { useState, useEffect, useCallback } from "react";
import { BrowserProvider, Contract, formatEther, parseEther } from "ethers";
import "./App.css";

/** ---------------- helpers: addresses, wei math, provider refresh ---------------- */
const isAddress = (a) => /^0x[a-fA-F0-9]{40}$/.test(a || "");
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const toWei = (amountStr) => parseEther(String(amountStr || "0"));

async function refreshProviderSigner() {
  const prov = new BrowserProvider(window.ethereum);
  const signer = await prov.getSigner();
  const addr = await signer.getAddress();
  return { prov, signer, addr };
}

async function ensureUnstablenet(provider) {
  if (!provider) return;
  const net = await provider.getNetwork();
  if (Number(net.chainId) !== 8080) {
    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: "0x1F90", // 8080
          chainName: "Shardeum Unstablenet",
          rpcUrls: ["https://api-unstable.shardeum.org"],
          nativeCurrency: { name: "Shardeum", symbol: "SHM", decimals: 18 },
          blockExplorerUrls: ["https://explorer-unstable.shardeum.org/"],
        },
      ],
    });
  }
}

/** ---------------- contract (P2PLoan v3) ---------------- */
// final contract & ABI (includes cancelLoan)
const CONTRACT_ADDRESS = "0x34a6321aAb1BcbD7943DEaC51f7259528D38A843";
const CONTRACT_ABI = [
  {
    "inputs":[{"internalType":"uint256","name":"loanId","type":"uint256"}],
    "name":"acceptLoan","outputs":[],"stateMutability":"payable","type":"function"
  },
  {
    "inputs":[{"internalType":"uint256","name":"loanId","type":"uint256"},{"internalType":"address","name":"optionalReferrer","type":"address"}],
    "name":"acceptLoanWithRef","outputs":[],"stateMutability":"payable","type":"function"
  },
  {"inputs":[{"internalType":"uint256","name":"loanId","type":"uint256"}],"name":"cancelLoan","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"loanId","type":"uint256"}],"name":"claimCollateral","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"_borrower","type":"address"},{"internalType":"uint256","name":"_amount","type":"uint256"},{"internalType":"uint256","name":"_paybackAmount","type":"uint256"},{"internalType":"uint256","name":"_dueDays","type":"uint256"},{"internalType":"bool","name":"_preSigned","type":"bool"},{"internalType":"uint256","name":"_collateralRequired","type":"uint256"}],"name":"createLoan","outputs":[],"stateMutability":"payable","type":"function"},
  {"inputs":[],"name":"depositRewardPool","outputs":[],"stateMutability":"payable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"_referrerRewardWei","type":"uint256"},{"internalType":"uint256","name":"_borrowerRewardWei","type":"uint256"}],"stateMutability":"nonpayable","type":"constructor"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"loanId","type":"uint256"},{"indexed":true,"internalType":"address","name":"lender","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"CollateralClaimed","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"loanId","type":"uint256"},{"indexed":true,"internalType":"address","name":"borrower","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"FundsReleased","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"loanId","type":"uint256"},{"indexed":true,"internalType":"address","name":"borrower","type":"address"},{"indexed":false,"internalType":"uint256","name":"collateralAmount","type":"uint256"}],"name":"LoanAccepted","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"loanId","type":"uint256"},{"indexed":true,"internalType":"address","name":"lender","type":"address"},{"indexed":false,"internalType":"uint256","name":"amountRefunded","type":"uint256"}],"name":"LoanCancelled","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"loanId","type":"uint256"},{"indexed":true,"internalType":"address","name":"borrowerPreset","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"paybackAmount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"dueDays","type":"uint256"},{"indexed":false,"internalType":"bool","name":"preSigned","type":"bool"},{"indexed":false,"internalType":"uint256","name":"collateralAmount","type":"uint256"}],"name":"LoanCreated","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"loanId","type":"uint256"},{"indexed":true,"internalType":"address","name":"borrower","type":"address"}],"name":"LoanRepaid","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"borrower","type":"address"},{"indexed":true,"internalType":"address","name":"referrer","type":"address"},{"indexed":false,"internalType":"uint256","name":"borrowerReward","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"referrerReward","type":"uint256"}],"name":"ReferralRewardPaid","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"borrower","type":"address"},{"indexed":true,"internalType":"address","name":"referrer","type":"address"}],"name":"ReferrerSet","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"RewardPoolDeposited","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"RewardPoolWithdrawn","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"referrerRewardWei","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"borrowerRewardWei","type":"uint256"}],"name":"RewardsUpdated","type":"event"},
  {"inputs":[{"internalType":"address","name":"ref","type":"address"}],"name":"setReferrer","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"_referrerRewardWei","type":"uint256"},{"internalType":"uint256","name":"_borrowerRewardWei","type":"uint256"}],"name":"setRewards","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"address payable","name":"to","type":"address"}],"name":"withdrawRewardPool","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"stateMutability":"payable","type":"receive"},
  {"inputs":[],"name":"borrowerRewardWei","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"cancelled","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"collateralBalance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"loanId","type":"uint256"}],"name":"getLoan","outputs":[{"components":[{"internalType":"address payable","name":"lender","type":"address"},{"internalType":"address payable","name":"borrower","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"paybackAmount","type":"uint256"},{"internalType":"uint256","name":"dueDays","type":"uint256"},{"internalType":"uint256","name":"dueDate","type":"uint256"},{"internalType":"uint256","name":"collateralAmount","type":"uint256"},{"internalType":"bool","name":"preSigned","type":"bool"},{"internalType":"bool","name":"active","type":"bool"},{"internalType":"bool","name":"repaid","type":"bool"},{"internalType":"uint256","name":"startTime","type":"uint256"}],"internalType":"struct P2PLoanV3.Loan","name":"","type":"tuple"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"getRewardPoolBalance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"loanCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"loans","outputs":[{"internalType":"address payable","name":"lender","type":"address"},{"internalType":"address payable","name":"borrower","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"paybackAmount","type":"uint256"},{"internalType":"uint256","name":"dueDays","type":"uint256"},{"internalType":"uint256","name":"dueDate","type":"uint256"},{"internalType":"uint256","name":"collateralAmount","type":"uint256"},{"internalType":"bool","name":"preSigned","type":"bool"},{"internalType":"bool","name":"active","type":"bool"},{"internalType":"bool","name":"repaid","type":"bool"},{"internalType":"uint256","name":"startTime","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"referralRewardPaid","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"referrerOf","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"referrerRewardWei","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"rewardPoolBalance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}
];

/** ---------------- App ---------------- */
function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [address, setAddress] = useState("");
  const [balance, setBalance] = useState("0");
  const [loans, setLoans] = useState([]);
  const [newLoan, setNewLoan] = useState({
    borrower: "",
    amount: "",
    paybackAmount: "",
    dueDate: "",
    preSigned: false,
    collateralAmount: ""
  });
  const [referrer, setReferrer] = useState("");
  const [referralLink, setReferralLink] = useState("");
  const [completedLoans, setCompletedLoans] = useState(0);

  const poolAddress = "0xEC69CE6bD6C0D7bE4Ea64FBb3eC9AF39C0F5B6ed"; // legacy (optional)

  const [rewardPoolOnContract, setRewardPoolOnContract] = useState("0");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [depositAmount, setDepositAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [referralCount, setReferralCount] = useState(0);
  const [contract, setContract] = useState(null);

  /** ---------------- init: read ?ref= ---------------- */
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get("ref");
    if (ref && isAddress(ref)) {
      setReferrer(ref);
      const storedCounts = JSON.parse(localStorage.getItem("referralCounts") || "{}");
      storedCounts[ref] = (storedCounts[ref] || 0) + 1;
      localStorage.setItem("referralCounts", JSON.stringify(storedCounts));
    }
  }, []);

  /** ---------------- react to account / chain changes ---------------- */
  useEffect(() => {
    if (!window.ethereum) return;

    const onAccounts = async () => {
      try {
        const { prov, signer: s, addr } = await refreshProviderSigner();
        setProvider(prov);
        setSigner(s);
        setAddress(addr);
        setContract(new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, s));
      } catch (e) {
        console.warn("onAccounts handler error", e);
      }
    };
    const onChain = async () => {
      try {
        const { prov, signer: s, addr } = await refreshProviderSigner();
        setProvider(prov);
        setSigner(s);
        setAddress(addr);
        setContract(new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, s));
      } catch (e) {
        console.warn("onChain handler error", e);
      }
    };

    window.ethereum.on?.("accountsChanged", onAccounts);
    window.ethereum.on?.("chainChanged", onChain);
    return () => {
      window.ethereum.removeListener?.("accountsChanged", onAccounts);
      window.ethereum.removeListener?.("chainChanged", onChain);
    };
  }, []);

  /** ---------------- event-driven refresh ---------------- */
  useEffect(() => {
    if (!contract) return;

    const refresh = () => refreshData();

    try {
      contract.on("LoanCreated", refresh);
      contract.on("LoanAccepted", refresh);
      contract.on("LoanRepaid", refresh);
      contract.on("CollateralClaimed", refresh);
      contract.on("FundsReleased", refresh);
      contract.on("ReferralRewardPaid", refresh);
      contract.on("RewardPoolDeposited", refresh);
      contract.on("RewardPoolWithdrawn", refresh);
      contract.on("LoanCancelled", refresh);
    } catch (e) {
      console.warn("Event subscription error", e);
    }

    return () => {
      try {
        contract.removeAllListeners("LoanCreated");
        contract.removeAllListeners("LoanAccepted");
        contract.removeAllListeners("LoanRepaid");
        contract.removeAllListeners("CollateralClaimed");
        contract.removeAllListeners("FundsReleased");
        contract.removeAllListeners("ReferralRewardPaid");
        contract.removeAllListeners("RewardPoolDeposited");
        contract.removeAllListeners("RewardPoolWithdrawn");
        contract.removeAllListeners("LoanCancelled");
      } catch (e) {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contract]);

  /** ---------------- load loans from chain ---------------- */
  const loadLoans = useCallback(async () => {
    if (!contract) return;
    try {
      const count = Number(await contract.loanCount());
      const list = [];
      for (let i = 0; i < count; i++) {
        const loan = await contract.getLoan(i);
        list.push({
          id: i,
          lender: loan.lender,
          borrower: loan.borrower,
          amount: formatEther(loan.amount),
          paybackAmount: formatEther(loan.paybackAmount),
          dueDate: Number(loan.dueDays),           // contract stores dueDays
          collateralAmount: formatEther(loan.collateralAmount),
          preSigned: loan.preSigned,
          active: loan.active,
          repaid: loan.repaid,
          startTime: Number(loan.startTime),       // epoch seconds
        });
      }
      setLoans(list);
    } catch (error) {
      console.error("Load loans error:", error?.message || error);
    }
  }, [contract]);

  const refreshData = useCallback(async () => {
    if (provider && address) {
      try {
        const bal = formatEther(await provider.getBalance(address));
        setBalance(bal);

        // read contract's internal reward pool if contract present
        if (contract) {
          try {
            // prefer explicit getter
            let rp = null;
            if (contract.getRewardPoolBalance) {
              rp = await contract.getRewardPoolBalance();
            } else if (contract.rewardPoolBalance) {
              rp = await contract.rewardPoolBalance();
            }
            setRewardPoolOnContract(rp ? formatEther(rp) : "0");
          } catch (err) {
            console.warn("reward pool read failed:", err?.message || err);
            setRewardPoolOnContract("0");
          }
        }

        await loadLoans();

        const storedCounts = JSON.parse(localStorage.getItem("referralCounts") || "{}");
        setReferralCount(storedCounts[address] || 0);
      } catch (error) {
        console.error("Refresh error:", error?.message || error);
      }
    }
  }, [provider, address, contract, loadLoans]);

  useEffect(() => {
    if (!address) return;
    (async () => { await refreshData(); })();
    const interval = setInterval(refreshData, 10000);
    return () => clearInterval(interval);
  }, [address, refreshData]);

  /** ---------------- wallet connect ---------------- */
  const connectWallet = async () => {
    setLoading(true);
    try {
      if (!window.ethereum) return alert("Install MetaMask!");

      await window.ethereum.request({ method: "eth_requestAccounts" });
      const prov = new BrowserProvider(window.ethereum);
      await ensureUnstablenet(prov);

      const sign = await prov.getSigner();
      const addr = await sign.getAddress();

      setProvider(prov);
      setSigner(sign);
      setAddress(addr);
      const c = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, sign);
      setContract(c);

      const bal = formatEther(await prov.getBalance(addr));
      setBalance(bal);

      // set referral link for copying
      setReferralLink(`${window.location.origin}?ref=${addr}`);

      const storedCounts = JSON.parse(localStorage.getItem("referralCounts") || "{}");
      setReferralCount(storedCounts[addr] || 0);

      // If there was a ?ref= on the page, try to set it on-chain for the connected account
      if (referrer && isAddress(referrer) && referrer.toLowerCase() !== addr.toLowerCase()) {
        try {
          const already = await c.referrerOf(addr);
          if (already === ZERO_ADDRESS) {
            // call setReferrer on-chain (requires a tx)
            const tx = await c.setReferrer(referrer);
            await tx.wait();
            console.log("Referrer set on-chain:", referrer);
          }
        } catch (err) {
          console.warn("Could not set referrer on-chain (skipping):", err?.message || err);
        }
      }
    } catch (err) {
      console.error(err);
      alert(err?.message || "Connection failed.");
    } finally {
      setLoading(false);
    }
  };

  /** ---------------- core loan actions ---------------- */
  const createLoan = async () => {
    if (!contract) return alert("Connect wallet first.");
    if (!newLoan.amount || Number(newLoan.amount) <= 0) return alert("Enter a valid amount.");
    if (newLoan.borrower && !isAddress(newLoan.borrower)) return alert("Invalid borrower address.");
    if (!newLoan.paybackAmount || Number(newLoan.paybackAmount) <= Number(newLoan.amount))
      return alert("Payback amount must be greater than amount.");
    if (!newLoan.dueDate || Number(newLoan.dueDate) <= 0) return alert("Enter due days.");
    if (newLoan.collateralAmount === "" || Number(newLoan.collateralAmount) < 0)
      return alert("Enter collateral required (SHM).");

    setLoading(true);
    try {
      // Contract expects: _borrower, _amount, _paybackAmount, _dueDays (uint256), _preSigned, _collateralRequired
      const tx = await contract.createLoan(
        newLoan.borrower && isAddress(newLoan.borrower) ? newLoan.borrower : ZERO_ADDRESS,
        toWei(newLoan.amount),
        toWei(newLoan.paybackAmount),
        Number(newLoan.dueDate),          // days as Number
        newLoan.preSigned,
        toWei(newLoan.collateralAmount),
        { value: toWei(newLoan.amount) }  // fund principal on-chain
      );
      await tx.wait();
      alert("Loan created successfully!");
      await refreshData();
      setNewLoan({ borrower: "", amount: "", paybackAmount: "", dueDate: "", preSigned: false, collateralAmount: "" });
    } catch (e) {
      console.error(e);
      alert("Create failed: " + (e?.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const acceptLoan = async (loanId) => {
    if (!contract) return alert("Connect wallet first.");
    setLoading(true);
    try {
      const loan = loans.find((l) => l.id === loanId);
      if (!loan) return alert("Loan not found.");

      // collateralWei: the loan.collateralAmount is formatted string (SHM); convert to wei
      const collateralWei = toWei(loan.collateralAmount || "0");

      // Use acceptLoanWithRef if we have a referrer locally and contract supports it
      if (referrer && isAddress(referrer) && referrer.toLowerCase() !== address.toLowerCase() && contract.acceptLoanWithRef) {
        const tx = await contract.acceptLoanWithRef(loanId, referrer, { value: collateralWei });
        await tx.wait();
      } else {
        const tx = await contract.acceptLoan(loanId, { value: collateralWei });
        await tx.wait();
      }

      alert("Loan accepted successfully!");
      await refreshData();
    } catch (e) {
      console.error(e);
      alert("Accept failed: " + (e?.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const repayLoan = async (loanId) => {
    if (!contract) return alert("Connect wallet first.");
    setLoading(true);
    try {
      const loan = loans.find((l) => l.id === loanId);
      if (!loan) return alert("Loan not found.");
      const tx = await contract.repayLoan(loanId, { value: toWei(loan.paybackAmount) });
      await tx.wait();
      alert("Loan repaid successfully!");
      setCompletedLoans((n) => n + 1);
      await refreshData();
    } catch (e) {
      console.error(e);
      alert("Repay failed: " + (e?.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const claimCollateral = async (loanId) => {
    if (!contract) return alert("Connect wallet first.");
    setLoading(true);
    try {
      const tx = await contract.claimCollateral(loanId);
      await tx.wait();
      alert("Collateral claimed successfully!");
      await refreshData();
    } catch (e) {
      console.error(e);
      alert("Claim failed: " + (e?.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  // NEW: cancelLoan (lender cancels an open offer and gets principal back)
  const cancelLoan = async (loanId) => {
    if (!contract) return alert("Connect wallet first.");
    setLoading(true);
    try {
      const loan = loans.find((l) => l.id === loanId);
      if (!loan) return alert("Loan not found.");
      if (loan.active) return alert("Cannot cancel an active loan (already accepted).");
      // call cancelLoan (assumes contract enforces only lender can cancel and refunds principal)
      if (!contract.cancelLoan) return alert("Contract does not support cancelLoan");
      const tx = await contract.cancelLoan(loanId);
      await tx.wait();
      alert("Loan cancelled and principal refunded.");
      await refreshData();
    } catch (e) {
      console.error(e);
      alert("Cancel failed: " + (e?.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  /** ---------------- reward pool actions (on-chain) ---------------- */
  const depositToPool = async () => {
    if (!contract) return alert("Connect wallet first.");
    if (!depositAmount || Number(depositAmount) <= 0) return alert("Enter deposit amount.");
    setLoading(true);
    try {
      // depositRewardPool is payable on the contract
      if (!contract.depositRewardPool) {
        return alert("Contract doesn't expose depositRewardPool");
      }
      const tx = await contract.depositRewardPool({ value: toWei(depositAmount) });
      await tx.wait();
      alert(`Deposited ${depositAmount} SHM to contract reward pool!`);
      // update on-contract pool balance
      let rp = "0";
      try {
        if (contract.getRewardPoolBalance) {
          const r = await contract.getRewardPoolBalance();
          rp = formatEther(r);
        } else if (contract.rewardPoolBalance) {
          const r = await contract.rewardPoolBalance();
          rp = formatEther(r);
        }
      } catch (e) {
        console.warn("pool read after deposit failed", e);
      }
      setRewardPoolOnContract(rp);
    } catch (error) {
      console.error("Deposit failed", error);
      alert("Deposit failed: " + (error?.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  // Owner-only: withdraw reward pool to a recipient (callable only by contract owner)
  const withdrawRewardPool = async (amount, to) => {
    if (!contract) return alert("Connect wallet first.");
    if (!amount || Number(amount) <= 0) return alert("Enter amount");
    if (!isAddress(to)) return alert("Enter a valid recipient address");
    setLoading(true);
    try {
      // Verify owner
      const owner = await contract.owner();
      if (owner.toLowerCase() !== address.toLowerCase()) {
        setLoading(false);
        return alert("Only contract owner can withdraw reward pool. Connect with owner account.");
      }
      const amountWei = toWei(amount);
      const tx = await contract.withdrawRewardPool(amountWei, to);
      await tx.wait();
      alert(`Withdrew ${amount} SHM to ${to}`);
      const rp = await (contract.getRewardPoolBalance ? contract.getRewardPoolBalance() : contract.rewardPoolBalance());
      setRewardPoolOnContract(formatEther(rp));
    } catch (err) {
      console.error(err);
      alert("Withdraw failed: " + (err?.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  /** ---------------- misc helpers ---------------- */
  const isOverdue = (dueDays, startTime) => {
    return Date.now() > startTime * 1000 + Number(dueDays) * 86400000;
  };

  const referralStatus =
    completedLoans === 0
      ? "Pending"
      : "Active";

  /** ---------------- UI ---------------- */
  return (
    <div className="app-container">
      <div className="main-card">
        <h1>LendEarn SHM - P2P Lending with Referrals on Shardeum</h1>

        {!address ? (
          <button className="connect-button" disabled={loading} onClick={connectWallet}>
            {loading ? "Loading..." : "Connect Wallet"}
          </button>
        ) : (
          <>
            <div className="info-grid">
              <p><strong>Address:</strong> {address}</p>
              <p><strong>Balance:</strong> {balance} SHM</p>
              <p className="full-span"><strong>Referral Link:</strong> <a href={referralLink}>{referralLink}</a></p>
              {referrer && <p className="full-span"><strong>Referred by:</strong> {referrer}</p>}
              <p className="full-span"><strong>Reward Pool (on-contract):</strong> {rewardPoolOnContract} SHM</p>

              <input placeholder="Amount to Deposit" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} />
              <button disabled={loading} onClick={depositToPool}>{loading ? 'Loading...' : 'Deposit to Contract Pool'}</button>

              {/* Owner withdraw helper (optional) */}
              <div style={{ marginTop: 8 }}>
                <small>Owner actions (withdraw):</small>
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <input id="withdrawAmount" placeholder="amount (SHM)" />
                  <input id="withdrawTo" placeholder="recipient address" />
                  <button onClick={() => {
                    const amt = document.getElementById("withdrawAmount").value;
                    const to = document.getElementById("withdrawTo").value;
                    withdrawRewardPool(amt, to);
                  }}>Withdraw</button>
                </div>
              </div>
            </div>

            <div className="tab-bar">
              <button className={`tab-button ${activeTab === "dashboard" ? "active" : "inactive"}`} onClick={() => setActiveTab("dashboard")}>Dashboard</button>
              <button className={`tab-button ${activeTab === "create" ? "active" : "inactive"}`} onClick={() => setActiveTab("create")}>Create Loan</button>
              <button className={`tab-button ${activeTab === "browse" ? "active" : "inactive"}`} onClick={() => setActiveTab("browse")}>Browse Loans</button>
              <button className={`tab-button ${activeTab === "referrals" ? "active" : "inactive"}`} onClick={() => setActiveTab("referrals")}>Referrals</button>
            </div>

            {activeTab === "dashboard" && (
              <div className="section">
                <h2>Your Loans</h2>
                <ul>
                  {loans.map((loan) => {
                    const mine = loan.lender?.toLowerCase() === address.toLowerCase() || loan.borrower?.toLowerCase() === address.toLowerCase();
                    if (!mine) return null;
                    return (
                      <li key={loan.id}>
                        <p>
                          Lender: {loan.lender} | Borrower: {loan.borrower} | Amount: {loan.amount} SHM | Payback: {loan.paybackAmount} SHM | Due: {loan.dueDate} days | Collateral: {loan.collateralAmount} SHM | Pre-Signed: {loan.preSigned ? "Yes" : "No"}
                        </p>
                        <p>
                          Active: {loan.active ? "Yes" : "No"} | Repaid: {loan.repaid ? "Yes" : "No"} {isOverdue(loan.dueDate, loan.startTime) ? "(Overdue!)" : ""}
                        </p>

                        {loan.active && address.toLowerCase() === loan.borrower?.toLowerCase() && (
                          <button className="payback-button" disabled={loading} onClick={() => repayLoan(loan.id)}>
                            {loading ? "Loading..." : "Repay Loan"}
                          </button>
                        )}
                        {loan.active && address.toLowerCase() === loan.lender?.toLowerCase() && isOverdue(loan.dueDate, loan.startTime) && (
                          <button className="claim-button" disabled={loading} onClick={() => claimCollateral(loan.id)}>
                            {loading ? "Loading..." : "Claim Collateral"}
                          </button>
                        )}

                        {/* Cancel button for lender when offer is still open (not active, not repaid) */}
                        {!loan.active && !loan.repaid && address.toLowerCase() === loan.lender?.toLowerCase() && (
                          <button className="cancel-button" disabled={loading} onClick={() => cancelLoan(loan.id)}>
                            {loading ? "Loading..." : "Cancel Offer"}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {activeTab === "create" && (
              <div className="section">
                <h2>Create New Loan Offer</h2>
                <input placeholder="Borrower Address (optional for public)" value={newLoan.borrower} onChange={(e) => setNewLoan({ ...newLoan, borrower: e.target.value })} />
                <input placeholder="Amount (SHM)" value={newLoan.amount} onChange={(e) => setNewLoan({ ...newLoan, amount: e.target.value })} />
                <input placeholder="Payback Amount (SHM)" value={newLoan.paybackAmount} onChange={(e) => setNewLoan({ ...newLoan, paybackAmount: e.target.value })} />
                <input placeholder="Due in Days" value={newLoan.dueDate} onChange={(e) => setNewLoan({ ...newLoan, dueDate: e.target.value })} />
                <input placeholder="Collateral Required (SHM)" value={newLoan.collateralAmount} onChange={(e) => setNewLoan({ ...newLoan, collateralAmount: e.target.value })} />
                <label>Pre-Signed: <input type="checkbox" checked={newLoan.preSigned} onChange={(e) => setNewLoan({ ...newLoan, preSigned: e.target.checked })} /></label>
                <button onClick={createLoan}>Create Offer</button>
              </div>
            )}

            {activeTab === "browse" && (
              <div className="section">
                <h2>Browse Available Loans</h2>
                <ul>
                  {loans.map((loan) => {
                    if (loan.active) return null; // open loans only
                    return (
                      <li key={loan.id}>
                        <p>
                          Lender: {loan.lender} | Amount: {loan.amount} SHM | Payback: {loan.paybackAmount} SHM | Due: {loan.dueDate} days | Collateral Req: {loan.collateralAmount} SHM | Pre-Signed: {loan.preSigned ? "Yes" : "No"}
                        </p>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button className="accept-button" disabled={loading} onClick={() => acceptLoan(loan.id)}>
                            {loading ? "Loading..." : "Accept Loan"}
                          </button>
                          {/* Lender can cancel their open offer from browse too */}
                          {address.toLowerCase() === loan.lender?.toLowerCase() && (
                            <button className="cancel-button" disabled={loading} onClick={() => cancelLoan(loan.id)}>
                              {loading ? "Loading..." : "Cancel Offer"}
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {activeTab === "referrals" && (
              <div className="section">
                <h2>Referrals</h2>
                <p><strong>Status:</strong> {referralStatus}</p>
                <p><strong>Referral Count:</strong> {referralCount}</p>
                <p><strong>Completed Loans:</strong> {completedLoans}</p>
                <p>If you arrived with a referral link, the app attempts to set it on-chain (requires a tx). Rewards are paid on-chain if contract logic supports it.</p>
                <div style={{ marginTop: 8 }}>
                  <small>Referrer on-chain:</small>
                  <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    <input placeholder="referrer address" value={referrer} onChange={(e) => setReferrer(e.target.value)} />
                    <button onClick={async () => {
                      if (!contract) return alert("Connect wallet first");
                      try {
                        const already = await contract.referrerOf(address);
                        if (already && already !== ZERO_ADDRESS) return alert("Referrer already set on-chain");
                        const tx = await contract.setReferrer(referrer);
                        setLoading(true);
                        await tx.wait();
                        alert("Referrer set on-chain!");
                        setLoading(false);
                        await refreshData();
                      } catch (err) {
                        console.error(err);
                        alert("Set referrer failed: " + (err?.message || "Unknown error"));
                        setLoading(false);
                      }
                    }}>Set Referrer</button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default App;
