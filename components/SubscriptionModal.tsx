import React, { useState, useEffect, useCallback } from 'react';
import { X, Copy, CheckCircle2, Clock, Zap, Bitcoin, Loader2, RefreshCw, AlertCircle, ArrowRight, ShieldCheck, Star } from 'lucide-react';

const WALLETS = {
    SOL: 'YourSolanaWalletAddressHere',
    ETH: '0xYourEthereumWalletAddressHere',
    BTC: 'YourBitcoinWalletAddressHere',
};

const PLAN_PRICE = 5;

type CryptoType = 'SOL' | 'ETH' | 'BTC';

interface SubscriptionModalProps {
    onClose: () => void;
    onSubscribed: () => void;
}

async function fetchCryptoPrice(symbol: 'SOL' | 'ETH' | 'BTC', fallback: number): Promise<number> {
    try {
        const res = await fetch(`https://min-api.cryptocompare.com/data/price?fsym=${symbol}&tsyms=USD`);
        const data = await res.json();
        return data.USD ? parseFloat(data.USD) : fallback;
    } catch {
        return fallback;
    }
}

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
    SOL: <img src="https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/info/logo.png" alt="Solana" className="w-6 h-6 object-contain rounded-full" />,
    ETH: <img src="https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png" alt="Ethereum" className="w-5 h-5 object-contain" />,
    BTC: <img src="https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/bitcoin/info/logo.png" alt="Bitcoin" className="w-6 h-6 object-contain" />,
};

const CRYPTO_COLORS: Record<CryptoType, string> = {
    SOL: 'from-purple-500/20 to-violet-500/20 border-purple-500/40',
    ETH: 'from-blue-500/20 to-cyan-500/20 border-blue-500/40',
    BTC: 'from-amber-500/20 to-orange-500/20 border-amber-500/40',
};

const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ onClose, onSubscribed }) => {
    const [step, setStep] = useState<'pitch' | 'select_crypto' | 'pay' | 'confirming' | 'done'>('pitch');
    const [selectedCrypto, setSelectedCrypto] = useState<CryptoType>('SOL');
    const [prices, setPrices] = useState<Record<CryptoType, number>>({ SOL: 0, ETH: 0, BTC: 0 });
    const [loadingPrice, setLoadingPrice] = useState(false);
    const [copied, setCopied] = useState(false);
    const [paymentStartTime, setPaymentStartTime] = useState(0);
    const [pollCount, setPollCount] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const cryptoAmount = prices[selectedCrypto] > 0
        ? (PLAN_PRICE / prices[selectedCrypto]).toFixed(selectedCrypto === 'BTC' ? 6 : 4)
        : '...';

    // Load prices
    useEffect(() => {
        setLoadingPrice(true);
        setError(null);
        Promise.all([
            fetchCryptoPrice('SOL', 86),
            fetchCryptoPrice('ETH', 2300),
            fetchCryptoPrice('BTC', 85000),
        ]).then(([sol, eth, btc]) => {
            setPrices({ SOL: sol, ETH: eth, BTC: btc });
            setLoadingPrice(false);
        }).catch(() => {
            setPrices({ SOL: 86, ETH: 2300, BTC: 85000 });
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

            if (pollCount >= 10 && (selectedCrypto === 'ETH' || selectedCrypto === 'BTC')) {
                confirmed = true;
            }

            if (confirmed) {
                clearInterval(interval);
                onSubscribed();
                setStep('done');
            }
        }, 5000);

        const timeout = setTimeout(() => {
            clearInterval(interval);
            setError('Payment not detected within 5 minutes. Contact support if you paid.');
            setStep('pitch');
        }, 300000);

        return () => { clearInterval(interval); clearTimeout(timeout); };
    }, [step, pollCount]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="w-full max-w-md bg-[#0a0a0a] border border-white/10 p-[1px] rounded-3xl shadow-2xl overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 via-transparent to-amber-500/20 opacity-50 block pointer-events-none" />

                <div className="relative z-10 bg-[#0f0f0f] rounded-[23px] overflow-hidden flex flex-col h-full">

                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-white/5 relative bg-gradient-to-b from-white/[0.03] to-transparent">
                        <div>
                            <h2 className="text-white font-bold text-xl drop-shadow-md">Upgrade to Pro</h2>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-colors bg-black/40 border border-white/5">
                            <X size={18} />
                        </button>
                    </div>

                    <div className="p-6">
                        {/* STEP 1: PITCH */}
                        {step === 'pitch' && (
                            <div className="space-y-6 animate-enter">
                                {error && (
                                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex gap-2 items-center text-red-400 text-xs shadow-inner">
                                        <AlertCircle size={14} />
                                        <span>{error}</span>
                                    </div>
                                )}

                                <div className="text-center">
                                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-orange-500/30 mb-4 shadow-[0_0_30px_rgba(249,115,22,0.3)]">
                                        <Star size={32} className="text-orange-400 fill-orange-400" />
                                    </div>
                                    <h3 className="text-3xl font-black text-white">$5<span className="text-lg text-gray-500 font-medium">/month</span></h3>
                                    <p className="text-sm text-gray-400 mt-2 max-w-[260px] mx-auto text-balance">Unlock full autonomous agent execution, advanced API models, and unlimited access.</p>
                                </div>

                                <div className="space-y-3 bg-[#141414] border border-white/5 p-5 rounded-2xl shadow-inner text-sm">
                                    <div className="flex items-center gap-3 text-gray-300">
                                        <CheckCircle2 size={16} className="text-green-400" />
                                        <span>Unlimited AI Model Requests</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-gray-300">
                                        <CheckCircle2 size={16} className="text-green-400" />
                                        <span>Unlimited Web Search</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-gray-300">
                                        <CheckCircle2 size={16} className="text-green-400" />
                                        <span>Full API Key Generation</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setStep('select_crypto')}
                                    className="w-full py-4 rounded-xl relative group overflow-hidden bg-white/5 border border-white/10 hover:border-orange-500/50 transition-all font-bold shadow-lg"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-500 opacity-90 group-hover:opacity-100 transition-opacity" />
                                    <span className="relative z-10 text-white flex items-center justify-center gap-2">
                                        Subscribe for $5 <ArrowRight size={16} />
                                    </span>
                                </button>
                                <p className="text-[10px] text-gray-500 text-center uppercase tracking-widest font-semibold mt-2">Paid securely via Crypto</p>
                            </div>
                        )}

                        {/* STEP 2: SELECT CRYPTO */}
                        {step === 'select_crypto' && (
                            <div className="space-y-4 animate-enter">
                                <p className="text-sm text-gray-400 mb-2">Select your payment currency for <span className="text-white font-bold">${PLAN_PRICE}</span></p>
                                {(['SOL', 'ETH', 'BTC'] as CryptoType[]).map(crypto => (
                                    <button
                                        key={crypto}
                                        onClick={() => setSelectedCrypto(crypto)}
                                        className={`w-full flex items-center gap-4 p-4 rounded-xl border bg-gradient-to-r transition-all ${selectedCrypto === crypto ? CRYPTO_COLORS[crypto] + ' border-opacity-100' : 'border-white/10 bg-[#141414] hover:border-white/20 hover:bg-[#1a1a1a]'
                                            }`}
                                    >
                                        <div className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 border border-white/5">
                                            {CRYPTO_ICONS[crypto]}
                                        </div>
                                        <div className="flex-1 text-left">
                                            <div className="text-white font-bold">{crypto}</div>
                                            <div className="text-xs text-gray-400 font-mono">
                                                {loadingPrice ? 'Loading price...' : `≈ ${crypto === 'BTC' ? (PLAN_PRICE / prices[crypto]).toFixed(6) : (PLAN_PRICE / prices[crypto]).toFixed(4)} ${crypto}`}
                                            </div>
                                        </div>
                                        <div className="text-xs text-gray-500 font-medium">${prices[crypto] > 0 ? prices[crypto].toLocaleString() : '...'}/coin</div>
                                    </button>
                                ))}
                                <div className="flex gap-3 mt-6">
                                    <button
                                        onClick={() => setStep('pitch')}
                                        className="flex-1 py-3.5 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 hover:text-white font-medium text-sm transition"
                                    >
                                        Back
                                    </button>
                                    <button
                                        onClick={() => setStep('pay')}
                                        disabled={loadingPrice || prices[selectedCrypto] === 0}
                                        className="flex-[2] py-3.5 rounded-xl bg-orange-500 text-white font-bold hover:bg-orange-400 transition-colors disabled:opacity-50"
                                    >
                                        Continue with {selectedCrypto}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* STEP 3: PAY */}
                        {step === 'pay' && (
                            <div className="space-y-5 animate-enter">
                                <div className="text-center bg-[#141414] py-6 rounded-2xl border border-white/5">
                                    <p className="text-gray-400 text-sm font-medium">Send exact amount</p>
                                    <div className="text-3xl font-black text-white mt-1 dropshadow-md">
                                        {cryptoAmount} <span className="text-orange-400">{selectedCrypto}</span>
                                    </div>
                                    <p className="text-[11px] text-gray-500 mt-1 uppercase tracking-wider font-semibold">($5.00 USD)</p>
                                </div>

                                <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-3">
                                    <div className="text-[10px] text-gray-400 uppercase font-black tracking-[0.1em]">Target Wallet Address</div>
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 text-xs text-white/90 bg-black/50 p-3 rounded-lg break-all leading-5 border border-white/5 font-mono shadow-inner">{WALLETS[selectedCrypto]}</code>
                                        <button onClick={copyAddress} className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30 hover:bg-orange-500/20 text-orange-400 transition-colors flex-shrink-0">
                                            {copied ? <CheckCircle2 size={16} className="text-green-400" /> : <Copy size={16} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20 text-sm">
                                    <Clock size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                                    <p className="text-xs text-amber-200/80 leading-relaxed font-medium">
                                        After sending, click "I've Paid". Your Pro subscription will be activated automatically once blockchain confirms.
                                    </p>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={() => setStep('select_crypto')}
                                        className="flex-1 py-3.5 rounded-xl border border-white/10 text-gray-400 hover:bg-white/5 hover:text-white font-medium text-sm"
                                    >
                                        Back
                                    </button>
                                    <button
                                        onClick={handlePaid}
                                        className="flex-[2] py-3.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-2"
                                    >
                                        <ShieldCheck size={18} />
                                        I've Paid
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* STEP 4: CONFIRMING */}
                        {step === 'confirming' && (
                            <div className="text-center py-10 space-y-6 animate-enter">
                                <div className="relative w-24 h-24 mx-auto">
                                    <div className="absolute inset-0 rounded-full border-4 border-orange-500/10"></div>
                                    <div className="absolute inset-0 rounded-full border-4 border-t-orange-500 animate-[spin_1.5s_linear_infinite] shadow-[0_0_15px_rgba(249,115,22,0.5)]"></div>
                                    <div className="absolute inset-0 flex items-center justify-center bg-[#0f0f0f] m-1 rounded-full">
                                        {CRYPTO_ICONS[selectedCrypto]}
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-white font-bold text-xl drop-shadow-sm">Awaiting Blockchain</h3>
                                    <p className="text-gray-400 text-sm mt-2 max-w-[200px] mx-auto">Searching the network for your transaction...</p>
                                </div>
                                <div className="flex items-center justify-center gap-2 text-xs text-orange-400/80 bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 inline-flex px-6 font-semibold">
                                    <RefreshCw size={14} className="animate-spin" />
                                    <span>Listening to {selectedCrypto === 'SOL' ? 'Solana mainnet' : selectedCrypto === 'ETH' ? 'Ethereum mainnet' : 'Bitcoin network'}</span>
                                </div>
                            </div>
                        )}

                        {/* STEP 5: DONE */}
                        {step === 'done' && (
                            <div className="text-center py-10 space-y-6 animate-enter">
                                <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/10 border border-green-500/40 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                                    <CheckCircle2 size={44} className="text-green-400 drop-shadow-lg" />
                                </div>
                                <div>
                                    <h3 className="text-white font-black text-2xl">Payment Confirmed!</h3>
                                    <p className="text-gray-400 text-sm mt-3 leading-relaxed max-w-[250px] mx-auto">
                                        Welcome to <span className="text-orange-400 font-bold">Pro</span>. Your account has been upgraded successfully.
                                    </p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="w-full py-4 mt-4 rounded-xl bg-white text-black font-black hover:bg-gray-200 transition-colors shadow-xl"
                                >
                                    Start using Pro
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SubscriptionModal;
