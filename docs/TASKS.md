# Blog AT Protocol Publishing — Tasks

_Resume: nothing built yet — start with Phase 1 (sidecar migration + script split). Uncommitted: this scaffold (DESIGN.md + TASKS.md + registry entry). Last: project scaffolded from t3code thread 2c0a4e9d._

Automate the `docs/` Astro blog's standard.site / AT Protocol publishing flow
end-to-end and clean up the tooling. See `DESIGN.md` for the full rationale and
the settled decision to keep `@bryanguffey/astro-standard-site`.

## Phase 1: Decouple state + split scripts

Foundation for automation: get AT Protocol URIs out of markdown frontmatter and
give sync vs. announce separate responsibilities.

### Tasks

- [ ] **Introduce sidecar state `docs/src/data/atproto.json`**
  - New file outside the blog content trigger path.
  - One-time migration of existing `documentAtUri` / `bskyPostUri` values out of
    post frontmatter into the sidecar.
  - Update `[...slug].astro` and `Comments.astro` to read URIs from the sidecar.
- [ ] **Split `sync-to-atproto.ts` into `sync` + `announce`**
  - `sync-to-atproto.ts`: publish `site.standard.document`, write `documentAtUri`
    to sidecar, output newly synced slugs.
  - New `announce-blog.ts`: read sidecar, announce posts missing `bskyPostUri`,
    write it back; runnable manually per-slug.

## Phase 2: End-to-end CI automation

Two-job GitHub Actions workflow that publishes, waits for the Cloudflare rebuild,
then announces — fixing the ordering bug.

### Tasks

- [ ] **Job `sync`** — trigger on push to `main` touching blog files; run sync,
      commit `atproto.json`, push, emit `new_slugs`.
- [ ] **Job `announce`** (`needs: sync`, guarded on `new_slugs`) — poll the live
      blog URL until the `site.standard.document` link tag is present (~30s ×20),
      then run `announce-blog.ts` and commit `bskyPostUri`.
- [ ] **Confirm CI secrets** for the Bluesky handle + app password; decide
      auto-announce vs. deliberate manual trigger (see DESIGN open questions).

## Phase 3: Tooling cleanup

### Tasks

- [ ] **Add `@astrojs/sitemap`** (SEO gap).
- [ ] **Replace the hand-rolled YAML parser with `gray-matter`.**
- [ ] **Register a `sync-blog` moon task** in `docs/moon.yml`.

## References

- Source: t3code thread `Review blog publishing integration`
  (`2c0a4e9d-7754-426b-92c6-e2e6c2580f01`).
- Files: `docs/scripts/sync-to-atproto.ts`, `docs/src/pages/blog/[...slug].astro`,
  `docs/src/pages/.well-known/site.standard.publication.ts`.
- [Sequoia CLI](https://sequoia.pub) — evaluated, rejected (drops Comments).
