"use client";

import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext<{ token: string | null }>({ token: null });

export function AuthProvider({
    token,
    children
}: {
    token: string | null,
    children: React.ReactNode
}) {
    // If token passed from server (e.g. layout), use it.
    // Otherwise try to find in window/cookies?
    // For now, server passing is reliable.
    return (
        <AuthContext.Provider value={{ token }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
