# CI tool patches

Fixes to tools only the CI workflows run, applied by the script that runs the tool rather than by pnpm's
`patchedDependencies` like the ones in [`/patches`](../../patches/README.md). Every moon task hashes `/patches/*`
(`.moon/tasks/all.yml`) and the root's dependencies (`tools/moon-dependency-closure`), so a tool no build loads would
otherwise give every task a new cache key.

## `pkg-pr-new@0.0.93`

**What.** When a publish is over 99 MB, uploads the largest packages of 5 MB or less separately as well
(multipart, like the packages over 5 MB), until the ones left in the final `POST /publish` total 90 MB or
less.

**Why.** pkg-pr-new sends every package of 5 MB or less inside that one request, and Cloudflare refuses a
request body over 100 MB with a 413. `main` already put 72 MB there; the EDGE bundles the `edge-release`
plugins ship in `dist/plugin` make it 115 MB. With the patch it is 88 MB. Unchanged on a publish whose
final request already fits.

**Retesting after a pkg-pr-new upgrade.** If the new release still skips every package of one chunk or
less in its multipart loop (`if (file.size <= chunkSize) continue`), the patch is still needed. Otherwise bump
`PKG_PR_NEW_VERSION` and `PKG_PR_NEW_INTEGRITY` in `.github/workflows/scripts/pkg-pr-new-publish.sh`, drop the
`git apply`, and dispatch `pkg-pr-new.yml` on a branch: a publish that succeeds means the patch and this section can go.
