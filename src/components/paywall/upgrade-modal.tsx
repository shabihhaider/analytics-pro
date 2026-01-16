'use client';

import { useState } from 'react';
import { X, Sparkles, TrendingUp, BookOpen, Users, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    feature?: string;
    message?: string;
}

export function UpgradeModal({ isOpen, onClose, feature, message }: UpgradeModalProps) {
    if (!isOpen) return null;

    const proFeatures = [
        { icon: TrendingUp, text: 'Revenue Forecast (30/60/90 days)' },
        { icon: BookOpen, text: 'Course Analytics & Completion Rates' },
        { icon: Users, text: 'Unlimited Churn Risk Members' },
        { icon: MessageSquare, text: 'Unlimited AI Coach Chat' },
    ];

    // Link to Whop product page - replace with actual product URL
    const upgradeUrl = process.env.NEXT_PUBLIC_WHOP_PRO_URL || 'https://whop.com/your-app/pro';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-gradient-to-b from-gray-900 to-black border border-white/10 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                >
                    <X className="h-5 w-5" />
                </button>

                {/* Header */}
                <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 mb-4">
                        <Sparkles className="h-8 w-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                        Upgrade to Pro
                    </h2>
                    {message && (
                        <p className="text-gray-400 text-sm">
                            {message}
                        </p>
                    )}
                </div>

                {/* Features */}
                <div className="space-y-3 mb-6">
                    {proFeatures.map((item, i) => (
                        <div key={i} className="flex items-center gap-3 text-gray-300">
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-500/20">
                                <item.icon className="h-4 w-4 text-green-400" />
                            </div>
                            <span className="text-sm">{item.text}</span>
                        </div>
                    ))}
                </div>

                {/* Price */}
                <div className="text-center mb-6">
                    <span className="text-4xl font-bold text-white">$29</span>
                    <span className="text-gray-400">/month</span>
                </div>

                {/* CTA */}
                <a href={upgradeUrl} target="_blank" rel="noopener noreferrer">
                    <Button className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-semibold py-6 text-lg">
                        Upgrade Now
                    </Button>
                </a>

                {/* Cancel */}
                <button
                    onClick={onClose}
                    className="w-full mt-3 text-gray-500 hover:text-gray-400 text-sm transition-colors"
                >
                    Maybe Later
                </button>
            </div>
        </div>
    );
}
