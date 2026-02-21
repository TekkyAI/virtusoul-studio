import { cn } from '@/lib/utils'
import type { HTMLAttributes } from 'react'

const variants: Record<string, string> = {
  default: 'bg-[var(--muted)] text-[var(--muted-foreground)]',
  primary: 'bg-vsd-3 text-vsd-11 dark:bg-vsd-3 dark:text-vsd-11',
  destructive: 'bg-[var(--destructive)]/10 text-[var(--destructive)]',
  success: 'bg-green-500/10 text-green-500',
}

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof variants
}

export function Badge({ variant = 'default', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium', variants[variant], className)}
      {...props}
    />
  )
}
