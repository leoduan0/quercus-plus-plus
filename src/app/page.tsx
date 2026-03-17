"use client"

import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { TokenEntry } from "@/components/token-entry"

const TOKEN_KEY = "quercusToken"

export default function LandingPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) {
      router.replace("/courses")
      return
    }
    setReady(true)
  }, [router])

  const handleToken = useCallback(
    (nextToken: string) => {
      localStorage.setItem(TOKEN_KEY, nextToken)
      router.replace("/courses")
    },
    [router],
  )

  if (!ready) return null

  return <TokenEntry onToken={handleToken} />
}
