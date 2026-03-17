"use client"

import { validateCanvasTokenAction } from "@/app/actions/canvas"
import { Button } from "./ui/button"
import { Spinner } from "./ui/spinner"
import { useTransition } from "react"
import { Controller, useForm } from "react-hook-form"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion"
import { Input } from "./ui/input"
import { Field, FieldError, FieldLabel } from "./ui/field"
import * as z from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

const formSchema = z.object({
  token: z.string().min(1),
})

export function TokenEntry({ onToken }: { onToken: (token: string) => void }) {
  const [loading, startLoading] = useTransition()
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      token: "",
    },
  })

  async function onSubmit(data: z.infer<typeof formSchema>) {
    startLoading(async () => {
      const token = data.token.trim()

      if (!token) {
        toast.error("You have not provided a token.")
      }

      try {
        await validateCanvasTokenAction(token)
        onToken(token)
        toast.success("Success!", {
          description: "Your token is valid. Redirecting you to the home page.",
        })
      } catch {
        toast.error("Invalid token")
      }
    })
  }

  return (
    <div className=" flex min-h-screen items-center justify-center px-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Quercus++</CardTitle>
          <p className="text-sm text-canvas-muted">
            Connect your Quercus account to get started.
          </p>
        </CardHeader>
        <CardContent>
          <form
            id="form-entry"
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <Controller
              name="token"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="form-rhf-demo-title">
                    Canvas API Token
                  </FieldLabel>
                  <Input
                    {...field}
                    id="form-entry-token"
                    aria-invalid={fieldState.invalid}
                    placeholder="Enter your token here..."
                    autoComplete="off"
                    type="password"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Button type="submit" form="form-entry" disabled={loading}>
              {loading && <Spinner />}
              {loading ? "Submitting..." : "Submit"}
            </Button>
          </form>

          <Accordion type="single" defaultValue="token" className="max-w-lg">
            <AccordionItem value="token">
              <AccordionTrigger>
                How do I get my Canvas API token?
              </AccordionTrigger>
              <AccordionContent>
                <ol className="list-decimal list-inside">
                  <li>Go to Quercus → Account → Settings</li>
                  <li>Scroll to Approved Integrations</li>
                  <li>Click + New Access Token</li>
                  <li>
                    Give it a name (e.g. "Quercus++") and click Generate Token
                  </li>
                  <li>Copy the token and paste it above</li>
                </ol>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="data">
              <AccordionTrigger>Do you store my data?</AccordionTrigger>
              <AccordionContent>
                We do not store any data. We don't even have a server. Your
                Canvas API token will be stored locally on your own browser.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  )
}
