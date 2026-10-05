---
name: hosting-artifacts
description: >-
  Put a demo video, screenshot, contact sheet, or log bundle where a reviewer can see it — a PR body,
  issue, or Linear ticket. For images and videos in a PR or issue, prefer `gh --attach` (gh ≥ 2.99),
  which renders them inline (videos as a player); otherwise publish to the shared `agent-artifacts` R2
  bucket and link it. Use INSTEAD of committing a binary to make it visible in a PR. The R2 route works
  in the cloud sandbox: it needs only `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY`, no wrangler and no
  dependencies. For producing the recording in the first place, see `autocue`.
---

# Hosting artifacts

`SendUserFile` reaches the human you are talking to. It does not reach a reviewer reading the PR on
GitHub, and git is the wrong place for a 19 MB `.webm`. For an image or video in a PR or issue, attach
it with `gh --attach` so it renders inline (see "Link it in a PR body"). For everything else — a file
over the attachment limits, a log bundle, a Linear ticket, a session without a usable `gh` — put the file
in a bucket that serves it over plain HTTPS, and link that URL.

Reach for it when:

- a demo video needs to be watchable from the PR ([[autocue]] produces the file; this ships it);
- a still or contact sheet would otherwise be committed and deleted to get a `raw.githubusercontent.com`
  URL — that trick still works and is fine, but this is simpler and leaves no commit;
- a log bundle or profile needs to go to a teammate or a Linear ticket.

Do **not** reach for it for anything a reviewer can read in the diff, and do not use it as a general
file store — see "What must never go in" before your first upload.

## The bucket

|                 |                                                                                          |
| --------------- | ---------------------------------------------------------------------------------------- |
| Bucket          | `agent-artifacts` (Cloudflare R2, WEUR, DXOS account `950816f3f59b079880a1ae33fb0ec320`) |
| Public base URL | `https://pub-39066a86073446d7b77b1c157b660bb5.r2.dev`                                    |
| S3 endpoint     | `https://950816f3f59b079880a1ae33fb0ec320.r2.cloudflarestorage.com`                      |

The public base is R2's **development** URL: world-readable to anyone with the link, rate-limited, no
Cloudflare caching or Access in front of it. Fine for review artifacts, wrong for anything load-bearing
or private. If it ever needs to serve production traffic, attach a custom domain instead of leaning on
this host.

Object key → URL is a plain concatenation: key `demos/2026-08-27-foo/demo.webm` serves at
`<base>/demos/2026-08-27-foo/demo.webm`.

## Credentials

**`R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` are the only credentials to build on.** They are the
pair a cloud-sandbox agent gets, and they are present locally in the repo's gitignored `.env`, so a
script that uses them runs unchanged in both places. Everything else is a local-only convenience.

| Credential                                          | Where it exists                    | Verdict on this bucket                                                   |
| --------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------ |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY`         | cloud sandbox **and** local `.env` | **works** — read, write, list, delete. Measured, not assumed             |
| `CLOUDFLARE_API_TOKEN` (local `.env`)               | local only                         | works, but account-wide R2 admin — more authority than an upload needs   |
| `wrangler` interactive OAuth                        | local only                         | works; useless in the sandbox, where there is no login and no `wrangler` |
| the `[r2]` remote in `~/.config/rclone/rclone.conf` | local only                         | revoked — `401` on every call                                            |

Two traps in that table, both of which cost time before being pinned down:

- **The `.env` comment above the `R2_*` pair calls the token "read-only" and scoped to
  `composer-feedback-logs`. That comment is wrong** — and so is the 1Password item's own name,
  `Composer survey logs R2 read-only token`. The same key writes and deletes in `agent-artifacts`, in
  `composer-feedback-logs`, and in the `composer-assets*` buckets the deploy pipeline writes on every
  deploy (`.github/workflows/scripts/upload-assets.mjs`). Trust a measurement over the name, and treat
  the key as write-capable on every bucket: do not point a `--delete` at a path you have not checked.
  The name is load-bearing in `survey-to-linear.mjs`, so correcting it means updating that script
  first; until then the name stays wrong on purpose. Rotating this token breaks four consumers at
  once, so coordinate it rather than treating it as a per-skill credential.
- **`rclone` reports `403 AccessDenied` with these keys** — from its bucket preflight, not from the
  data operation. `rclone --s3-no-check-bucket …` (or `no_check_bucket = true` in the remote) works
  fine. A `403` from a tool here is far more often a preflight than a permission.

`CLOUDFLARE_API_TOKEN` is account-owned, so `GET /user/tokens/verify` answers `Invalid API Token` for
it. That endpoint only accepts user-owned tokens; it is not evidence of a bad token.

Never echo a key into chat, a log, or a commit — read it, use it, and per `AGENTS.md` prefer a
credential handed over in `.secrets/` over one that lives in `.env` forever.

## Upload

Use the script. It signs with SigV4 from node's `crypto`, so it needs no `wrangler`, no `aws` CLI, and
no dependencies — which is what makes it work in the cloud sandbox:

```bash
set -a && . ./.env && set +a      # local only; the sandbox already has R2_* in the environment
.agents/skills/hosting-artifacts/scripts/upload-artifact.mjs /tmp/demo/demo.webm plugin-foo-toolbar
```

```text
19.2 MB  video/webm  verified
https://pub-39066a86073446d7b77b1c157b660bb5.r2.dev/demos/2026-08-27-plugin-foo-toolbar/demo.webm
```

It picks the content type from the extension, applies the key convention, and **verifies through the
public URL before printing it** — status, content type, byte count, `ETag` against the local md5, and
`Accept-Ranges`. It exits non-zero and prints what disagreed rather than handing you a URL that will
disappoint a reviewer. Other forms:

```bash
upload-artifact.mjs <file> --key demos/2026-08-27-foo/exact-name.webm
upload-artifact.mjs --list demos/
upload-artifact.mjs --delete demos/2026-08-27-foo/demo.webm
```

If you upload by hand instead, locally, `wrangler` is the shortest path — but note the two flags that
are not optional:

```bash
export CLOUDFLARE_ACCOUNT_ID=950816f3f59b079880a1ae33fb0ec320
wrangler r2 object put agent-artifacts/<key> --file=<path> --content-type=<mime> --remote
```

- **`--remote`.** Without it wrangler writes to the local simulated R2 and still prints
  `Upload complete`. Nothing is uploaded and the public URL 404s.
- **`--content-type`.** R2 serves back verbatim what you stored and wrangler infers nothing. Get it
  wrong and the browser downloads the file instead of playing or showing it.
- **`CLOUDFLARE_ACCOUNT_ID`.** The OAuth login has two accounts; without it wrangler waits on a prompt,
  which hangs a non-interactive shell.

### Key convention

```text
demos/<YYYY-MM-DD>-<slug>/<file>          # review artifacts for a PR or a demo
logs/<YYYY-MM-DD>-<slug>/<file>           # bundles handed to a teammate or a ticket
```

Date-first sorts chronologically and makes stale objects obvious; the slug is the branch or feature, not
the PR number, which you do not know until after the PR exists. One directory per artifact set so a
video, its stills, and its contact sheet can be dropped together. Never write to the bucket root, and
never reuse a key for different content — the URL may already be in a PR body someone is reading.

## Verify before you link

An unverified URL in a PR body is worse than no URL. The script does all of this for you and refuses to
print an unverified URL; do it by hand only when you uploaded by hand:

```bash
URL=https://pub-39066a86073446d7b77b1c157b660bb5.r2.dev/<key>
curl -sI "$URL" | egrep -i 'HTTP|content-type|content-length|accept-ranges|etag'
md5 -q <path>                              # must equal the ETag, for a single-part upload
curl -s -r 0-99 "$URL" -o /dev/null -w '%{http_code}\n'   # expect 206
```

- `200` with the **content type you set** — a wrong type is the most common mistake and is invisible
  until someone clicks.
- **ETag == local md5** proves the bytes match. This holds only for a single-part upload; a multipart
  ETag ends in `-<n>` and cannot be compared this way.
- **`206` on a range request** is what lets a browser seek a video. Without it a viewer can only watch
  from the start.

## Link it in a PR body

**The rule: attach with `gh --attach` first; R2 is the fallback.** An attachment is uploaded to
GitHub's own `github.com/user-attachments/assets/<uuid>` store, so an image renders inline and a video
renders as an **inline player** — expanded in the body, not a link a reviewer has to click. An R2 URL
can only ever give a video as a link.

### Preferred: `gh --attach` (gh ≥ 2.99.0)

`--attach` is repeatable and exists on `gh pr create`, `gh pr edit` and `gh pr comment` (and the
`gh issue` equivalents). Reference each file by its local path in the body; gh uploads it and rewrites
that reference in place. An attached file the body never references is appended to the end.

```bash
cat > /tmp/body.md <<'MD'
Some prose about the change.

![Toolbar after the fix](./out/after.png)

./out/demo.webm
MD
gh pr create --title "plugin-foo: fix toolbar" --body-file /tmp/body.md \
  --attach './out/after.png#Toolbar after the fix' --attach ./out/demo.webm
```

- **Images and videos only:** PNG, JPEG, GIF, WebP, SVG, MP4, MOV, WebM. Anything else — a log bundle,
  a profile, an `.html` viewer — still goes to R2.
- **Size limits:** 10 MB per image or GIF; 10 MB per video on a Free plan, 100 MB on a paid one. Over
  the limit, or unsure of the plan, use R2.
- **A video becomes a player only when it stands alone in its own paragraph** — the bare reference on
  its own line, blank lines around it. Inside a sentence or a list item it renders as a link. Give its
  duration in the prose next to it, since the player shows no size.
- **Alt text** goes after a `#` in the `--attach` path (`'./after.png#The fixed toolbar'`); without it
  gh uses the file name. Videos take no alt text.
- **Requirements:** write access to the repo, and a token from `gh auth login` or a classic PAT. Not
  supported on GitHub Enterprise Server.
- **Check before relying on it:** `gh --version` (≥ 2.99.0) and `gh auth status`. The cloud sandbox may
  ship an older `gh` or no working token, and the `mcp__github__*` PR tools have no attach parameter —
  in either case fall back to R2 below rather than upgrading or authenticating mid-task.

Read the body back after the push to confirm the references were rewritten (`gh pr view <n> --json body
-q .body | grep user-attachments`). A surviving `./out/…` path means the attach did not happen.

### Fallback: R2

Use the bucket when `--attach` is unavailable (old `gh`, no usable token, MCP-only session), when a file
is over the size limit or not an image or video, and always for Linear tickets and teammates. There, a
video is a labelled R2 link and a still is an R2 image embed:

```markdown
![Toolbar after the fix](https://pub-…r2.dev/demos/2026-08-27-plugin-foo/after.png)

[Demo — plugin-foo toolbar (0:43, 19 MB webm)](https://pub-…r2.dev/demos/2026-08-27-plugin-foo/demo.webm)
```

Always give a linked video's **duration and size** in the link text. A reviewer deciding whether to
spend 19 MB deserves to know what they are clicking; a bare URL tells them nothing.

### What renders, and why only an attachment plays

GitHub rewrites exactly one host into a `<video>`: `github.com/user-attachments/assets/<uuid>`, and only
when that link stands alone in its own paragraph. `gh --attach` is the only non-browser way to mint one;
the rest of this table was measured by reading `.body_html` back off a real PR:

| in a PR body                                                          | result                                                                                   |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `[x](github.com/user-attachments/assets/<uuid>)` alone in a paragraph | **inline player** — mint the uuid with `gh --attach`                                     |
| the same attachment link inside a sentence or list item               | plain link                                                                               |
| `![x](https://pub-….r2.dev/….png)`                                    | **inline image** — absolute HTTPS keeps the `!`                                          |
| `[x](https://pub-….r2.dev/….webm)`, or the bare URL                   | plain link                                                                               |
| the attachment URL shape with an **invented** uuid                    | plain link — the rewrite resolves a real asset record, so there is no pattern to imitate |
| `github.com/<o>/<r>/releases/download/….webm` (release asset)         | plain link                                                                               |
| `github.com/<o>/<r>/raw/….webm`, `media.githubusercontent.com/….webm` | plain link                                                                               |
| `<video src="…">` authored via `--body-file`                          | **stripped** — GitHub's sanitiser drops it, leaving an empty paragraph                   |
| `![x](relative/path.png)` without `--attach`                          | the `!` is dropped, leaving a link                                                       |

Do not hand-roll the upload: `POST github.com/upload/policies/assets` wants a browser session's CSRF
token and answers `422` to a PAT. Nor the old workarounds — **release assets** are not rewritten, and an
**orphan `media` branch** puts blobs in every full clone of the repo permanently.

Write the body with `--body-file <file>`, never an inline `--body` string: the string form mangles `!`
and escapes tags before GitHub ever sees them.

## What must never go in

The public URL is unauthenticated and, once fetched, may be cached or indexed anywhere. Deleting the
object does not take that back, and a `gh --attach` upload is no different — it outlives an edit that
removes it from the body. Before every upload, by either route, watch the frames you are about to
publish:

- **no credentials on screen** — space invite codes, HALO device keys, recovery phrases, API tokens in a
  devtools panel or a `.env` open in an editor pane;
- **no real user data** — another person's spaces, documents, email, or contacts. Demo from a scratch
  profile with fixture data;
- **no feedback-log or debug bundles containing user content.** Those belong in
  `composer-feedback-logs`, which is private, and are handled by [[user-submissions]];
- **nothing from a `.secrets/` file**, ever, in any form.

If you notice any of these after uploading, delete the object immediately, say so, and treat the
credential as compromised — rotate it rather than assuming nobody fetched it.

## Cleanup

Objects live until deleted; there is no lifecycle rule on this bucket.

```bash
.agents/skills/hosting-artifacts/scripts/upload-artifact.mjs --delete demos/2026-08-27-foo/demo.webm
```

Delete probes and mistakes the moment you are done with them. **Do not** delete an artifact whose URL is
already in a merged PR or an open ticket — the link is the record, and a `404` is worse than a stale
video. Prune those only when the whole directory is obsolete and nobody is reading it.

## Troubleshooting

| Symptom                                                        | Cause                                                                                                                                               |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Upload complete` but the URL `404`s                           | `--remote` missing — it went to the local simulator                                                                                                 |
| `401 Unauthorized` on every S3 call, even a named bucket       | revoked key. The rclone `[r2]` remote is one; use the `R2_*` pair                                                                                   |
| `403 AccessDenied` from `rclone` with the `R2_*` keys          | its bucket preflight, not the data operation. Add `--s3-no-check-bucket`                                                                            |
| `403 AccessDenied` on `ListBuckets` while a named bucket works | the key has no account-level list. Expected and harmless — address buckets by name                                                                  |
| `R2_ACCESS_KEY_ID is not set` in the sandbox                   | the sandbox injects it; locally you must `set -a && . ./.env && set +a` first                                                                       |
| `SignatureDoesNotMatch`                                        | a header was signed that was not sent, or the clock is skewed. Re-run; do not hand-edit the signing code                                            |
| wrangler hangs with no output                                  | two accounts and no `CLOUDFLARE_ACCOUNT_ID` — it is waiting on a prompt                                                                             |
| browser downloads instead of playing                           | wrong or missing `--content-type`. Re-put with the right one                                                                                        |
| video plays but cannot seek                                    | no `Accept-Ranges` — re-check with a range request; a `200` where you expect `206` means the object was served through something that strips ranges |
