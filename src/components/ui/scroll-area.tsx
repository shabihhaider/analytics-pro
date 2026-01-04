
import * as React from "react"
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"

import { cn } from "@/lib/utils"

// Simplified version w/o Radix dependency if not installed, but let's assume we want a standard div if Radix is missing.
// Actually, to avoid "npm install @radix-ui/react-scroll-area", I will make a native scroll wrapper that matches the API.

const ScrollArea = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("relative overflow-auto", className)}
        {...props}
    >
        {children}
    </div>
))
ScrollArea.displayName = "ScrollArea" //Simple polyfill

export { ScrollArea }
