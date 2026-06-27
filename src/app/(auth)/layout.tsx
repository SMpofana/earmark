import { Heart } from "lucide-react"
import Link from "next/link"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-slate-50 py-12 px-4">
      <Link href="/" className="flex items-center gap-2 mb-8">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500">
          <Heart className="h-5 w-5 text-white" />
        </div>
        <span className="font-bold text-xl text-slate-900">earmark</span>
      </Link>
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
        {children}
      </div>
    </div>
  )
}
