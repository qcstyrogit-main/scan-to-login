
import React from "react"
import { Toaster as Sonner, toast } from "sonner"
import { useTheme } from "@/components/theme-provider"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast relative flex w-[min(88vw,360px)] items-center justify-center gap-3 overflow-hidden rounded-full border border-white/40 bg-white/80 px-5 py-3 text-center shadow-[0_10px_24px_-14px_rgba(15,23,42,0.45)] backdrop-blur-md ring-1 ring-black/5 dark:border-white/10 dark:bg-slate-900/75 dark:ring-white/10 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2",
          title: "text-[13px] font-semibold tracking-tight",
          description: "text-[12px] text-muted-foreground",
          content: "flex flex-col items-center gap-0.5",
          icon: "h-4 w-4 text-foreground/70",
          closeButton:
            "absolute right-2 top-2 rounded-full p-1 text-foreground/40 transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          actionButton:
            "rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90",
          cancelButton:
            "rounded-full border border-border/70 bg-transparent px-3 py-1 text-[11px] font-semibold text-foreground/70 transition hover:bg-muted",
          success:
            "border-emerald-500/30 dark:border-emerald-400/20",
          error:
            "border-rose-500/30 dark:border-rose-400/20",
          warning:
            "border-amber-500/40 dark:border-amber-400/20",
          info:
            "border-sky-500/35 dark:border-sky-400/20",
        },
      }}
      {...props}
    />
  )
}

export { Toaster, toast }
