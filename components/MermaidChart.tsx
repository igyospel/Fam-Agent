import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    securityLevel: 'loose',
    fontFamily: 'Inter, sans-serif'
});

interface MermaidChartProps {
    chart: string;
}

const MermaidChart: React.FC<MermaidChartProps> = ({ chart }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (containerRef.current && chart) {
            mermaid.render(`mermaid-${Math.random().toString(36).substr(2, 9)}`, chart).then((result) => {
                if (containerRef.current) {
                    containerRef.current.innerHTML = result.svg;
                }
            }).catch(err => {
                console.error("Mermaid error:", err);
            });
        }
    }, [chart]);

    return <div ref={containerRef} className="mermaid-chart my-4 p-4 bg-[#0A0A0A] border border-white/10 rounded-xl overflow-x-auto text-center flex justify-center w-full" />;
};

export default MermaidChart;
