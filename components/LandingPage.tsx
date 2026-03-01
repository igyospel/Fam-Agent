import React, { useEffect, useState } from 'react';
import { ArrowRight, Sparkles, FileText, Image as ImageIcon, MessageSquare, Command, ChevronRight, Lock, Zap, MousePointerClick } from 'lucide-react';

interface LandingPageProps {
    onGetStarted: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
        e.preventDefault();
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <div className="min-h-screen w-full bg-[#050505] text-gray-200 overflow-x-hidden selection:bg-orange-500/30">

            {/* --- NAVBAR --- */}
            <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-700 ease-out animate-navbar-in ${scrolled ? 'bg-[#050505]/85 backdrop-blur-xl border-b border-white/10 py-4 shadow-[0_4px_30px_-10px_rgba(0,0,0,0.4)]' : 'bg-transparent py-6'}`}>
                <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
                    <div className="flex items-center cursor-pointer group">
                        <img
                            src="/logomain.png"
                            alt="Agent Arga"
                            className="h-5 md:h-6 w-auto object-contain drop-shadow-[0_0_10px_rgba(255,255,255,0.1)] group-hover:drop-shadow-[0_0_20px_rgba(249,115,22,0.4)] transition-all duration-500 group-hover:scale-105 origin-left"
                        />
                    </div>

                    <div className="hidden md:flex items-center gap-10">
                        {[
                            { id: 'features', label: 'Features' },
                            { id: 'workflow', label: 'Workflow' },
                            { id: 'pricing', label: 'Pricing' },
                        ].map((link) => (
                            <a
                                key={link.id}
                                href={`#${link.id}`}
                                onClick={(e) => scrollToSection(e, link.id)}
                                className="relative py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors duration-300 cursor-pointer group/link"
                            >
                                {link.label}
                                <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-gradient-to-r from-orange-400 to-amber-400 group-hover/link:w-full transition-all duration-300 ease-out" />
                            </a>
                        ))}
                    </div>

                    <button
                        onClick={onGetStarted}
                        className="group relative overflow-hidden flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-500 hover:scale-105 hover:shadow-[0_0_30px_-8px_rgba(249,115,22,0.5)]"
                    >
                        <span className="relative z-10">Sign In</span>
                        <ChevronRight size={14} className="relative z-10 group-hover:translate-x-0.5 transition-transform duration-300" />
                    </button>
                </div>
            </nav>

            {/* --- HERO SECTION --- */}
            <section className="relative h-[100dvh] flex flex-col items-center justify-center overflow-hidden">
                {/* Clean Cinematic Video Background */}
                <div className="absolute inset-0 w-full h-full z-0 overflow-hidden bg-black">
                    {/* The Video */}
                    <video
                        src="/landingpage.mp4"
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="absolute inset-0 w-full h-full object-cover opacity-60 scale-[1.3] md:scale-[1.4] pointer-events-none"
                    />

                    {/* Overlay for readable text */}
                    <div className="absolute inset-0 bg-black/50" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-black/30" />
                </div>

                {/* Hero Content */}
                <div className="relative z-10 text-center max-w-5xl mx-auto px-6 mt-16 md:mt-0">
                    <h1 className="text-[3.5rem] md:text-7xl lg:text-[7.5rem] font-bold tracking-tighter leading-[1.05] mb-6">
                        <span className="block text-white [text-shadow:0_0_60px_rgba(255,255,255,0.15)] hero-line-1">Beyond Chat.</span>
                        <br className="md:hidden" />
                        <span className="block text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-200 to-orange-500 [text-shadow:0_0_80px_rgba(249,115,22,0.4),0_2px_20px_rgba(0,0,0,0.3)] drop-shadow-[0_0_30px_rgba(249,115,22,0.25)] hero-line-2">Pure Execution.</span>
                    </h1>

                    <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto font-light leading-relaxed mb-10 [text-shadow:0_2px_20px_rgba(0,0,0,0.5)] hero-subtitle">
                        Stop talking to generic bots. Agent Arga is an elite autonomous OS designed to analyze data, run complex commands, and scale your workflow 24/7.
                    </p>

                    <div className="hero-cta">
                        <button
                            onClick={onGetStarted}
                            className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-black bg-white rounded-full overflow-hidden transition-all duration-300 hover:scale-[1.04] hover:shadow-[0_0_50px_-10px_rgba(249,115,22,0.6),0_20px_50px_-20px_rgba(0,0,0,0.4)]"
                        >
                            <span className="relative flex items-center gap-2">
                                Launch Agent
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform duration-300" />
                            </span>
                        </button>
                    </div>
                </div>

                {/* Scroll Indicator */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-3 text-gray-400/70 hero-scroll">
                    <span className="text-[10px] uppercase tracking-[0.3em]">Scroll</span>
                    <div className="flex flex-col items-center gap-1">
                        <div className="w-[1px] h-10 bg-gradient-to-b from-orange-400/60 to-transparent rounded-full scroll-line" />
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-400/50 scroll-dot" />
                    </div>
                </div>
            </section>

            {/* --- BENTO GRID FEATURES --- */}
            <section id="features" className="py-32 px-6 max-w-7xl mx-auto relative pt-40 overflow-hidden">
                {/* Ambient gradient orbs */}
                <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-orange-500/8 blur-[140px] rounded-full pointer-events-none" />
                <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-amber-500/5 blur-[120px] rounded-full pointer-events-none" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:6rem_6rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_40%,transparent_100%)] pointer-events-none" />

                <div className="relative mb-20 text-center md:text-left">
                    <span className="inline-block px-4 py-1.5 mb-6 rounded-full text-xs font-semibold tracking-widest uppercase bg-orange-500/10 border border-orange-500/20 text-orange-400/90">
                        Capabilities
                    </span>
                    <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tighter text-white mb-6">
                        Unleash your <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-300 via-amber-200 to-orange-400">productivity.</span>
                    </h2>
                    <p className="text-xl text-gray-400 max-w-xl font-light mx-auto md:mx-0 leading-relaxed">
                        Everything you need to automate workflows, inside a premium modular workspace.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6 relative">
                    {/* BENTO ITEM 1: Limitless Conversations */}
                    <div className="md:col-span-2 rounded-[1.75rem] p-8 md:p-10 relative overflow-hidden group transition-all duration-500
                        bg-[linear-gradient(135deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.02)_50%,transparent_100%)]
                        border border-white/[0.08] hover:border-orange-500/25
                        shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset,0_25px_50px_-12px_rgba(0,0,0,0.5)]
                        hover:shadow-[0_0_0_1px_rgba(249,115,22,0.1)_inset,0_0_60px_-15px_rgba(249,115,22,0.2),0_25px_50px_-12px_rgba(0,0,0,0.5)]">
                        <div className="absolute -top-20 -right-20 w-64 h-64 bg-orange-500/15 blur-[100px] rounded-full group-hover:bg-orange-500/25 transition-all duration-700" />
                        <div className="relative z-10 flex flex-col h-full justify-between gap-10">
                            <div>
                                <div className="w-14 h-14 rounded-2xl mb-6 flex items-center justify-center
                                    bg-gradient-to-br from-orange-500/20 to-amber-500/10 border border-orange-500/20
                                    shadow-[0_0_30px_-10px_rgba(249,115,22,0.3)] group-hover:shadow-[0_0_40px_-10px_rgba(249,115,22,0.4)] transition-shadow">
                                    <MessageSquare size={26} className="text-orange-400" />
                                </div>
                                <h3 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">Limitless <br />Conversations</h3>
                                <p className="text-gray-400 text-base md:text-lg leading-relaxed max-w-md">
                                    Chat naturally with an AI that understands deep context, remembers your history continuously, and executes complex reasoning on the fly.
                                </p>
                            </div>

                            {/* Refined chat mockup */}
                            <div className="mt-4 bg-[#0a0a0a]/90 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-5 shadow-xl relative w-full md:max-w-[85%] self-end
                                transition-all duration-500 group-hover:-translate-y-1 group-hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.6)]
                                group-hover:border-orange-500/10">
                                <div className="absolute -top-2.5 left-5 px-3 py-1.5 bg-gradient-to-r from-orange-500 to-amber-500 text-[10px] font-bold tracking-[0.2em] uppercase rounded-full text-white shadow-lg shadow-orange-500/20">Agent Arga</div>
                                <div className="space-y-3 mt-4 pl-1">
                                    <div className="h-2 w-[72%] bg-white/15 rounded-md" />
                                    <div className="h-2 w-[55%] bg-white/10 rounded-md" />
                                    <div className="h-2 w-[88%] bg-white/8 rounded-md" />
                                    <div className="h-2 w-[40%] bg-white/5 rounded-md mt-1" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* BENTO ITEM 2: Document Mastery */}
                    <div className="rounded-[1.75rem] p-8 relative overflow-hidden group transition-all duration-500 flex flex-col justify-between
                        bg-[linear-gradient(135deg,rgba(255,255,255,0.05)_0%,transparent_100%)]
                        border border-white/[0.08] hover:border-white/15
                        shadow-[0_0_0_1px_rgba(255,255,255,0.02)_inset]
                        hover:shadow-[0_0_0_1px_rgba(59,130,246,0.08)_inset,0_0_40px_-15px_rgba(59,130,246,0.15)]">
                        <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-blue-500/12 blur-[80px] rounded-full group-hover:bg-blue-500/20 transition-all duration-700" />
                        <div className="relative z-10">
                            <div className="w-12 h-12 rounded-2xl mb-6 flex items-center justify-center
                                bg-gradient-to-br from-blue-500/15 to-cyan-500/10 border border-blue-500/20
                                group-hover:border-blue-500/30 transition-colors">
                                <FileText size={22} className="text-blue-400" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">Document Mastery</h3>
                            <p className="text-gray-400 leading-relaxed font-light text-[15px]">
                                Upload heavy PDFs and documents. The agent intelligently reads, summarizes, and extracts key insights instantly.
                            </p>
                        </div>
                    </div>

                    {/* BENTO ITEM 3: Pixel Perfect Vision */}
                    <div className="rounded-[1.75rem] p-8 relative overflow-hidden group transition-all duration-500 flex flex-col justify-between
                        bg-[linear-gradient(135deg,rgba(255,255,255,0.05)_0%,transparent_100%)]
                        border border-white/[0.08] hover:border-white/15
                        shadow-[0_0_0_1px_rgba(255,255,255,0.02)_inset]
                        hover:shadow-[0_0_0_1px_rgba(139,92,246,0.08)_inset,0_0_40px_-15px_rgba(139,92,246,0.15)]">
                        <div className="absolute -top-10 -left-10 w-40 h-40 bg-violet-500/12 blur-[70px] rounded-full group-hover:bg-violet-500/20 transition-all duration-700" />
                        <div className="relative z-10">
                            <div className="w-12 h-12 rounded-2xl mb-6 flex items-center justify-center
                                bg-gradient-to-br from-violet-500/15 to-purple-500/10 border border-violet-500/20
                                group-hover:border-violet-500/30 transition-colors">
                                <ImageIcon size={22} className="text-violet-400" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">Pixel Perfect Vision</h3>
                            <p className="text-gray-400 leading-relaxed font-light text-[15px]">
                                Drop images directly into the chat. Get detailed analysis, creative descriptions, and code generation from UI mockups.
                            </p>
                        </div>
                    </div>

                    {/* BENTO ITEM 4: Lightning Fast Response */}
                    <div className="md:col-span-2 rounded-[1.75rem] p-8 md:px-10 relative overflow-hidden group transition-all duration-500
                        flex flex-col md:flex-row md:items-center justify-between gap-6
                        bg-[linear-gradient(90deg,rgba(249,115,22,0.08)_0%,rgba(251,191,36,0.04)_40%,transparent_100%)]
                        border border-orange-500/15 hover:border-orange-500/35
                        shadow-[0_0_0_1px_rgba(249,115,22,0.05)_inset]
                        hover:shadow-[0_0_0_1px_rgba(249,115,22,0.12)_inset,0_0_50px_-20px_rgba(249,115,22,0.25)]">
                        <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/10 blur-[100px] rounded-full group-hover:bg-orange-500/15 transition-all duration-700" />
                        <div className="flex items-center gap-6 z-10">
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0
                                bg-gradient-to-br from-orange-500/25 to-amber-500/15 border border-orange-500/30
                                shadow-[0_0_40px_-15px_rgba(249,115,22,0.4)] group-hover:scale-105 group-hover:shadow-[0_0_50px_-15px_rgba(249,115,22,0.5)] transition-all duration-500">
                                <Zap size={28} className="text-orange-400" />
                            </div>
                            <div>
                                <h3 className="text-2xl md:text-3xl font-bold text-white mb-1 tracking-tight">Lightning Fast Response</h3>
                                <p className="text-gray-400 font-light text-[15px]">Under 1 second latency powered by the latest GenAI models.</p>
                            </div>
                        </div>
                        <div className="hidden md:flex items-center gap-2 text-orange-500/60 text-xs font-mono tracking-wider">
                            <span className="w-2 h-2 rounded-full bg-orange-500/60 animate-pulse" /> &lt;1s latency
                        </div>
                    </div>
                </div>
            </section>

            {/* --- WORKFLOW / HOW IT WORKS --- */}
            <section
                id="workflow"
                className="relative py-32 md:py-40 px-6 border-t border-white/5 bg-gradient-to-b from-[#050505] via-[#050509] to-[#020309] overflow-hidden"
            >
                {/* Ambient background and grid */}
                <div className="pointer-events-none absolute inset-0">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.12),transparent_55%)]" />
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff07_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:7rem_7rem] opacity-[0.25] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_0%,#000_30%,transparent_100%)]" />
                </div>

                <div className="relative max-w-5xl mx-auto text-center">
                    <span className="inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-semibold tracking-[0.2em] uppercase bg-white/5 border border-white/10 text-gray-300/90 mb-5">
                        <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-orange-400 to-amber-400 animate-pulse" />
                        Seamless Workflow
                    </span>

                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter text-white mb-4">
                        Ship ideas in three steps.
                    </h2>
                    <p className="text-base md:text-lg text-gray-400 max-w-2xl mx-auto font-light leading-relaxed">
                        From sign-in to full automation, Agent Arga keeps your flow unbroken with a guided, minimal setup.
                    </p>

                    <div className="mt-16 md:mt-20 relative">
                        {/* Horizontal timeline for desktop */}
                        <div className="hidden md:block absolute top-[46px] left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                        {/* Vertical timeline for mobile */}
                        <div className="md:hidden absolute left-1/2 top-4 bottom-4 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-white/15 to-transparent" />

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-10 relative z-10">
                            {[
                                {
                                    step: '01',
                                    title: 'Authenticate',
                                    desc: 'Secure login via Google or quick email setup so you are in within seconds.',
                                    icon: Lock,
                                },
                                {
                                    step: '02',
                                    title: 'Interact',
                                    desc: 'Chat, upload files, or drop images into the workspace — everything stays in one context.',
                                    icon: MousePointerClick,
                                },
                                {
                                    step: '03',
                                    title: 'Automate',
                                    desc: 'Let the agent orchestrate analysis, summaries, and actions while you stay in command.',
                                    icon: Zap,
                                },
                            ].map((item, i) => (
                                <div
                                    key={i}
                                    className="relative flex flex-col items-center text-center group"
                                >
                                    {/* Connector dot on the line */}
                                    <div className="hidden md:block absolute top-[46px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-[#050505] border border-white/25 shadow-[0_0_0_4px_rgba(0,0,0,0.8)]" />

                                    <div className="relative mb-6">
                                        <div className="absolute -inset-[2px] rounded-2xl bg-gradient-to-br from-white/20 via-white/5 to-transparent opacity-0 group-hover:opacity-100 blur-md transition-opacity" />
                                        <div className="relative w-16 h-16 rounded-2xl bg-[#080808] border border-white/15 flex items-center justify-center shadow-[0_18px_45px_-20px_rgba(0,0,0,0.8)] group-hover:border-orange-400/70 group-hover:shadow-[0_0_45px_-18px_rgba(249,115,22,0.5)] transition-all duration-500">
                                            <item.icon
                                                size={28}
                                                className="text-gray-300 group-hover:text-orange-300 transition-colors duration-300"
                                            />
                                        </div>
                                    </div>

                                    <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-300">
                                        Step {item.step}
                                    </span>
                                    <h3 className="text-xl md:text-2xl font-semibold text-white mb-2 tracking-tight">
                                        {item.title}
                                    </h3>
                                    <p className="text-sm md:text-base text-gray-400 max-w-xs leading-relaxed font-light">
                                        {item.desc}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* --- PRICING --- */}
            <section
                id="pricing"
                className="relative py-32 md:py-40 px-6 flex justify-center bg-[radial-gradient(ellipse_at_top,rgba(249,115,22,0.08),transparent_55%)] overflow-hidden"
            >
                {/* Ambient glow */}
                <div className="pointer-events-none absolute inset-0">
                    <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-[520px] h-[520px] bg-orange-500/10 blur-[160px] rounded-full" />
                </div>

                <div className="max-w-3xl w-full relative">
                    <div className="bg-[#050506]/90 border border-white/10 rounded-[2.75rem] p-10 md:p-14 shadow-[0_40px_80px_-40px_rgba(0,0,0,0.9)] relative overflow-hidden group">
                        {/* Inner gradient sheen */}
                        <div className="pointer-events-none absolute inset-0 opacity-60 group-hover:opacity-90 transition-opacity duration-700">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.16),transparent_55%)]" />
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(15,23,42,0.9),transparent_65%)]" />
                        </div>

                        <div className="relative z-10 flex flex-col gap-10 md:gap-0 md:flex-row md:items-stretch">
                            {/* Price + header */}
                            <div className="md:w-2/5 md:pr-10 border-b md:border-b-0 md:border-r border-white/10 pb-8 md:pb-0 md:mb-0 mb-6">
                                <span className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full bg-orange-500/10 border border-orange-400/40 text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-200">
                                    Early Access
                                    <span className="w-1.5 h-1.5 rounded-full bg-orange-300 animate-pulse" />
                                </span>

                                <div className="flex items-end gap-2 mb-3">
                                    <span className="text-6xl md:text-7xl font-black tracking-tight text-white">
                                        $5
                                    </span>
                                    <span className="pb-3 text-sm font-medium text-gray-400 uppercase tracking-[0.24em]">
                                        /month
                                    </span>
                                </div>
                                <p className="text-sm md:text-base text-gray-400 leading-relaxed max-w-xs">
                                    One simple price for the full Agent Arga experience during beta — no seat limits, no hidden usage tiers.
                                </p>
                            </div>

                            {/* Features + CTA */}
                            <div className="md:w-3/5 md:pl-10 flex flex-col justify-between gap-8">
                                <div className="space-y-4 text-sm md:text-base font-light text-gray-200">
                                    {[
                                        'Ultra-fast GPT processing',
                                        'Unlimited Document Analysis',
                                        'Vision & Image Intelligence',
                                        'End-to-End Encryption',
                                        'Chat history & cloud sync',
                                    ].map((feat, i) => (
                                        <div key={i} className="flex items-center gap-3">
                                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-orange-500/30 to-amber-400/40 text-black text-xs font-bold shadow-[0_0_22px_-6px_rgba(249,115,22,0.8)]">
                                                ✓
                                            </div>
                                            <span>{feat}</span>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={onGetStarted}
                                    className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-white text-black font-semibold py-4 md:py-4.5 text-sm md:text-base shadow-[0_18px_45px_-24px_rgba(255,255,255,0.8)] hover:bg-gray-100 hover:shadow-[0_22px_60px_-30px_rgba(255,255,255,0.9)] hover:scale-[1.01] transition-all"
                                >
                                    Start Building Now
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- CTA BANNER --- */}
            <section className="py-24 md:py-28 px-6 border-t border-white/5 pb-32 relative overflow-hidden">
                {/* Soft background glow */}
                <div className="pointer-events-none absolute inset-0">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.09),transparent_60%)]" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(17,24,39,0.9),transparent_70%)]" />
                </div>

                <div className="relative max-w-5xl mx-auto">
                    <div className="rounded-[3rem] border border-white/10 bg-gradient-to-b from-white/5 via-black/50 to-black/80 shadow-[0_40px_120px_-50px_rgba(0,0,0,0.9)] overflow-hidden">
                        {/* Inner subtle vignette */}
                        <div className="relative px-8 md:px-16 lg:px-24 py-14 md:py-20 flex flex-col items-center text-center">
                            <div className="mb-7 flex items-center justify-center">
                                <img
                                    src="/logomain.png"
                                    alt="Agent Arga"
                                    className="h-7 md:h-8 w-auto object-contain drop-shadow-[0_0_18px_rgba(255,255,255,0.35)]"
                                />
                            </div>

                            <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tighter text-white mb-5 md:mb-6 leading-[1.02]">
                                Stop typing.
                                <br className="hidden md:block" />
                                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-orange-300 via-amber-200 to-orange-400">
                                    Start generating.
                                </span>
                            </h2>

                            <p className="text-gray-300 text-base md:text-lg lg:text-xl mb-10 md:mb-12 max-w-2xl font-light leading-relaxed">
                                Join early adopters using Agent Arga to accelerate their daily operations and unlock infinite creativity
                                inside a focused, distraction-free workspace.
                            </p>

                            <button
                                onClick={onGetStarted}
                                className="group inline-flex items-center justify-center rounded-full px-10 md:px-12 py-4 text-sm md:text-base font-semibold text-black bg-white shadow-[0_18px_45px_-22px_rgba(255,255,255,0.9)] hover:bg-gray-100 hover:shadow-[0_24px_70px_-30px_rgba(255,255,255,1)] hover:-translate-y-0.5 transition-all"
                            >
                                Launch Workspace
                                <span className="ml-3 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/5 text-gray-800 group-hover:bg-black/10 transition-colors">
                                    <ArrowRight size={16} />
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- FOOTER --- */}
            <footer className="relative border-t border-white/5 bg-[#050505]">
                <div className="pointer-events-none absolute inset-0">
                    <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                </div>

                <div className="relative max-w-6xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-6 gap-y-1">
                        <div className="flex items-center gap-2">
                            <img src="/logomain.png" alt="Agent Arga" className="h-4 w-auto object-contain opacity-90" />
                            <span className="text-[11px] text-gray-500">© 2026</span>
                        </div>
                        <div className="flex items-center gap-5">
                            <a href="#" className="hover:text-white transition-colors text-xs">Privacy</a>
                            <a href="#" className="hover:text-white transition-colors text-xs">Terms</a>
                            <a href="#" className="hover:text-white transition-colors text-xs">Twitter</a>
                        </div>
                    </div>
                </div>
            </footer>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes navbarIn {
                    from { opacity: 0; transform: translateY(-12px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes scrollBounce {
                    0%, 100% { transform: translateY(0); opacity: 0.6; }
                    50% { transform: translateY(6px); opacity: 1; }
                }
                @keyframes glowPulse {
                    0%, 100% {
                        text-shadow:
                            0 0 40px rgba(249,115,22,0.4),
                            0 0 80px rgba(249,115,22,0.25),
                            0 2px 20px rgba(0,0,0,0.4);
                    }
                    50% {
                        text-shadow:
                            0 0 70px rgba(249,115,22,0.7),
                            0 0 120px rgba(249,115,22,0.45),
                            0 4px 26px rgba(0,0,0,0.55);
                    }
                }
                .animate-navbar-in {
                    animation: navbarIn 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
                }
                .hero-line-1 {
                    animation: fadeInUp 0.9s cubic-bezier(0.2, 0.8, 0.2, 1) 0.1s both;
                }
                .hero-line-2 {
                    animation:
                        fadeInUp 0.9s cubic-bezier(0.2, 0.8, 0.2, 1) 0.2s both,
                        glowPulse 5s ease-in-out 1.2s infinite;
                }
                .hero-subtitle {
                    animation: fadeInUp 0.9s cubic-bezier(0.2, 0.8, 0.2, 1) 0.35s both;
                }
                .hero-cta {
                    animation: fadeInUp 0.9s cubic-bezier(0.2, 0.8, 0.2, 1) 0.5s both;
                }
                .hero-scroll {
                    animation: fadeInUp 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) 1s both;
                }
                .scroll-line {
                    animation: scrollBounce 2s ease-in-out infinite;
                }
                .scroll-dot {
                    animation: scrollBounce 2s ease-in-out infinite 0.2s;
                }
            `}} />

        </div>
    );
};

export default LandingPage;
