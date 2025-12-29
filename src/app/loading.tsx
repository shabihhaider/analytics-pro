export default function Loading() {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-black">
            <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-white" />
            </div>
        </div>
    );
}
