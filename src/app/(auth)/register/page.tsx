"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { signUp } from "@/lib/auth-client"
import { registerSchema, type RegisterInput } from "@/lib/validations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function RegisterPage() {
  const router = useRouter()
  const params = useSearchParams()
  const defaultRole = params.get("role") as "org_admin" | "contributor" || "contributor"
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState<"contributor" | "org_admin">(defaultRole)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role },
  })

  async function onSubmit(data: RegisterInput) {
    setLoading(true)
    setError("")
    try {
      await signUp.email({
        name: data.name,
        email: data.email,
        password: data.password,
        callbackURL: role === "org_admin" ? "/onboard" : "/organisations",
      })
      router.push(role === "org_admin" ? "/onboard" : "/organisations")
      router.refresh()
    } catch (e: any) {
      setError(e?.message || "Registration failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
        <p className="text-sm text-slate-500 mt-1">Join thousands of South Africans giving back</p>
      </div>

      {/* Role toggle */}
      <div className="flex rounded-lg border border-slate-200 p-1 mb-6">
        {(["contributor", "org_admin"] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRole(r)}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
              role === r
                ? "bg-brand-500 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {r === "contributor" ? "I want to contribute" : "I represent an NPO"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <input type="hidden" {...register("role")} value={role} />

        <div className="space-y-1.5">
          <Label htmlFor="name" required>Full name</Label>
          <Input
            id="name"
            autoComplete="name"
            placeholder="Thabo Mokoena"
            {...register("name")}
            error={errors.name?.message}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email" required>Email address</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="thabo@example.com"
            {...register("email")}
            error={errors.email?.message}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone number</Label>
          <Input
            id="phone"
            type="tel"
            autoComplete="tel"
            placeholder="0821234567"
            {...register("phone")}
            error={errors.phone?.message}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" required>Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            {...register("password")}
            error={errors.password?.message}
          />
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading
            ? "Creating account…"
            : role === "org_admin"
            ? "Register & start onboarding"
            : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand-600 hover:underline">
          Sign in
        </Link>
      </p>
      <p className="mt-3 text-center text-xs text-slate-400">
        By registering you agree to our{" "}
        <Link href="/terms" className="underline">Terms</Link> and{" "}
        <Link href="/privacy" className="underline">Privacy Policy</Link>.
      </p>
    </>
  )
}
