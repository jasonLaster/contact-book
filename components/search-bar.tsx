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
    <div className="relative">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="pl-10 pr-4 py-2 bg-muted rounded-full"
        placeholder="Search contacts..."
      />
      <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-opacity ${isPending ? 'opacity-50' : 'opacity-100'}`} />
    </div>
  )
}

