import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';

interface GoogleSimulationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: { email: string; name: string }) => void;
}

const GoogleSimulationModal: React.FC<GoogleSimulationModalProps> = ({
    isOpen,
    onClose,
    onConfirm
}) => {
    const [isLoading, setIsLoading] = useState(false);
    const [data, setData] = useState({ email: '', name: '' });

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!data.email || !data.name) return;

        setIsLoading(true);
        // Simulate network delay for realism
        setTimeout(() => {
            onConfirm(data);
            setIsLoading(false);
            onClose();
        }, 1000);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-enter">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            {/* Modal Content - Styled to look slightly like a Google prompt */}
            <div className="relative w-full max-w-[400px] bg-white rounded-xl shadow-2xl overflow-hidden animate-slide-up">

                {/* Google Header */}
                <div className="px-6 pt-6 pb-2 text-center">
                    <div className="flex justify-center mb-4">
                        <svg className="w-8 h-8" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">
                        Sign in with Google
                    </h3>
                    <p className="text-gray-500 text-sm mt-1">
                        To continue to <b>Fam Agent</b>
                    </p>
                </div>

                <div className="p-6 pt-4">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Mock Account Selector */}
                        <div className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors cursor-pointer flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                                {data.name ? data.name.charAt(0).toUpperCase() : '?'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <input
                                    type="text"
                                    placeholder="Your Name (e.g. John Doe)"
                                    required
                                    className="w-full bg-transparent border-none p-0 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:ring-0"
                                    value={data.name}
                                    onChange={(e) => setData({ ...data, name: e.target.value })}
                                />
                                <input
                                    type="email"
                                    placeholder="your.email@gmail.com"
                                    required
                                    className="w-full bg-transparent border-none p-0 text-xs text-gray-500 placeholder:text-gray-400 focus:ring-0 mt-0.5"
                                    value={data.email}
                                    onChange={(e) => setData({ ...data, email: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="text-xs text-gray-500 px-1">
                            This assumes the account is logged in on this device.
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition-colors flex items-center gap-2"
                            >
                                {isLoading && <Loader2 size={14} className="animate-spin" />}
                                Continue
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default GoogleSimulationModal;
