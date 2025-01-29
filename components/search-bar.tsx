"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { PanelRight, Search } from "lucide-react"
import { useDebounce } from "@/lib/hooks"
import { useEffect, useState, useTransition } from "react"
import { useSidebar } from "@/lib/contexts/sidebar-context"
import { Button } from "./ui/button"
import { cn } from "@/lib/utils"

export function SearchBar() {
  const [value, setValue] = useState("")
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isCollapsed, setIsCollapsed } = useSidebar()

  useEffect(() => {
    setValue(searchParams.get("search") || "")
  }, [searchParams])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setValue(newValue)
    startTransition(() => {
      if (newValue) {
        router.push(`/?search=${encodeURIComponent(newValue)}`)
      } else {
        router.push("/")
      }
    })
  }

  return (
    <div className="h-[56px] flex items-center gap-2">
      {isCollapsed && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(false)}
          className="shrink-0 ml-2"
        >
          <PanelRight className="h-4 w-4" />
        </Button>
      )}
      <div className={cn("relative w-full", isCollapsed ? "pr-4" : "px-4")}>
        <Input
          value={value}
          onChange={handleChange}
          className="pl-9 pr-4 h-9 bg-muted rounded-full w-full border-none focus-visible:ring-1 focus-visible:ring-primary/20 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50 text-muted-foreground"
          placeholder="Search contacts..."
        />
        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-opacity text-muted-foreground/70 ${isPending ? 'opacity-50' : 'opacity-100'}`} />
      </div>
    </div>
  )
}

