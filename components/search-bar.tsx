"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { useDebounce } from "@/lib/hooks"
import { useEffect, useState, useTransition } from "react"

export function SearchBar() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [value, setValue] = useState(searchParams.get("search") || "")
  const debouncedValue = useDebounce(value, 300)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const params = new URLSearchParams(searchParams)
    if (debouncedValue) {
      params.set("search", debouncedValue)
    } else {
      params.delete("search")
    }
    startTransition(() => {
      router.replace(`/?${params.toString()}`, { scroll: false })
    })
  }, [debouncedValue, router, searchParams])

  return (
    <div className="relative w-full">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="pl-11 pr-4 py-2 bg-muted rounded-full w-full border-none focus-visible:ring-1 focus-visible:ring-primary/20 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50 text-muted-foreground"
        placeholder="Search contacts..."
      />
      <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 transition-opacity text-muted-foreground/70 ${isPending ? 'opacity-50' : 'opacity-100'}`} />
    </div>
  )
}

