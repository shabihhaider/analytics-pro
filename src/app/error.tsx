'use client';

import { useEffect } from 'react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-black text-white">
            <div className="max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-xl">
                <h2 className="mb-2 text-xl font-bold">Something went wrong</h2>
                <p className="mb-6 text-sm text-gray-400">
                    We encountered an error loading the analytics data. This might be a temporary connectivity issue.
                </p>
                <button
                    onClick={reset}
                    className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-gray-200 transition-colors"
                >
                    Try again
                </button>
            </div>
        </div>
    );
}
