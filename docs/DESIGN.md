# Blog AT Protocol Publishing — Design

Automate the DXOS Astro blog's standard.site / AT Protocol publishing flow
end-to-end, and clean up the surrounding tooling. Scope is the `docs/` site;
no runtime package is affected.

## Verdict on the package (settled)

Keep `@bryanguffey/astro-standard-site` (currently via the pnpm catalog). It is
the **only** Astro-specific package for standard.site and is actively maintained
(v1.0.3). The framework-agnostic [Sequoia CLI](https://sequoia.pub) could replace
the sync script but drops the `Comments.astro` component we rely on, so it is not
worth adopting. **The work is entirely about the workflow, not the package.**

## Problems with the current workflow

The single script `docs/scripts/sync-to-atproto.ts` today:

- Publishes a `site.standard.document` record to AT Protocol.
- Optionally posts a Bluesky announcement skeet when `ANNOUNCE=true`.
- Writes `documentAtUri` and `bskyPostUri` **back into the markdown frontmatter**
  via a hand-rolled `parseFrontmatter` / `writeFrontmatterField`.

Pain points:

1. **Fully manual** — someone must remember to run the script after every post.
2. **Two-commit messiness** — writing URIs back into source markdown means
   publishing takes two commits and dirties post diffs.
3. **Ordering bug** — with `ANNOUNCE=true`, the skeet goes out *before* Cloudflare
   Pages rebuilds the site, so a reader clicking through from the announcement
   hits a page with no `<link rel="site.standard.document">` discovery tag and no
   comments section wired up.
4. **Missing basics** — no `@astrojs/sitemap` (SEO gap); a fragile custom YAML
   parser instead of `gray-matter`; the script is not registered as a moon task.

## What the URIs unlock (reference)

- `documentAtUri` → `<link rel="site.standard.document">` in `<head>` so AT
  Protocol readers (e.g. Leaflet) discover the post lives on dxos.org.
- `bskyPostUri` → the `<Comments>` component fetches Bluesky replies to the
  announcement skeet and renders them as the post's comment section.

## Target design (agreed)

End-to-end automation via a **two-job GitHub Actions workflow**, solving the
"wait for rebuild" ordering problem by polling the live URL.

### 1. Sidecar state file

Move `documentAtUri` / `bskyPostUri` out of markdown frontmatter into a single
sidecar JSON at **`docs/src/data/atproto.json`** — deliberately **outside** the
blog content trigger path so CI's own commits don't re-trigger the workflow.
Yields clean post diffs and single-file CI commits.

### 2. Split the script into two

- **`sync-to-atproto.ts`** — publishes `site.standard.document` records, writes
  `documentAtUri` to the sidecar, outputs the list of newly synced slugs.
- **`announce-blog.ts`** — reads the sidecar, finds posts with a `documentAtUri`
  but no `bskyPostUri`, posts the Bluesky skeet for each, writes `bskyPostUri`
  back. Also runnable manually per-slug.

Each script does one job.

### 3. Two-job workflow

Trigger on push to `main` when blog files change.

- **Job `sync`** — run `sync-to-atproto.ts`, commit `atproto.json`, push. Emits
  `new_slugs` output. Cloudflare Pages starts rebuilding on the push.
- **Job `announce`** (`needs: sync`, `if: new_slugs != ''`) — **poll the live blog
  URL** (`curl https://dxos.org/blog/$slug` every 30s, ~20 tries / ~10 min max)
  until the `site.standard.document` link tag appears, then run `announce-blog.ts`
  and commit `bskyPostUri`.

The URL poll (Option A) is preferred over the Cloudflare Pages API (Option B,
needs `CLOUDFLARE_API_TOKEN` — already in CI but adds coupling) and a fixed sleep
(Option C, fragile). It verifies the exact condition we care about: the page is
live with the discovery link.

The sidecar living outside the trigger path is what prevents self-retriggering;
`[skip ci]` on the commits is a belt-and-suspenders backup.

### 4. Tooling cleanup

- Add `@astrojs/sitemap`.
- Replace the custom YAML parser with `gray-matter`.
- Register a `sync-blog` moon task so the script is discoverable.

## Open questions / decisions to confirm before build

- Exact secret names available in CI for Bluesky handle + app password.
- Whether announce should stay CI-automatic (via the poll) or remain a
  deliberate manual trigger — the poll design makes full automation safe, but the
  user may still prefer a human in the loop for the skeet.
- Migration of existing posts' in-frontmatter URIs into the sidecar (one-time).

## Provenance

Distilled from t3code thread `Review blog publishing integration`
(`2c0a4e9d-7754-426b-92c6-e2e6c2580f01`), 2026-06-26 → 2026-07-21.
