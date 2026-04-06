import * as React from "react";
import { cn } from "../../lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => {
    return (
        <textarea
            className={cn("flex min-h-[80px] w-full rounded-2xl border border-white/10 bg-base-200 px-3 py-2 text-sm text-base-content placeholder:text-base-content/40 focus:border-emerald-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50", className)}
            ref={ref}
            {...props}
        />
    );
});
Textarea.displayName = "Textarea";

export { Textarea };