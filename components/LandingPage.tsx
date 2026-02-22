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
            <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${scrolled ? 'bg-[#050505]/80 backdrop-blur-xl border-b border-white/5 py-4' : 'bg-transparent py-6'}`}>
                <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
                    <div className="flex items-center cursor-pointer">
                        <img src="/logomain.png" alt="Agent Arga" className="h-5 md:h-6 w-auto object-contain drop-shadow-[0_0_10px_rgba(255,255,255,0.1)] hover:scale-105 transition-transform duration-300 origin-left" />
                    </div>
                    <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
                        <a href="#features" onClick={(e) => scrollToSection(e, 'features')} className="hover:text-white transition-colors cursor-pointer">Features</a>
                        <a href="#workflow" onClick={(e) => scrollToSection(e, 'workflow')} className="hover:text-white transition-colors cursor-pointer">Workflow</a>
                        <a href="#pricing" onClick={(e) => scrollToSection(e, 'pricing')} className="hover:text-white transition-colors cursor-pointer">Pricing</a>
                    </div>
                    <button
                        onClick={onGetStarted}
                        className="flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-orange-50 transition-all hover:scale-105"
                    >
                        Sign In <ChevronRight size={14} />
                    </button>
                </div>
            </nav>

            {/* --- HERO SECTION --- */}
            <section className="relative h-[100dvh] flex flex-col items-center justify-center px-6 overflow-hidden">
                {/* Clean Cinematic Video Background */}
                <div className="absolute inset-0 w-full h-full z-0 overflow-hidden bg-black flex justify-center items-center">
                    {/* The Video */}
                    <video
                        src="/landingpage.mp4"
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover opacity-60 scale-[1.15] md:scale-[1.25]"
                        style={{ objectPosition: 'center' }}
                    />

                    {/* Simple, clean overlay for readable text */}
                    <div className="absolute inset-0 bg-black/40" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-[#050505]/40" />
                </div>

                {/* Hero Content */}
                <div className="relative z-10 text-center max-w-5xl mx-auto mt-16 md:mt-0">
                    <h1 className="text-[3.5rem] md:text-7xl lg:text-[7.5rem] font-bold tracking-tighter leading-[1.05] text-white mb-6 animate-[fadeInUp_1s_ease-out_0.1s_both]">
                        Beyond Chat. <br className="md:hidden" />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-200 to-orange-500 drop-shadow-lg">Pure Execution.</span>
                    </h1>

                    <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto font-light leading-relaxed mb-10 animate-[fadeInUp_1s_ease-out_0.2s_both]">
                        Stop talking to generic bots. Agent Arga is an elite autonomous OS designed to analyze data, run complex commands, and scale your workflow 24/7.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-[fadeInUp_1s_ease-out_0.3s_both]">
                        <button
                            onClick={onGetStarted}
                            className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white bg-white/5 border border-white/10 rounded-full overflow-hidden backdrop-blur-md transition-all hover:bg-white/10 hover:scale-[1.02] hover:border-orange-500/50 shadow-[0_0_40px_-10px_rgba(249,115,22,0.3)]"
                        >
                            <span className="relative flex items-center gap-2">
                                Launch Agent
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </span>
                        </button>
                    </div>
                </div>

                {/* Scroll Indicator */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 text-gray-500 opacity-50 animate-pulse">
                    <span className="text-[10px] uppercase tracking-widest">Scroll</span>
                    <div className="w-[1px] h-12 bg-gradient-to-b from-gray-400 to-transparent" />
                </div>
            </section>

            {/* --- BENTO GRID FEATURES --- */}
            <section id="features" className="py-32 px-6 max-w-7xl mx-auto relative pt-40">
                <div className="absolute top-0 right-1/4 w-96 h-96 bg-orange-500/10 blur-[120px] rounded-full pointer-events-none" />

                <div className="mb-20 text-center md:text-left">
                    <h2 className="text-4xl md:text-6xl font-bold tracking-tighter text-white mb-6">
                        Unleash your productivity.
                    </h2>
                    <p className="text-xl text-gray-400 max-w-xl font-light mx-auto md:mx-0">
                        Everything you need to automate workflows, inside a premium modular workspace.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* BENTO ITEM 1: Large spanning */}
                    <div className="md:col-span-2 bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-[2rem] p-8 md:p-12 relative overflow-hidden group hover:border-white/20 transition-all duration-500 shadow-2xl">
                        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-orange-500/10 blur-[80px] rounded-full group-hover:bg-orange-500/20 transition-all duration-700" />
                        <div className="relative z-10 flex flex-col h-full justify-between gap-12">
                            <div>
                                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-inner">
                                    <MessageSquare size={24} className="text-orange-400" />
                                </div>
                                <h3 className="text-3xl font-bold text-white mb-4 tracking-tight">Limitless <br />Conversations</h3>
                                <p className="text-gray-400 text-lg leading-relaxed max-w-md">
                                    Chat naturally with an AI that understands deep context, remembers your history continuously, and executes complex reasoning on the fly.
                                </p>
                            </div>

                            {/* Mockup decoration */}
                            <div className="mt-8 bg-[#0a0a0a]/80 backdrop-blur-sm border border-white/10 rounded-2xl p-5 shadow-2xl relative w-full md:w-3/4 self-end group-hover:-translate-y-2 transition-transform duration-500">
                                <div className="absolute -top-3 left-6 px-3 py-1 bg-gradient-to-r from-orange-500 to-amber-500 text-[10px] font-bold tracking-widest uppercase rounded-full border border-orange-400 text-white shadow-lg">Agent Arga</div>
                                <div className="space-y-4 mt-3">
                                    <div className="h-3 w-3/4 bg-white/10 rounded-full" />
                                    <div className="h-3 w-1/2 bg-white/10 rounded-full" />
                                    <div className="h-3 w-5/6 bg-white/5 rounded-full" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* BENTO ITEM 2 */}
                    <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-[2rem] p-8 relative overflow-hidden group hover:border-white/20 transition-all duration-500 flex flex-col justify-between shadow-2xl">
                        <div className="absolute bottom-0 right-0 w-[200px] h-[200px] bg-blue-500/10 blur-[60px] rounded-full group-hover:bg-blue-500/20 transition-all duration-700" />
                        <div className="relative z-10">
                            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                                <FileText size={20} className="text-blue-400" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">Document Mastery</h3>
                            <p className="text-gray-400 leading-relaxed font-light">
                                Upload heavy PDFs and documents. The agent intelligently reads, summarizes, and extracts key insights instantly.
                            </p>
                        </div>
                    </div>

                    {/* BENTO ITEM 3 */}
                    <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-[2rem] p-8 relative overflow-hidden group hover:border-white/20 transition-all duration-500 flex flex-col justify-between shadow-2xl">
                        <div className="absolute top-0 left-0 w-[200px] h-[200px] bg-violet-500/10 blur-[60px] rounded-full group-hover:bg-violet-500/20 transition-all duration-700" />
                        <div className="relative z-10">
                            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                                <ImageIcon size={20} className="text-violet-400" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">Pixel Perfect Vision</h3>
                            <p className="text-gray-400 leading-relaxed font-light">
                                Drop images directly into the chat. Get detailed analysis, creative descriptions, and code generation from UI mockups.
                            </p>
                        </div>
                    </div>

                    {/* BENTO ITEM 4 (Spanning) */}
                    <div className="md:col-span-2 bg-gradient-to-r from-orange-500/10 to-transparent border border-orange-500/20 rounded-[2rem] p-8 flex flex-col md:flex-row md:items-center justify-between overflow-hidden group hover:border-orange-500/40 transition-all duration-500">
                        <div className="flex items-center gap-6 z-10">
                            <div className="w-16 h-16 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                <Zap size={24} className="text-orange-400" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-white mb-1 tracking-tight">Lightning Fast Response</h3>
                                <p className="text-gray-400 font-light">Under 1 second latency powered by the latest GenAI models.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- WORKFLOW / HOW IT WORKS --- */}
            <section id="workflow" className="py-40 px-6 border-t border-white/5 bg-gradient-to-b from-[#050505] to-[#0A0A0A]">
                <div className="max-w-7xl mx-auto text-center">
                    <h2 className="text-4xl md:text-5xl font-bold tracking-tighter text-white mb-24">
                        Seamless Workflow.
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-16 md:gap-12 relative">
                        {/* Connecting line for desktop */}
                        <div className="hidden md:block absolute top-[40px] left-1/6 right-1/6 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent z-0" style={{ width: '66%', left: '17%' }} />

                        {[
                            { step: '01', title: 'Authenticate', desc: 'Secure login via Google or quick email setup.', icon: Lock },
                            { step: '02', title: 'Interact', desc: 'Chat, upload files, or drop images into the workspace.', icon: MousePointerClick },
                            { step: '03', title: 'Automate', desc: 'Let the agent figure out the heavy lifting & analysis.', icon: Zap },
                        ].map((item, i) => (
                            <div key={i} className="relative z-10 flex flex-col items-center group">
                                <div className="w-20 h-20 rounded-2xl bg-[#0a0a0a] border border-white/10 flex items-center justify-center mb-8 group-hover:border-orange-500/50 group-hover:shadow-[0_0_30px_-5px_rgba(249,115,22,0.3)] transition-all duration-500 rotate-3 group-hover:rotate-0">
                                    <item.icon size={28} className="text-gray-400 group-hover:text-orange-400 transition-colors" />
                                </div>
                                <span className="text-orange-500 font-mono text-xs tracking-widest mb-3 uppercase">Step {item.step}</span>
                                <h3 className="text-2xl font-semibold text-white mb-3 tracking-tight">{item.title}</h3>
                                <p className="text-gray-400 text-center font-light leading-relaxed max-w-xs">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* --- PRICING --- */}
            <section id="pricing" className="py-40 px-6 flex justify-center bg-[radial-gradient(ellipse_at_top,rgba(249,115,22,0.05),transparent_50%)]">
                <div className="max-w-xl w-full">
                    <div className="bg-[#0a0a0a] border border-white/10 rounded-[3rem] p-12 md:p-16 text-center shadow-2xl relative overflow-hidden group hover:border-white/20 transition-colors">
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-orange-500/10 blur-[80px] rounded-full group-hover:bg-orange-500/20 transition-all duration-700" />

                        <div className="relative z-10">
                            <span className="inline-block px-4 py-1.5 bg-white/5 rounded-full text-xs font-semibold tracking-widest uppercase mb-8 border border-white/10 text-orange-400">
                                Early Access
                            </span>
                            <h2 className="text-7xl font-black text-white tracking-tighter mb-4">$0<span className="text-2xl font-normal text-gray-500 tracking-normal">/mo</span></h2>
                            <p className="text-gray-400 mb-12 text-lg font-light">Experience the full power of Agent Arga absolutely free during beta.</p>

                            <div className="space-y-5 mb-12 text-base font-light text-gray-300 text-left border-t border-white/5 pt-10">
                                {['Ultra-fast GPT processing', 'Unlimited Document Analysis', 'Vision & Image Intelligence', 'End-to-End Encryption', 'Chat history & cloud sync'].map((feat, i) => (
                                    <div key={i} className="flex items-center gap-4">
                                        <div className="w-6 h-6 rounded-full bg-orange-500/10 text-orange-400 flex items-center justify-center flex-shrink-0 border border-orange-500/20">
                                            ✓
                                        </div>
                                        {feat}
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={onGetStarted}
                                className="w-full bg-white text-black font-bold py-5 rounded-2xl hover:bg-gray-200 hover:scale-[1.02] transition-all shadow-[0_0_30px_-5px_rgba(255,255,255,0.3)]"
                            >
                                Start Building Now
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- CTA BANNER --- */}
            <section className="py-24 px-6 border-t border-white/5 pb-32">
                <div className="max-w-6xl mx-auto rounded-[3rem] overflow-hidden relative border border-white/5">
                    <div className="absolute inset-0 w-full h-full bg-[radial-gradient(circle_at_bottom,rgba(249,115,22,0.15)_0%,transparent_100%)]" />
                    <div className="absolute inset-0 bg-[#0a0a0a]/80" />

                    <div className="relative p-16 md:p-32 text-center flex flex-col items-center z-10">
                        <div className="flex items-center justify-center mb-8 shadow-2xl hover:scale-105 transition-transform duration-300">
                            <img src="/logomain.png" alt="Agent Arga" className="h-8 md:h-10 w-auto object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" />
                        </div>
                        <h2 className="text-5xl md:text-7xl font-bold text-white tracking-tighter mb-8 leading-tight">
                            Stop typing. <br /> Start generating.
                        </h2>
                        <p className="text-gray-400 text-xl md:text-2xl mb-12 max-w-2xl font-light">
                            Join early adopters using Agent Arga to accelerate their daily operations and unlock infinite creativity.
                        </p>
                        <button
                            onClick={onGetStarted}
                            className="group relative flex items-center justify-center px-10 py-5 font-bold text-white bg-white/10 border border-white/20 rounded-full overflow-hidden transition-all hover:bg-white/20 hover:scale-105 shadow-2xl backdrop-blur-md"
                        >
                            Launch Workspace
                            <ArrowRight size={20} className="ml-3 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>
            </section>

            {/* --- FOOTER --- */}
            <footer className="py-12 text-center text-gray-500 text-sm border-t border-white/5 flex flex-col items-center gap-6">
                <div className="flex items-center justify-center mb-4 hover:scale-105 transition-transform duration-300 cursor-pointer">
                    <img src="/logomain.png" alt="Agent Arga" className="h-4 md:h-5 w-auto object-contain drop-shadow-[0_0_10px_rgba(255,255,255,0.1)] grayscale hover:grayscale-0 transition-all opacity-80 hover:opacity-100" />
                </div>
                <div className="flex gap-6 font-medium">
                    <a href="#" className="hover:text-white transition-colors">Privacy</a>
                    <a href="#" className="hover:text-white transition-colors">Terms</a>
                    <a href="#" className="hover:text-white transition-colors">Twitter</a>
                </div>
                <p className="font-light mt-4">© 2026 Agent Arga. Built with precision.</p>
            </footer>

            {/* Keep minimal CSS keyframes in standard tailwind way if needed, but the predefined classes animate-[...] should work perfectly or fallback to normal display without errors. We added simple inline keyframes logic classes. If tailwind struggles with them, they still render cleanly. To be safe, let's inject a tiny style tag for the custom fade animation so it works 100%. */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}} />

        </div>
    );
};

export default LandingPage;
