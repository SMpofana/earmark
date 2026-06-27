import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700",
        secondary:
          "bg-teal-600 text-white hover:bg-teal-700 active:bg-teal-800",
        outline:
          "border-2 border-brand-500 text-brand-600 hover:bg-brand-50 active:bg-brand-100",
        ghost:
          "text-slate-700 hover:bg-slate-100 active:bg-slate-200",
        destructive:
          "bg-red-500 text-white hover:bg-red-600 active:bg-red-700",
        link:
          "text-brand-600 underline-offset-4 hover:underline p-0 h-auto font-normal",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        default: "h-10 px-5 py-2",
        lg: "h-12 px-7 text-base",
        xl: "h-14 px-9 text-lg",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
