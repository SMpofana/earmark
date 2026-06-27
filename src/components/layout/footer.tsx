import Link from "next/link"
import { Heart } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500">
                <Heart className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-lg text-slate-900">earmark</span>
            </Link>
            <p className="mt-3 text-sm text-slate-500">
              Connecting generous South Africans with verified non-profit organisations.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Contribute</h3>
            <ul className="space-y-2 text-sm text-slate-500">
              <li><Link href="/organisations" className="hover:text-brand-600">Find organisations</Link></li>
              <li><Link href="/organisations?type=goods" className="hover:text-brand-600">Donate goods</Link></li>
              <li><Link href="/organisations?type=money" className="hover:text-brand-600">Donate money</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Organisations</h3>
            <ul className="space-y-2 text-sm text-slate-500">
              <li><Link href="/register?role=org_admin" className="hover:text-brand-600">Register your NPO</Link></li>
              <li><Link href="/dashboard" className="hover:text-brand-600">Organisation dashboard</Link></li>
              <li><Link href="/about" className="hover:text-brand-600">How it works</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Legal</h3>
            <ul className="space-y-2 text-sm text-slate-500">
              <li><Link href="/privacy" className="hover:text-brand-600">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-brand-600">Terms of Service</Link></li>
              <li><Link href="/contact" className="hover:text-brand-600">Contact Us</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-200 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-400">
            &copy; {new Date().getFullYear()} Earmark. Proudly South African.
          </p>
          <p className="text-xs text-slate-400">
            Made with <Heart className="inline h-3 w-3 text-red-400" /> for communities across Mzansi
          </p>
        </div>
      </div>
    </footer>
  )
}
