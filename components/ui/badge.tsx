import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-primary/30 bg-primary/15 text-primary-100 hover:bg-primary/25",
        secondary:
          "border-surface-300/60 bg-surface-400/60 text-muted-foreground hover:bg-surface-300/60",
        destructive:
          "border-rose-500/30 bg-rose-500/15 text-rose-400 hover:bg-rose-500/25",
        outline: "text-foreground border-border",
        success:
          "border-emerald-500/30 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25",
        warning:
          "border-orange-500/30 bg-orange-500/15 text-orange-400 hover:bg-orange-500/25",
        pending:
          "border-amber-500/30 bg-amber-500/15 text-amber-400 hover:bg-amber-500/25",
        processing:
          "border-sky-500/30 bg-sky-500/15 text-sky-400 hover:bg-sky-500/25",
        info:
          "border-violet-500/30 bg-violet-500/15 text-violet-400 hover:bg-violet-500/25",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
  VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
