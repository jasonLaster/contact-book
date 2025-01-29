"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { useDebounce } from "@/lib/hooks"
import { useEffect, useState, useTransition } from "react"

export function SearchBar() {
  const [value, setValue] = useState("")
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const searchParams = useSearchParams()

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
    <div className="p-2">
      <div className="relative w-full">
        <Input
          value={value}
          onChange={handleChange}
          className="pl-11 pr-4 py-1.5 bg-muted rounded-full w-full border-none focus-visible:ring-1 focus-visible:ring-primary/20 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50 text-muted-foreground"
          placeholder="Search contacts..."
        />
        <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-opacity text-muted-foreground/70 ${isPending ? 'opacity-50' : 'opacity-100'}`} />
      </div>
    </div>
  )
}

