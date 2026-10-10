# Turn review

Every chat turn the code-index agent finishes is reviewed in the background
(`src/workspace/Review.ts`). Turns where the agent struggled are reported, so that misleading
prompts, broken sandbox functions and model failures show up on a dashboard rather than being
remembered from one bad session.

## Pipeline

1. **Hook.** `Agent.turn` closes the turn with `TurnEnded` or `TurnFailed`. It then calls
   `Reviewer.schedule`, which forks the review into the reviewer layer's scope. The user never
   waits on a review. Interrupted turns are not reviewed, because an interruption means the server
   is stopping and says nothing about how the agent did. On shutdown, reviews still running get up to 15 s to finish before
   they are interrupted. This lets a one-shot `chat --prompt` report its turn.
2. **Signals.** `Review.signals` reads the turn off the log:
   - outcome (ended or failed)
   - steps
   - tool calls and how many errored
   - retried unusable replies (`StepRetried`)
   - repeated identical snippets
   - panels displayed

   `Review.suspicious` flags a turn if any of these hold:
   - the turn failed
   - a reply was retried
   - a snippet was repeated
   - three or more tool errors
   - at least half of two or more calls errored

3. **Judge.** Flagged turns are judged, plus 10% of clean ones (`DEFAULT_SAMPLE_RATE`). The judge
   is the small "explorer" model: Haiku when an Anthropic key is set, otherwise the local model. It
   reads a numbered transcript and returns
   `{ trouble, category, severity, summary, evidence }` through `generateObject`. A failed turn
   with no verdict (judge unreachable) still counts as troubled, with category `unknown`.
4. **Upload.** A troubled turn's trajectory is stored as gzipped NDJSON at
   `code-index/trajectories/<YYYY-MM-DD>/<turnId>.ndjson.gz` in `composer-feedback-logs`.
   - The first line is a header: project and turn ids, the turn's `seq` range, provider and model,
     the system prompt, the signals and the verdict.
   - Every log entry up to the turn's end follows, so the conversation that led into the turn
     travels with it.
5. **Events.** Both go to PostHog project 126171 (EU) with `$process_person_profile: false`.
   - `code_index_turn_reviewed` is sent for every reviewed turn: the signals, `judged`, `trouble`
     and `category`. It is the denominator for a trouble rate.
   - `code_index_turn_trouble` adds `severity`, `summary`, `evidence`, `failure`, `r2_bucket`,
     `r2_key` and `r2_url`.

## Configuration

The review is wired in only when all three credentials are present (`Telemetry.config`).

| Variable                                   | Purpose                                                                                      |
| ------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `DX_POSTHOG_API_KEY`                       | PostHog project key.                                                                         |
| `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | R2 S3-API credentials (same pair the `user-submissions` and `hosting-artifacts` skills use). |
| `CODE_INDEX_TELEMETRY=0`                   | Opt out.                                                                                     |
| `CODE_INDEX_TRAJECTORY_BUCKET`             | Override the bucket (default `composer-feedback-logs`).                                      |
| `DX_POSTHOG_INGEST_HOST`                   | Override the ingest host (default `https://eu.i.posthog.com`).                               |

The PostHog `distinct_id` is a hash of `user@host`, so one developer's sessions can be told apart
without naming them.

## Reading a trajectory

The bucket is private. Fetch a trajectory with the same SigV4 `curl` the `user-submissions` skill
uses:

```bash
curl -sS --aws-sigv4 'aws:amz:auto:s3' --user "$R2_ACCESS_KEY_ID:$R2_SECRET_ACCESS_KEY" \
  "https://950816f3f59b079880a1ae33fb0ec320.r2.cloudflarestorage.com/composer-feedback-logs/<r2_key>" \
  | gunzip | jq -c 'select(.kind == "code-index/trajectory") // .event._tag'
```

## Dashboard

[code-index agent turn reviews](https://eu.posthog.com/project/126171/dashboard/1000196) has four
tiles:

- **Troubled turn rate:** `code_index_turn_trouble` / `code_index_turn_reviewed` per day, as a
  percentage.
- **Troubled turns by model:** totals broken down by `model`.
- **Troubled turns by cause:** daily, stacked by `category`.
- **Recent troubled turns** (HogQL):

  ```sql
  SELECT timestamp, properties.severity AS severity, properties.category AS cause,
         properties.summary AS summary, properties.model AS model, properties.steps AS steps,
         properties.tool_errors AS tool_errors, properties.outcome AS outcome,
         properties.r2_key AS trajectory
  FROM events
  WHERE event = 'code_index_turn_trouble' AND timestamp > now() - INTERVAL 30 DAY
  ORDER BY timestamp DESC LIMIT 200
  ```
