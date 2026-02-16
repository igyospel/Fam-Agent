import React from 'react';
import { X, Check, Sparkles } from 'lucide-react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="relative bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-enter transform scale-100">
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-orange-400 to-amber-600"></div>
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white rounded-full p-1.5 transition-colors z-10"
        >
          <X size={20} />
        </button>

        <div className="relative px-8 pt-16 pb-8 text-center">
          <div className="w-20 h-20 mx-auto bg-white rounded-2xl shadow-xl flex items-center justify-center mb-6 transform rotate-3">
             <Sparkles size={40} className="text-orange-500" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Upgrade to Pro</h2>
          <p className="text-gray-500 mb-8 text-sm leading-relaxed">
            Unlock advanced AI models, unlimited usage, and priority support. 
            Supercharge your workflow today.
          </p>

          <div className="space-y-3 mb-8 text-left pl-4">
            {[
              "Unlimited GPT-4 & Gemini Advanced",
              "10x Faster Processing Speed",
              "Exclusive Image Generation Tools",
              "Priority 24/7 Support"
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-gray-700">
                 <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <Check size={12} className="text-green-600 font-bold" />
                 </div>
                 {feature}
              </div>
            ))}
          </div>

          <button 
            className="w-full bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all"
            onClick={onClose}
          >
            Get Pro - $19/mo
          </button>
          <p className="mt-4 text-xs text-gray-400">Cancel anytime. 7-day free trial included.</p>
        </div>
      </div>
    </div>
  );
};

export default UpgradeModal;