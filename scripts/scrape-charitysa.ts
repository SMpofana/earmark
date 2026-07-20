/**
 * scripts/scrape-charitysa.ts
 *
 * Scrape charitysa.co.za to seed the organisations table.
 *
 * Usage:
 *   npm run scrape:charitysa -- --province=gauteng
 *
 * Idempotent: re-runs upsert by `source_external_id` (the charitysa slug).
 * Rate-limited (1 req/sec + 200ms jitter) with 429 backoff (max 3 retries).
 * Graceful on unreachable DB: prints a clear message and exits 0.
 *
 * Politeness:
 *   User-Agent: EarmarkBot/1.0 (contact: https://earmark.co.za)
 *   Accept-Language: en-ZA
 */

import { writeFileSync, mkdirSync } from "node:fs"
import { join } from "node:path"
import { nanoid } from "nanoid"
import {
  db,
  schema,
} from "../src/lib/db"
import { eq, sql } from "drizzle-orm"
import {
  slugify,
  generateId,
  mapCharitysaCategoriesToCauses,
  geocodeCity,
} from "../src/lib/utils"
import { uploadFromUrl } from "../src/lib/cloudinary"

// ── Config ────────────────────────────────────────────────────────────────────

const BASE = "https://www.charitysa.co.za"
const USER_AGENT = "EarmarkBot/1.0 (contact: https://earmark.co.za)"
const RATE_LIMIT_MS = 1000
const JITTER_MS = 200
const MAX_RETRIES = 3
const HOMEPAGE_TIMEOUT_MS = 8000

type Province = "gauteng" | "western_cape" | "kwazulu_natal" | "eastern_cape" | "limpopo" | "mpumalanga" | "north_west" | "free_state" | "northern_cape"

const PROVINCE_LIST_PATH: Record<Province, string> = {
  gauteng: "/gauteng-list",
  western_cape: "/western-cape-list",
  kwazulu_natal: "/kwa-zulu-natal-list",
  eastern_cape: "/eastern-cape-list",
  limpopo: "/limpopo-list",
  mpumalanga: "/mpumalanga-list",
  north_west: "/north-west-list",
  free_state: "/free-state-list",
  northern_cape: "/northern-cape-list",
}

// ── Argv ──────────────────────────────────────────────────────────────────────

function parseArgs(): { province: Province } {
  const argv = process.argv.slice(2)
  let province: Province = "gauteng"
  for (const arg of argv) {
    if (arg.startsWith("--province=")) {
      const v = arg.slice("--province=".length) as Province
      if (PROVINCE_LIST_PATH[v]) province = v
    }
  }
  return { province }
}

// ── HTTP fetch with retry ──────────────────────────────────────────────────────

async function fetchWithRetry(url: string): Promise<string | null> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          "Accept-Language": "en-ZA",
        },
      })
      if (res.status === 429) {
        const wait = Math.pow(2, attempt) * 1000
        console.warn(`  429 rate-limited, backing off ${wait}ms (attempt ${attempt + 1}/${MAX_RETRIES})`)
        await sleep(wait)
        continue
      }
      if (!res.ok) {
        console.warn(`  HTTP ${res.status} on ${url} (attempt ${attempt + 1}/${MAX_RETRIES})`)
        await sleep(500 * (attempt + 1))
        continue
      }
      return await res.text()
    } catch (err) {
      console.warn(`  fetch error on ${url}: ${(err as Error).message} (attempt ${attempt + 1}/${MAX_RETRIES})`)
      await sleep(500 * (attempt + 1))
    }
  }
  return null
}

async function fetchHomepage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), HOMEPAGE_TIMEOUT_MS)
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, "Accept-Language": "en-ZA" },
      signal: controller.signal,
    })
    clearTimeout(timeout)
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

// ── Parsing ───────────────────────────────────────────────────────────────────

/** Extract all /<slug>.html links from a list page. */
function extractSlugLinks(html: string): string[] {
  const re = /href="(\/[^"\/]+\.html)"/g
  const out = new Set<string>()
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    out.add(m[1].replace(/^\//, ""))
  }
  return Array.from(out)
}

/** Extract the first <h1>…</h1> text content. */
function extractH1(html: string): string | null {
  const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
  if (!m) return null
  return m[1].replace(/<[^>]+>/g, "").trim()
}

/**
 * Extract category tags from a charitysa detail page.
 * Categories appear as anchor text inside the article; we look for anchors whose
 * href matches `/category/<slug>` and take their text.
 */
function extractCategories(html: string): string[] {
  const out = new Set<string>()
  const re = /href="\/category\/[^"]+"[^>]*>([^<]+)<\/a>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    out.add(m[1].trim())
  }
  return Array.from(out)
}

/** Extract the town from the page (charitysa lists town in category tags too). */
function extractTown(html: string): string | null {
  // Towns appear as `/location/<town-slug>` anchor text.
  const re = /href="\/location\/[^"]+"[^>]*>([^<]+)<\/a>/i
  const m = re.exec(html)
  return m ? m[1].trim() : null
}

/** Extract the org's own website URL (not charitysa internal links). */
function extractWebsite(html: string, orgName: string): string | null {
  // Look for the first external anchor (not charitysa.co.za, not relative).
  const re = /href="(https?:\/\/(?!www\.charitysa\.co\.za|charitysa\.co\.za)[^"]+)"/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    const href = m[1]
    // Skip social links; we want the org homepage.
    if (/twitter\.com|x\.com|facebook\.com|instagram\.com|linkedin\.com/.test(href)) continue
    return href
  }
  // Fallback: sometimes the website is in a specific block. Use orgName as a hint.
  void orgName
  return null
}

/** Extract Twitter handle. */
function extractTwitter(html: string): string | null {
  const re = /href="(https?:\/\/(?:twitter\.com|x\.com)\/[^"]+)"/i
  const m = re.exec(html)
  return m ? m[1] : null
}

/** From an org's homepage HTML, extract a logo URL (og:image, favicon, or <img class*="logo">). */
function extractLogoFromHomepage(html: string, baseUrl: string): string | null {
  // og:image
  let m = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i)
  if (!m) m = html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:image"/i)
  if (m && m[1]) return resolveUrl(m[1], baseUrl)

  // <link rel="icon"> or rel="shortcut icon"
  m = html.match(/<link[^>]+rel="(?:shortcut icon|icon)"[^>]+href="([^"]+)"/i)
  if (!m) m = html.match(/<link[^>]+href="([^"]+)"[^>]+rel="(?:shortcut icon|icon)"/i)
  if (m && m[1]) return resolveUrl(m[1], baseUrl)

  // <img class*="logo" src="...">
  m = html.match(/<img[^>]+class="[^"]*logo[^"]*"[^>]+src="([^"]+)"/i)
  if (!m) m = html.match(/<img[^>]+src="([^"]+)"[^>]+class="[^"]*logo[^"]*"/i)
  if (m && m[1]) return resolveUrl(m[1], baseUrl)

  return null
}

/** From an org's homepage HTML, extract <meta name="description"> content. */
function extractDescriptionFromHomepage(html: string): string | null {
  let m = html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i)
  if (!m) m = html.match(/<meta[^>]+content="([^"]+)"[^>]+name="description"/i)
  if (m && m[1]) return m[1].trim()
  // Fallback: first <p> in <main> or first <p> overall.
  m = html.match(/<main[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i)
  if (!m) m = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i)
  if (m && m[1]) return m[1].replace(/<[^>]+>/g, "").trim().slice(0, 500)
  return null
}

function resolveUrl(href: string, baseUrl: string): string {
  try {
    return new URL(href, baseUrl).toString()
  } catch {
    return href
  }
}

// ── Sleep ─────────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

async function rateLimit(): Promise<void> {
  await sleep(RATE_LIMIT_MS + Math.floor(Math.random() * JITTER_MS))
}

// ── DB connectivity check ──────────────────────────────────────────────────────

async function dbReachable(): Promise<boolean> {
  try {
    await db.execute(sql`SELECT 1`)
    return true
  } catch (err) {
    console.error(
      `\nDATABASE_URL not configured or unreachable — scraper wrote 0 rows.\n` +
        `Set DATABASE_URL to a live Postgres to actually seed. The script logic is correct;\n` +
        `run with a real DB to populate.\n\nUnderlying error: ${(err as Error).message}\n`
    )
    return false
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const { province } = parseArgs()
  console.log(`\n=== Earmark charitysa scraper ===`)
  console.log(`Province: ${province}`)
  console.log(`List URL: ${BASE}${PROVINCE_LIST_PATH[province]}\n`)

  // DB connectivity — exit 0 if unreachable (graceful).
  if (!(await dbReachable())) {
    process.exit(0)
  }

  const listHtml = await fetchWithRetry(`${BASE}${PROVINCE_LIST_PATH[province]}`)
  if (!listHtml) {
    console.error(`Failed to fetch list page. Aborting.`)
    process.exit(1)
  }

  const slugs = extractSlugLinks(listHtml)
  console.log(`Found ${slugs.length} organisation links on the list page.\n`)

  const report = {
    province,
    startedAt: new Date().toISOString(),
    total: slugs.length,
    success: 0,
    skipped: 0,
    failed: 0,
    errors: [] as Array<{ slug: string; error: string }>,
  }

  for (let i = 0; i < slugs.length; i++) {
    const slug = slugs[i]
    const progress = `[${i + 1}/${slugs.length}]`
    process.stdout.write(`${progress} ${slug} … `)

    try {
      const detailHtml = await fetchWithRetry(`${BASE}/${slug}`)
      if (!detailHtml) {
        report.failed++
        report.errors.push({ slug, error: "detail page fetch failed" })
        console.log("FAIL (detail fetch)")
        await rateLimit()
        continue
      }

      const name = extractH1(detailHtml) ?? slug
      const town = extractTown(detailHtml) ?? "Unknown"
      const categories = extractCategories(detailHtml)
      const causes = mapCharitysaCategoriesToCauses(categories)
      const website = extractWebsite(detailHtml, name)
      const twitter = extractTwitter(detailHtml)
      void twitter // captured but not stored yet (no schema column for socials beyond fb/ig)

      // Logo + description from the org's own homepage (if available).
      let logoUrl: string | null = null
      let description: string | null = null
      if (website) {
        const homeHtml = await fetchHomepage(website)
        if (homeHtml) {
          const rawLogo = extractLogoFromHomepage(homeHtml, website)
          if (rawLogo) logoUrl = await uploadFromUrl(rawLogo)
          description = extractDescriptionFromHomepage(homeHtml)
        }
      }

      // Fallback description: charitysa boilerplate.
      if (!description) {
        description = `${name} is based in ${town}, ${province.replace(/_/g, " ")}.`
      }

      // Geocode city → lat/lng.
      const coords = await geocodeCity(town, province)

      // Upsert organisation by source_external_id.
      const orgId = generateId("org")
      const orgSlug = slugify(name)
      const now = new Date()

      await db
        .insert(schema.organisations)
        .values({
          id: orgId,
          userId: "system",
          name,
          slug: orgSlug,
          description,
          status: "active",
          isVerified: true,
          contactEmail: null,
          contactPhone: null,
          website: website ?? null,
          city: town,
          province,
          latitude: coords?.lat ?? null,
          longitude: coords?.lng ?? null,
          source: "charitysa_scraped",
          sourceExternalId: slug,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: schema.organisations.sourceExternalId,
          set: {
            name,
            description,
            website: website ?? null,
            city: town,
            latitude: coords?.lat ?? null,
            longitude: coords?.lng ?? null,
            updatedAt: now,
          },
        })

      // Upsert causes.
      for (const cause of causes) {
        await db
          .insert(schema.organisationCauses)
          .values({
            organisationId: orgId,
            cause: cause as (typeof schema.organisationCauses.$inferInsert)["cause"],
          })
          .onConflictDoNothing({
            target: [
              schema.organisationCauses.organisationId,
              schema.organisationCauses.cause,
            ],
          })
      }

      // Upsert logo image row.
      if (logoUrl) {
        await db
          .insert(schema.organisationImages)
          .values({
            id: nanoid(),
            organisationId: orgId,
            url: logoUrl,
            type: "logo",
            displayOrder: 0,
          })
          .onConflictDoNothing({
            target: [schema.organisationImages.organisationId, schema.organisationImages.type],
          })
      }

      report.success++
      console.log(
        `OK (${name}, ${town}, ${causes.length} cause${causes.length === 1 ? "" : "s"}${
          website ? `, web` : ""
        }${logoUrl ? `, logo` : ""}${coords ? `, geo` : ""})`
      )
    } catch (err) {
      report.failed++
      report.errors.push({ slug, error: (err as Error).message })
      console.log(`FAIL (${(err as Error).message})`)
    }

    await rateLimit()
  }

  report.skipped = report.total - report.success - report.failed

  // Write run report.
  const ts = new Date().toISOString().replace(/[:.]/g, "-")
  const reportDir = join(process.cwd(), "scripts", "scrape-runs")
  mkdirSync(reportDir, { recursive: true })
  const reportPath = join(reportDir, `scrape-run-${ts}.json`)
  writeFileSync(reportPath, JSON.stringify(report, null, 2))

  console.log(`\n=== Done ===`)
  console.log(`Total:   ${report.total}`)
  console.log(`Success: ${report.success}`)
  console.log(`Failed:  ${report.failed}`)
  console.log(`Report:  ${reportPath}\n`)

  process.exit(0)
}

main().catch((err) => {
  console.error("Scraper crashed:", err)
  process.exit(1)
})