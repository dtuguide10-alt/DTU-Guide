import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] text-sm font-medium cursor-pointer transition-all duration-200 [transition-timing-function:var(--ease-soft)] active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-45 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-[var(--elevation-1)] hover:bg-primary-deep",
        destructive: "bg-destructive text-destructive-foreground shadow-[var(--elevation-1)] hover:opacity-90",
        outline:
          "border border-border bg-card shadow-[var(--elevation-1)] hover:bg-accent hover:border-primary/30",
        secondary: "bg-secondary text-secondary-foreground hover:bg-accent",
        ghost: "hover:bg-accent hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // Primary CTA — solid accent, soft elevation, gentle press. No glow.
        pixel:
          "bg-primary text-primary-foreground shadow-[var(--elevation-1)] hover:bg-primary-deep",
        // Secondary — neutral surface + hairline border.
        pixelOutline:
          "border border-border bg-card text-foreground shadow-[var(--elevation-1)] hover:bg-accent hover:border-primary/30",
        // Ghost — quiet, text-forward.
        pixelQuiet:
          "text-muted-foreground hover:bg-accent hover:text-foreground",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-[8px] px-3 text-xs",
        lg: "h-10 px-8",
        icon: "h-9 w-9",
        pixel: "h-12 px-5 text-sm",
      },

    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
