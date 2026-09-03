---
name: user-submissions
description: >-
  Triage a Composer support submission — a Linear issue or PostHog Support ticket
  carrying an R2 debug-log key, escalated from a user report. Use when working a
  DX-#### issue created from a user report, when an issue body names a
  `composer-feedback-logs-*` NDJSON bundle, or when asked to find the root cause
  of a reported bug from its attached logs.
---

# Triaging user submissions

A Composer support submission is a PostHog Support ticket — the anchor its telemetry
(session replay, events, errors, identity) attaches to — plus a public Discord help
thread carrying only the user's text. A team member escalates (`/issue` in the thread
sets the ticket on-hold, and the Edge discord-service files the Linear issue), which
carries the ticket link, the replay link, the version, and the debug-log location.
**The attached debug logs are the report.** The user's prose is often a single word,
sometimes literally `test` — the ticket and its telemetry are the evidence, not the
words.

So never triage from the title. Two rules govern everything below:

1. **Root cause comes from the logs, from evidence.** Not from the user's words,
   not from a plausible-sounding theory about the subsystem named in the title.
2. **If the logs cannot explain the bug, the deliverable is a logging PR** — put
   the missing instrumentation where the blind spot is, so the next report of
   this bug is diagnosable. An unexplained submission is never closed as
   "insufficient information"; that is a bug in our instrumentation.

## 1. Fetch the logs

The issue body names an object path and includes a ready-made `curl`. In the
cloud sandbox the credentials are already in the environment
(`R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY`) — check there before asking the
user for anything:

```bash
env | grep -c R2_ACCESS_KEY_ID   # 1 = already available
```

```bash
curl -sS --aws-sigv4 'aws:amz:auto:s3' \
  --user "$R2_ACCESS_KEY_ID:$R2_SECRET_ACCESS_KEY" \
  "https://950816f3f59b079880a1ae33fb0ec320.r2.cloudflarestorage.com/<path-from-issue>" \
  -o feedback-logs.ndjson
```

Locally, the credential is `op://Shared/Composer survey logs R2 read-only
token` — the access key id is the token's id, the secret is the **sha256 of the
token value** (how Cloudflare authenticates the R2 S3 API with an API token).
Never paste it into chat; see AGENTS.md → "Handing an agent a credential".

Write the bundle to the scratchpad, not the working tree. They run 50 MB+ and
100k+ lines.

## 2. Read the bundle

One JSON object per line, with short keys:

| key | meaning                                             |
| --- | --------------------------------------------------- |
| `t` | ISO timestamp                                       |
| `l` | level — `V`erbose, `D`ebug, `I`nfo, `W`arn, `E`rror |
| `m` | message                                             |
| `f` | source file                                         |
| `n` | line number                                         |
| `o` | owner/instance id (e.g. `dm#4`)                     |
| `i` | context id (e.g. `tab:https://…`)                   |
| `c` | JSON-stringified log context                        |

Use `scripts/query-logs.mjs` for filter/grep work (needs `moon run log:build`):

```bash
node scripts/query-logs.mjs feedback-logs.ndjson -q 'warn' -g 'lifecycle'
```

For triage, start with a level histogram plus the distinct W/E/I messages — that
is usually the whole story in one screen:

```bash
python3 - <<'PY'
import json, collections
levels, seen, sample = collections.Counter(), collections.Counter(), {}
for line in open('feedback-logs.ndjson'):
    try: r = json.loads(line)
    except: continue
    levels[r.get('l')] += 1
    if r.get('l') in ('E', 'W', 'I'):
        seen[(r['l'], r['m'], r.get('f'))] += 1
        sample.setdefault((r['l'], r['m'], r.get('f')), r)
print(levels)
for k, v in seen.most_common():
    print('###', v, k); print('   ', sample[k]['t'], (sample[k].get('c') or '')[:600])
PY
```

Then pull the full timeline around each candidate — `grep` the operation key,
error string, or file across the bundle and read it in timestamp order.

## 3. Establish root cause from evidence

A root cause is a claim the log lines prove. Hold yourself to:

- **Timing is evidence.** A failure at 13s is a real network attempt; the same
  failure at 0ms is a cached rejection, a guard short-circuit, or a synchronous
  throw. That single distinction is often the whole diagnosis.
- **Reconstruct the user's session.** Retries, reloads (a `startup` line), and
  what finally succeeded. "It worked after a reload" localizes the bug to
  in-memory state.
- **Follow the second-order failures.** If the error toast also failed, the user
  saw nothing — that is part of the bug, and often the more serious part.
- **Quote line numbers and timestamps** in the PR body. Anyone should be able to
  re-derive your conclusion from the same bundle.
- **Name the mechanism in the code.** Read the file the log line points at and
  say which statement produces the behaviour. Stop only when you can point at
  it — a subsystem name is not a root cause.

### Traps that have cost real time

- **A clean level histogram means nothing.** A bundle with zero `E` lines and two
  unrelated `W` lines held a fault that had persisted three days. When a report is
  "X is stuck", the signature is not an error — it is a **loop that repeats
  without its payload changing**. Bucket activity per second and look for a
  cadence that never converges; a steady poll returning "0 items" is idle, the
  same non-empty diff every N seconds is stuck.
- **Translate identifiers before concluding "no activity".** Layers name the same
  object differently (ECHO `DocumentId` vs subduction `SedimentreeId`, space id vs
  space key, peer key vs DID). A grep that finds nothing may prove only that you
  searched in the wrong encoding. Derive the other form and re-search before
  writing "the subsystem never touched it".
- **`log` context values are strings.** `c` holds JSON-stringified metadata, so
  `len(record['c']['different'])` measures characters, not array length —
  `"[]"` is 2 and a one-element list is 32. Parse the field before counting.
- **Any single-instance signal needs a control.** Before "this document is stuck
  because it has no X", count X across all comparable objects in the same bundle.
  A signal present in 19 of 404 documents — including ones that synced fine — is a
  lead, not a cause. State the control in the writeup.
- **Correlate service logs on attributes, not body text.** Full-text search for an
  id matches only lines whose message embeds it, silently missing every structured
  line that carries it as an attribute. Filter on the attribute
  (`attribute.ctx.spaceId = '…'`).
- **Check whether the session is still live.** Service-side logs often run past the
  bundle's export timestamp, which tells you whether the fault is ongoing, and
  whether later failures are the same one or a second one layered on top. Compare
  timestamps before merging two symptoms into one story.
- **Suppressed logging is a finding.** If a subsystem deliberately silences its own
  warnings (console flooding is the usual reason), a bundle cannot exonerate it.
  Record at startup that suppression is active and how to lift it, so the next
  bundle says whether it was on.

## 4. Then one of two outcomes

**A. The logs explain it.** Fix the root cause. Keep the diff minimal, add a
regression test that fails without the fix, add a changeset if it is
consumer-relevant, and open the PR with the log excerpt as the evidence section.
Anything the logs revealed but you are not fixing goes in the PR notes or its
own issue — never silently dropped.

**B. The logs do not explain it.** Do not guess, and do not close the issue.
Open a **logging PR** instead, and say in the Linear issue that the next
occurrence will be diagnosable.

Where to add logs — aim at the specific blind spot you just hit, not "more
logging everywhere":

- **An error logged with no usable context.** The commonest blind spot: a
  `log.error('…', { err })` whose serialized context came through empty tells you
  nothing. Log the identifying fields explicitly — code, status, url, type,
  peer key — alongside the error.
- **A silent branch.** An early return, a cache hit, a guard, or a `catch` that
  swallows. Log the decision _and the value it turned on_.
- **A boundary crossed without a trace.** Entry/exit of the operation, request,
  or worker hop where the trail goes cold.
- **State that would falsify or confirm the competing hypotheses.** If two causes
  fit the evidence, log exactly the field that separates them.

Keep it to `log.verbose`/`log.debug` where it would be noisy at `info`, follow
the `logging` and `debugging` skills for level and structured-metadata
conventions, and state in the PR body which unexplained report motivated each
line.

## 5. Close the loop

Comment on the Linear issue with the root cause (or the instrumentation added),
a link to the PR, and — when relevant — the workaround the user can use now
(e.g. "reload the tab"). Keep the debug-log path in the comment so the next
person can re-check the same evidence.

Landing the issue closes the loop for the user automatically: the Edge service
posts the resolution message into both the Discord thread and the ticket, tags
the thread Solved, and resolves the ticket.

## Non-negotiables

- Never conclude from the title, the severity field, or the user's prose alone.
- Never report a cause you cannot point at in both the logs and the code.
- Never close an unexplained submission without landing instrumentation.
- Never echo a credential or the raw log bundle into chat, a commit, or a PR —
  quote only the lines that carry your argument. Feedback logs are user data.
