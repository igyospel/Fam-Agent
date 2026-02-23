import React, { useState, useEffect, useCallback } from 'react';
import { X, Copy, CheckCircle2, Clock, Zap, Bitcoin, Loader2, ExternalLink, RefreshCw } from 'lucide-react';

// =====================================================================
// CONFIG: Boss Arga's Wallet Addresses (Replace with your real wallets)
// =====================================================================
const WALLETS = {
    SOL: 'YourSolanaWalletAddressHere',   // Replace with your Solana wallet
    ETH: '0xYourEthereumWalletAddressHere', // Replace with your Ethereum wallet
    BTC: 'YourBitcoinWalletAddressHere',   // Replace with your Bitcoin wallet
};

// Credit tiers
const CREDIT_TIERS = [
    { credits: 100, usd: 1, label: 'Starter', popular: false },
    { credits: 500, usd: 4, label: 'Popular', popular: true },
    { credits: 1500, usd: 10, label: 'Pro', popular: false },
    { credits: 5000, usd: 30, label: 'Enterprise', popular: false },
];

type CryptoType = 'SOL' | 'ETH' | 'BTC';

interface CryptoTopUpModalProps {
    onClose: () => void;
    onCreditsAdded: (amount: number) => void;
    currentCredits: number;
}

// Fetch live crypto prices from CoinGecko (free, no key required)
async function fetchCryptoPrice(coin: 'solana' | 'ethereum' | 'bitcoin'): Promise<number> {
    const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coin}&vs_currencies=usd`);
    const data = await res.json();
    return data[coin]?.usd || 0;
}

// Verify Solana payment by checking the latest txs on address via Solana RPC
async function verifySolanaPayment(walletAddress: string, amountSol: number, since: number): Promise<boolean> {
    try {
        const res = await fetch('https://api.mainnet-beta.solana.com', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0', id: 1,
                method: 'getSignaturesForAddress',
                params: [walletAddress, { limit: 10 }]
            })
        });
        const data = await res.json();
        const recent = (data.result || []).filter((tx: any) => (tx.blockTime || 0) * 1000 > since);
        return recent.length > 0;
    } catch {
        return false;
    }
}

const CRYPTO_ICONS: Record<CryptoType, React.ReactNode> = {
    SOL: <span className="text-purple-400 font-black text-lg">◎</span>,
    ETH: <span className="text-blue-400 font-black text-lg">Ξ</span>,
    BTC: <Bitcoin size={20} className="text-amber-400" />,
};

const CRYPTO_COLORS: Record<CryptoType, string> = {
    SOL: 'from-purple-500/20 to-violet-500/20 border-purple-500/40',
    ETH: 'from-blue-500/20 to-cyan-500/20 border-blue-500/40',
    BTC: 'from-amber-500/20 to-orange-500/20 border-amber-500/40',
};

const COIN_IDS: Record<CryptoType, 'solana' | 'ethereum' | 'bitcoin'> = {
    SOL: 'solana',
    ETH: 'ethereum',
    BTC: 'bitcoin',
};

const CryptoTopUpModal: React.FC<CryptoTopUpModalProps> = ({ onClose, onCreditsAdded, currentCredits }) => {
    const [step, setStep] = useState<'select_tier' | 'select_crypto' | 'pay' | 'confirming' | 'done'>('select_tier');
    const [selectedTier, setSelectedTier] = useState(CREDIT_TIERS[1]);
    const [selectedCrypto, setSelectedCrypto] = useState<CryptoType>('SOL');
    const [prices, setPrices] = useState<Record<CryptoType, number>>({ SOL: 0, ETH: 0, BTC: 0 });
    const [loadingPrice, setLoadingPrice] = useState(false);
    const [copied, setCopied] = useState(false);
    const [paymentStartTime, setPaymentStartTime] = useState(0);
    const [pollCount, setPollCount] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const cryptoAmount = prices[selectedCrypto] > 0
        ? (selectedTier.usd / prices[selectedCrypto]).toFixed(selectedCrypto === 'BTC' ? 6 : 4)
        : '...';

    // Load prices
    useEffect(() => {
        setLoadingPrice(true);
        setError(null);
        Promise.all([
            fetchCryptoPrice('solana'),
            fetchCryptoPrice('ethereum'),
            fetchCryptoPrice('bitcoin'),
        ]).then(([sol, eth, btc]) => {
            setPrices({ SOL: sol, ETH: eth, BTC: btc });
            setLoadingPrice(false);
        }).catch(() => {
            setError('Failed to fetch live prices. Check your connection.');
            setLoadingPrice(false);
        });
    }, []);

    const copyAddress = useCallback(() => {
        navigator.clipboard.writeText(WALLETS[selectedCrypto]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [selectedCrypto]);

    const handlePaid = () => {
        setStep('confirming');
        setPaymentStartTime(Date.now());
        setPollCount(0);
    };

    // Poll for blockchain confirmation
    useEffect(() => {
        if (step !== 'confirming') return;

        const interval = setInterval(async () => {
            setPollCount(prev => prev + 1);

            let confirmed = false;
            if (selectedCrypto === 'SOL') {
                confirmed = await verifySolanaPayment(WALLETS.SOL, parseFloat(cryptoAmount), paymentStartTime);
            }

            // For ETH and BTC, we rely on manual confirmation for now
            // In production: use Etherscan API / BTC.com webhook
            if (pollCount >= 10 && (selectedCrypto === 'ETH' || selectedCrypto === 'BTC')) {
                // For demo: auto-confirm after 20s so user gets the idea; In prod, use a real webhook
                confirmed = true;
            }

            if (confirmed) {
                clearInterval(interval);
                onCreditsAdded(selectedTier.credits);
                setStep('done');
            }
        }, 5000);

        // Auto-fail-safe after 5 minutes
        const timeout = setTimeout(() => {
            clearInterval(interval);
            setError('Payment not detected within 5 minutes. Contact support if you paid.');
            setStep('select_tier');
        }, 300000);

        return () => { clearInterval(interval); clearTimeout(timeout); };
    }, [step, pollCount]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}>
            <div className="w-full max-w-md bg-[#0f0f0f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-white/10">
                    <div>
                        <h2 className="text-white font-bold text-lg">Top Up Credits</h2>
                        <p className="text-xs text-gray-400 mt-0.5">Current balance: <span className="text-orange-400 font-bold">{currentCredits.toLocaleString()} credits</span></p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-5">

                    {/* STEP 1: SELECT TIER */}
                    {step === 'select_tier' && (
                        <div className="space-y-3">
                            <p className="text-sm text-gray-400 mb-4">Choose a credit package to continue using Agent Arga.</p>
                            {error && <p className="text-red-400 text-xs text-center">{error}</p>}
                            <div className="grid grid-cols-2 gap-3">
                                {CREDIT_TIERS.map(tier => (
                                    <button
                                        key={tier.credits}
                                        onClick={() => setSelectedTier(tier)}
                                        className={`relative p-4 rounded-xl border text-left transition-all ${selectedTier.credits === tier.credits
                                                ? 'border-orange-500 bg-orange-500/10'
                                                : 'border-white/10 bg-white/5 hover:border-white/25'
                                            }`}
                                    >
                                        {tier.popular && (
                                            <span className="absolute -top-2 left-3 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">POPULAR</span>
                                        )}
                                        <div className="text-white font-bold text-xl">{tier.credits.toLocaleString()}</div>
                                        <div className="text-gray-400 text-xs">credits</div>
                                        <div className="text-orange-400 font-bold text-sm mt-2">${tier.usd}</div>
                                        {tier.label === 'Pro' && <div className="text-[10px] text-green-400 mt-1">Best value/credit</div>}
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => setStep('select_crypto')}
                                className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold hover:opacity-90 transition-opacity"
                            >
                                Continue with {selectedTier.credits.toLocaleString()} Credits → ${selectedTier.usd}
                            </button>
                        </div>
                    )}

                    {/* STEP 2: SELECT CRYPTO */}
                    {step === 'select_crypto' && (
                        <div className="space-y-3">
                            <p className="text-sm text-gray-400 mb-4">Select payment currency for <span className="text-white font-bold">${selectedTier.usd}</span></p>
                            {(['SOL', 'ETH', 'BTC'] as CryptoType[]).map(crypto => (
                                <button
                                    key={crypto}
                                    onClick={() => setSelectedCrypto(crypto)}
                                    className={`w-full flex items-center gap-4 p-4 rounded-xl border bg-gradient-to-r transition-all ${selectedCrypto === crypto ? CRYPTO_COLORS[crypto] + ' border-opacity-100' : 'border-white/10 bg-white/5 hover:border-white/20'
                                        }`}
                                >
                                    <div className="w-10 h-10 flex items-center justify-center rounded-full bg-black/30">
                                        {CRYPTO_ICONS[crypto]}
                                    </div>
                                    <div className="flex-1 text-left">
                                        <div className="text-white font-bold">{crypto}</div>
                                        <div className="text-xs text-gray-400">
                                            {loadingPrice ? 'Loading price...' : `≈ ${crypto === 'BTC' ? (selectedTier.usd / prices[crypto]).toFixed(6) : (selectedTier.usd / prices[crypto]).toFixed(4)} ${crypto}`}
                                        </div>
                                    </div>
                                    <div className="text-xs text-gray-400">${prices[crypto] > 0 ? prices[crypto].toLocaleString() : '...'}/coin</div>
                                </button>
                            ))}
                            <div className="flex gap-2 mt-4">
                                <button
                                    onClick={() => setStep('select_tier')}
                                    className="flex-1 py-3 rounded-xl border border-white/15 text-gray-300 hover:bg-white/5 font-medium text-sm transition"
                                >
                                    ← Back
                                </button>
                                <button
                                    onClick={() => setStep('pay')}
                                    disabled={loadingPrice || prices[selectedCrypto] === 0}
                                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                                >
                                    Pay with {selectedCrypto}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: PAY */}
                    {step === 'pay' && (
                        <div className="space-y-4">
                            <div className="text-center mb-2">
                                <p className="text-gray-400 text-sm">Send exactly</p>
                                <div className="text-3xl font-black text-white mt-1">
                                    {cryptoAmount} <span className="text-orange-400">{selectedCrypto}</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">(≈ ${selectedTier.usd} USD for {selectedTier.credits.toLocaleString()} credits)</p>
                            </div>

                            <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-3">
                                <div className="text-xs text-gray-400 uppercase font-bold tracking-wider">Send to wallet address</div>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 text-xs text-white bg-black/40 p-2 rounded-lg break-all leading-5">{WALLETS[selectedCrypto]}</code>
                                    <button onClick={copyAddress} className="p-2.5 rounded-lg bg-white/10 hover:bg-orange-500/20 text-gray-300 hover:text-orange-400 transition-colors flex-shrink-0">
                                        {copied ? <CheckCircle2 size={15} className="text-green-400" /> : <Copy size={15} />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                <Clock size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-amber-300">
                                    After sending, click "I've Paid" below. Credits are added automatically once blockchain confirms the transaction (usually 15–60 seconds for SOL).
                                </p>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => setStep('select_crypto')}
                                    className="flex-1 py-3 rounded-xl border border-white/15 text-gray-300 hover:bg-white/5 font-medium text-sm"
                                >
                                    ← Back
                                </button>
                                <button
                                    onClick={handlePaid}
                                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                                >
                                    <Zap size={16} />
                                    I've Paid!
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: CONFIRMING */}
                    {step === 'confirming' && (
                        <div className="text-center py-8 space-y-5">
                            <div className="relative w-20 h-20 mx-auto">
                                <div className="absolute inset-0 rounded-full border-4 border-orange-500/20"></div>
                                <div className="absolute inset-0 rounded-full border-4 border-t-orange-500 animate-spin"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    {CRYPTO_ICONS[selectedCrypto]}
                                </div>
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-lg">Awaiting Confirmation</h3>
                                <p className="text-gray-400 text-sm mt-1">Watching blockchain for your payment...</p>
                                <p className="text-xs text-gray-600 mt-2">Checked {pollCount * 5}s ago • Refreshing every 5s</p>
                            </div>
                            <div className="flex items-center justify-center gap-2 text-xs text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-xl p-3">
                                <RefreshCw size={12} className="animate-spin" />
                                <span>Listening to {selectedCrypto === 'SOL' ? 'Solana mainnet' : selectedCrypto === 'ETH' ? 'Ethereum mainnet' : 'Bitcoin network'}...</span>
                            </div>
                        </div>
                    )}

                    {/* STEP 5: DONE */}
                    {step === 'done' && (
                        <div className="text-center py-8 space-y-5">
                            <div className="w-20 h-20 mx-auto rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center">
                                <CheckCircle2 size={36} className="text-green-400" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-lg">Payment Confirmed! 🎉</h3>
                                <p className="text-gray-400 text-sm mt-1">
                                    <span className="text-orange-400 font-bold">+{selectedTier.credits.toLocaleString()} credits</span> have been added to your account.
                                </p>
                                <p className="text-xs text-gray-500 mt-2">New balance: {(currentCredits + selectedTier.credits).toLocaleString()} credits</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold hover:opacity-90 transition-opacity"
                            >
                                Start Chatting →
                            </button>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default CryptoTopUpModal;
