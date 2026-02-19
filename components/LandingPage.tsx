import React, { useEffect, useRef } from 'react';
import { ArrowRight, Sparkles, FileText, Image, MessageSquare, Zap, Shield, Globe, ChevronRight } from 'lucide-react';

interface LandingPageProps {
    onGetStarted: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
    const heroRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!heroRef.current) return;
            const { clientX, clientY } = e;
            const { innerWidth, innerHeight } = window;
            const x = (clientX / innerWidth - 0.5) * 30;
            const y = (clientY / innerHeight - 0.5) * 30;
            heroRef.current.style.setProperty('--mouse-x', `${x}px`);
            heroRef.current.style.setProperty('--mouse-y', `${y}px`);
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    const features = [
        {
            icon: MessageSquare,
            title: 'Smart Conversations',
            desc: 'Chat naturally with an AI that understands context, remembers your history, and gives thoughtful responses.',
            color: 'from-orange-400 to-amber-500',
            bg: 'bg-orange-50',
        },
        {
            icon: FileText,
            title: 'Document Analysis',
            desc: 'Upload PDFs and documents. Agent Arga reads, summarizes, and answers questions from your files instantly.',
            color: 'from-blue-400 to-indigo-500',
            bg: 'bg-blue-50',
        },
        {
            icon: Image,
            title: 'Vision & Images',
            desc: 'Share images and get detailed analysis, descriptions, and insights powered by advanced vision models.',
            color: 'from-violet-400 to-purple-500',
            bg: 'bg-violet-50',
        },
    ];

    const stats = [
        { value: '1M+', label: 'Context Window' },
        { value: '< 1s', label: 'Response Time' },
        { value: '99.9%', label: 'Uptime' },
        { value: 'Free', label: 'To Use' },
    ];

    return (
        <div className="min-h-screen w-full bg-[#0A0A0F] text-white overflow-x-hidden overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>

            {/* Navbar */}
            <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-4 bg-[#0A0A0F]/80 backdrop-blur-xl border-b border-white/5">
                <div className="flex items-center gap-2">
                    <img src="/logowhite.png" alt="Agent Arga" className="h-7 md:h-9 w-auto object-contain" />
                </div>
                <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
                    <a href="#features" className="hover:text-white transition-colors">Features</a>
                    <a href="#how" className="hover:text-white transition-colors">How it works</a>
                    <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
                </div>
                <button
                    onClick={onGetStarted}
                    className="flex items-center gap-2 bg-white text-gray-900 px-4 py-2 rounded-full text-sm font-semibold hover:bg-orange-50 transition-all hover:scale-105 active:scale-95"
                >
                    Get Started <ChevronRight size={14} />
                </button>
            </nav>

            {/* Hero Section */}
            <section
                ref={heroRef}
                className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-36 pb-16 overflow-hidden"
                style={{ '--mouse-x': '0px', '--mouse-y': '0px' } as React.CSSProperties}
            >
                {/* Background orbs */}
                <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-[120px] animate-pulse pointer-events-none" />
                <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-violet-500/10 rounded-full blur-[120px] animate-pulse pointer-events-none" style={{ animationDelay: '1s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-[150px] pointer-events-none" />

                {/* Grid pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:64px_64px] pointer-events-none" />

                {/* Headline */}
                <h1 className="relative text-center font-black tracking-tight leading-[1.1] max-w-4xl">
                    <span className="block text-4xl md:text-6xl lg:text-7xl text-white mb-2">
                        Your Personal
                    </span>
                    <span className="block text-4xl md:text-6xl lg:text-7xl bg-gradient-to-r from-orange-400 via-amber-400 to-orange-300 bg-clip-text text-transparent">
                        AI Copilot
                    </span>
                </h1>

                {/* Subheadline */}
                <p className="relative mt-6 text-center text-gray-400 max-w-2xl text-base md:text-lg leading-relaxed">
                    Agent Arga is a powerful AI assistant that reads your documents, analyzes images, and holds intelligent conversations — all in one place.
                </p>

                {/* CTA Buttons */}
                <div className="relative mt-10 flex flex-col sm:flex-row items-center gap-4">
                    <button
                        onClick={onGetStarted}
                        className="group flex items-center gap-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white px-8 py-4 rounded-2xl text-base font-bold shadow-2xl shadow-orange-500/30 hover:shadow-orange-500/50 transition-all hover:scale-[1.04] active:scale-[0.97]"
                    >
                        Start for Free
                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                    <a
                        href="#features"
                        className="flex items-center gap-2 text-gray-400 hover:text-white px-6 py-4 rounded-2xl border border-white/10 hover:border-white/20 transition-all text-sm font-medium"
                    >
                        See how it works
                    </a>
                </div>

                {/* Stats */}
                <div className="relative mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 w-full max-w-3xl">
                    {stats.map((stat, i) => (
                        <div key={i} className="flex flex-col items-center gap-1 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                            <span className="text-2xl md:text-3xl font-black text-white">{stat.value}</span>
                            <span className="text-xs text-gray-500 font-medium text-center">{stat.label}</span>
                        </div>
                    ))}
                </div>

                {/* Preview card */}
                <div className="relative mt-16 w-full max-w-3xl">
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-4 backdrop-blur-sm">
                        <div className="bg-[#111118] rounded-2xl p-4 md:p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                                <div className="w-3 h-3 rounded-full bg-green-500/60" />
                                <span className="ml-2 text-xs text-gray-500">agentarga.fun</span>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-end">
                                    <div className="bg-orange-500/20 border border-orange-500/20 text-orange-200 rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm max-w-[80%]">
                                        Can you analyze this financial report PDF?
                                    </div>
                                </div>
                                <div className="flex justify-start">
                                    <div className="flex gap-2 items-start">
                                        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-orange-400 to-amber-500 flex items-center justify-center flex-shrink-0 mt-1">
                                            <Sparkles size={12} fill="white" className="text-white" />
                                        </div>
                                        <div className="bg-white/5 border border-white/10 text-gray-300 rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm max-w-[80%]">
                                            Of course! I've analyzed your financial report. Here are the key findings:
                                            <br /><br />
                                            📊 <strong className="text-white">Revenue:</strong> $2.4M (+18% YoY)<br />
                                            💰 <strong className="text-white">Net Profit:</strong> $480K (+12% YoY)<br />
                                            📈 <strong className="text-white">Growth Rate:</strong> Consistent upward trend...
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 mt-4 bg-white/5 rounded-xl px-3 py-2.5 border border-white/10">
                                    <span className="text-xs text-gray-500 flex-1">Ask anything Agent Arga...</span>
                                    <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center">
                                        <ArrowRight size={12} className="text-white" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="absolute -inset-4 bg-orange-500/5 rounded-[2rem] blur-2xl -z-10" />
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-24 px-6 md:px-12 max-w-6xl mx-auto">
                <div className="text-center mb-16">
                    <span className="text-orange-400 text-sm font-semibold uppercase tracking-widest">Features</span>
                    <h2 className="mt-3 text-3xl md:text-5xl font-black tracking-tight text-white">
                        Everything you need
                    </h2>
                    <p className="mt-4 text-gray-400 max-w-xl mx-auto">
                        Agent Arga combines the power of the latest AI models with a seamless experience.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {features.map((feat, i) => (
                        <div
                            key={i}
                            className="group relative bg-white/5 border border-white/10 rounded-3xl p-6 hover:border-white/20 hover:bg-white/8 transition-all duration-300 hover:-translate-y-1"
                        >
                            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${feat.color} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform`}>
                                <feat.icon size={22} className="text-white" />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">{feat.title}</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">{feat.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* How it works */}
            <section id="how" className="py-24 px-6 md:px-12 max-w-6xl mx-auto">
                <div className="text-center mb-16">
                    <span className="text-orange-400 text-sm font-semibold uppercase tracking-widest">How it works</span>
                    <h2 className="mt-3 text-3xl md:text-5xl font-black tracking-tight text-white">
                        Simple as 1, 2, 3
                    </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                        { step: '01', title: 'Sign In', desc: 'Login with Google or create a free account in seconds.' },
                        { step: '02', title: 'Upload or Ask', desc: 'Type your question, upload a document, or share an image.' },
                        { step: '03', title: 'Get Answers', desc: 'Agent Arga analyzes and responds with detailed, accurate answers.' },
                    ].map((item, i) => (
                        <div key={i} className="relative flex flex-col items-center text-center">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 border border-orange-500/20 flex items-center justify-center mb-4">
                                <span className="text-2xl font-black text-orange-400">{item.step}</span>
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                            <p className="text-gray-400 text-sm">{item.desc}</p>
                            {i < 2 && (
                                <div className="hidden md:block absolute top-8 left-[calc(100%-1rem)] w-8">
                                    <ChevronRight size={20} className="text-gray-700" />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            {/* Pricing */}
            <section id="pricing" className="py-24 px-6 md:px-12">
                <div className="max-w-2xl mx-auto text-center">
                    <span className="text-orange-400 text-sm font-semibold uppercase tracking-widest">Pricing</span>
                    <h2 className="mt-3 text-3xl md:text-5xl font-black tracking-tight text-white">
                        Completely free
                    </h2>
                    <p className="mt-4 text-gray-400">
                        Agent Arga is free to use. No credit card required.
                    </p>
                    <div className="mt-8 bg-white/5 border border-white/10 rounded-3xl p-8 text-left">
                        <div className="flex items-end gap-2 mb-6">
                            <span className="text-5xl font-black text-white">$0</span>
                            <span className="text-gray-400 mb-2">/month</span>
                        </div>
                        <div className="space-y-3 mb-8">
                            {['Unlimited conversations', 'PDF & document reading', 'Image analysis', '1M token context window', 'Chat history saved'].map((feat, i) => (
                                <div key={i} className="flex items-center gap-3 text-sm text-gray-300">
                                    <div className="w-5 h-5 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center flex-shrink-0">
                                        <span className="text-green-400 text-[10px]">✓</span>
                                    </div>
                                    {feat}
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={onGetStarted}
                            className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold py-4 rounded-2xl hover:from-orange-400 hover:to-amber-400 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-orange-500/20"
                        >
                            Get Started Free
                        </button>
                    </div>
                </div>
            </section>

            {/* CTA Banner */}
            <section className="py-24 px-6 md:px-12">
                <div className="max-w-4xl mx-auto relative">
                    <div className="bg-gradient-to-br from-orange-500/20 to-amber-500/10 border border-orange-500/20 rounded-3xl p-10 md:p-16 text-center overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl" />
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl" />
                        <div className="relative">
                            <Shield size={40} className="text-orange-400 mx-auto mb-4" />
                            <h2 className="text-3xl md:text-5xl font-black text-white mb-4">
                                Ready to get started?
                            </h2>
                            <p className="text-gray-400 mb-8 max-w-lg mx-auto">
                                Join thousands of users who use Agent Arga to work smarter every day.
                            </p>
                            <button
                                onClick={onGetStarted}
                                className="group inline-flex items-center gap-3 bg-white text-gray-900 px-8 py-4 rounded-2xl font-bold hover:bg-orange-50 transition-all hover:scale-105 active:scale-95 shadow-xl"
                            >
                                Start for Free
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 px-6 border-t border-white/5 text-center text-gray-600 text-sm">
                <div className="flex items-center justify-center gap-2 mb-2">
                    <img src="/logowhite.png" alt="Agent Arga" className="h-6 w-auto object-contain opacity-60" />
                </div>
                <p>© 2025 Agent Arga. Built with ❤️ by Arga.</p>
            </footer>

        </div>
    );
};

export default LandingPage;
