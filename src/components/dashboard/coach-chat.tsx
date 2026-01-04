
import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { MessageCircle, X, Send, Bot } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";

interface CoachChatProps {
    contextStats?: any;
}

interface Message {
    role: 'user' | 'assistant';
    text: string;
}

export function CoachChat({ contextStats }: CoachChatProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', text: "Hey! I'm your AI Coach. Ask me anything about your community metrics." }
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMsg = input;
        setInput("");
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setLoading(true);

        try {
            const res = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMsg, contextStats })
            });

            if (!res.ok) throw new Error("Failed");

            const data = await res.json();
            setMessages(prev => [...prev, { role: 'assistant', text: data.reply }]);
        } catch (e) {
            setMessages(prev => [...prev, { role: 'assistant', text: "Sorry, I had trouble thinking about that. Try again?" }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-4">
            {isOpen && (
                <Card className="w-80 md:w-96 h-[500px] flex flex-col bg-black/90 border-purple-500/30 backdrop-blur-xl shadow-2xl animate-in slide-in-from-bottom-10 fade-in duration-300">
                    <CardHeader className="bg-gradient-to-r from-violet-900/90 to-fuchsia-900/90 border-b border-white/10 py-4 shadow-sm">
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                                <div className="p-1.5 bg-white/10 rounded-lg">
                                    <Bot className="h-4 w-4 text-purple-300" />
                                </div>
                                <div>
                                    <span className="block text-purple-100">AI Coach</span>
                                    <span className="block text-[10px] font-normal text-purple-300/80">Online & Ready</span>
                                </div>
                            </CardTitle>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors" onClick={() => setIsOpen(false)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 p-0 overflow-hidden relative bg-neutral-950/50">
                        <ScrollArea className="h-full p-4 pr-2">
                            <div className="space-y-4">
                                {messages.map((m, i) => (
                                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${m.role === 'user'
                                            ? 'bg-purple-600 text-white rounded-br-sm'
                                            : 'bg-white/10 text-gray-200 rounded-bl-sm border border-white/5'
                                            }`}>
                                            {m.text}
                                        </div>
                                    </div>
                                ))}
                                {loading && (
                                    <div className="flex justify-start">
                                        <div className="bg-white/5 rounded-2xl px-4 py-3 text-sm text-gray-400 animate-pulse rounded-bl-sm border border-white/5 flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                            <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                            <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" />
                                        </div>
                                    </div>
                                )}
                                <div ref={scrollRef} />
                            </div>
                        </ScrollArea>
                    </CardContent>
                    <CardFooter className="p-3 border-t border-white/5 bg-white/[0.02]">
                        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex w-full gap-2 font-normal">
                            <Input
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                placeholder="Ask about your metrics..."
                                className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-purple-500/50 focus-visible:border-purple-500/50 h-10 transition-all rounded-xl"
                            />
                            <Button type="submit" size="icon" disabled={loading || !input.trim()} className="h-10 w-10 bg-purple-600 hover:bg-purple-500 text-white rounded-xl shadow-lg shadow-purple-500/20 transition-all">
                                <Send className="h-4 w-4" />
                            </Button>
                        </form>
                    </CardFooter>
                </Card>
            )}

            <Button
                onClick={() => setIsOpen(!isOpen)}
                size="lg"
                className={`h-14 w-14 rounded-full shadow-xl transition-all duration-300 ${isOpen ? 'bg-red-500 hover:bg-red-600 rotate-180' : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:scale-110'}`}
            >
                {isOpen ? <X className="h-6 w-6 text-white" /> : <MessageCircle className="h-6 w-6 text-white" />}
            </Button>
        </div>
    );
}
