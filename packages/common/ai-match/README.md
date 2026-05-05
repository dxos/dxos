# @dxos/ai-match

Generic AI-powered matching between two sets of objects via Claude.

Given objects of type `S` and objects of type `T`, `aiMatch` asks the model to
find semantic matches between them and returns a list of `(source, target,
confidence, reasoning)` tuples. The caller controls how each object is
summarized for the prompt, so the helper is reusable across any domain
(meetings ↔ tasks, emails ↔ contacts, notes ↔ cards, etc.).

## Example

```ts
import { aiMatch } from '@dxos/ai-match';

const matches = await aiMatch({
  source: notes,
  target: cards,
  summarizeSource: (note) => ({ title: note.title, body: note.body.slice(0, 500) }),
  summarizeTarget: (card) => ({ name: card.name, list: card.listName }),
  sourceId: (note) => note.id,
  targetId: (card) => card.id,
  task: 'Matching meeting notes to Trello cards. A match means the meeting was about the card\'s topic or involved the same people.',
  // apiKey: '...',                                // optional; falls back to localStorage.ANTHROPIC_API_KEY in the browser
  // endpoint: '/api/anthropic/v1/messages',       // default (works with Composer's dev proxy)
  // model: 'claude-sonnet-4-20250514',            // default
});

for (const match of matches) {
  console.log(`${match.source.title} → ${match.target.name} (${match.confidence}): ${match.reasoning}`);
}
```

## Design notes

- **Stable ids** — the LLM round-trips opaque `_id` fields that the helper derives from your `sourceId`/`targetId` accessors, so results are safely rejoined with the original objects. Matches referencing ids the caller does not know are dropped.
- **Code-fence tolerant** — responses wrapped in ` ```json ... ``` ` are stripped before parsing. Malformed JSON logs a warning and returns `[]` rather than throwing.
- **Short-circuits** when either side is empty — no API call is made.
- **No retries, no streaming** — keep callers in charge of that. One request per call.

## When NOT to use

- Exact/keyword matching — use a straight string comparison or index lookup.
- Large (>~500 items per side) — the whole prompt is one request; pre-cluster or pre-filter.
- Structured scoring where you already have a numeric signal (embeddings, cosine similarity) — use that instead.
