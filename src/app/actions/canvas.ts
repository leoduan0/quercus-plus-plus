"use server"

import { fetchAllCanvasData, validateCanvasToken } from "@/lib/canvas"

export async function fetchAllCanvasDataAction(token: string) {
  if (!token) throw new Error("Missing Canvas token")
  return fetchAllCanvasData(token)
}

export async function validateCanvasTokenAction(token: string) {
  if (!token) throw new Error("Missing Canvas token")
  return validateCanvasToken(token)
}
