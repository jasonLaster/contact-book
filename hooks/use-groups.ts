import { useEffect, useState } from "react"
import { getGroups } from "@/lib/actions"
import { Group } from "@/lib/db/schema"

type GroupWithContacts = Group & {
  contactCount: number
  contacts?: { contactId: string }[]
}

export function useGroups() {
  const [groups, setGroups] = useState<GroupWithContacts[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    async function fetchGroups() {
      try {
        const data = await getGroups()
        setGroups(data)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch groups'))
      } finally {
        setIsLoading(false)
      }
    }

    fetchGroups()
  }, [version])

  const refreshGroups = () => {
    setVersion(v => v + 1)
  }

  return { groups, isLoading, error, refreshGroups }
} 