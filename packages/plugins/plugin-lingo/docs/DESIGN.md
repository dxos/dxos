# plugin-lingo — Design

Language learning for Composer: vocabulary you own as ECHO objects, a flashcard drill that tracks
scores, AI extraction of vocabulary from any text, and a reading companion that reveals
translations inline over documents and email.

Status: **Phase 1 skeleton.** Every capability listed under [Phase 1](#phase-1--skeleton-this-pr)
is wired and type-checks; the phases after it are not built yet.

---

## 1. Motivation

Learners already keep the material they are learning from inside Composer — articles they saved,
email in a foreign language, meeting transcripts, their own notes. What they lack is somewhere to
put the words they meet and a way to read that material with help.

Two things follow from that:

1. **Vocabulary is data the user owns**, not a hidden list inside a drill app. It lives in ECHO,
   replicates across devices, and is queryable by the assistant like anything else.
2. **The reading view is a companion, never a replacement.** A markdown document keeps the markdown
   editor and an email keeps the inbox reader; the language view opens beside it. This is what lets
   one plugin serve document, email, and transcript without knowing what any of them are.

## 2. Object model

Three ECHO types, all registered in `src/capabilities/schema.ts`.

| Type                    | Typename                         | Role                                                                      |
| ----------------------- | -------------------------------- | ------------------------------------------------------------------------- |
| `Language.Language`     | `org.dxos.type.lingo.language`   | A language the user studies: `code`, `baseCode`, CEFR `level`.            |
| `Vocabulary.Vocabulary` | `org.dxos.type.lingo.vocabulary` | A named deck scoped to one language.                                      |
| `Word.Word`             | `org.dxos.type.lingo.word`       | One entry: term, translation, lemma, reading, part of speech, `progress`. |

```text
Language ──< Vocabulary ──< Word
    ▲                         │
    └─────────────────────────┘   (Word.language, denormalized)
```

Three decisions worth stating, because each has an alternative that looks reasonable:

**Deck membership lives on the word, not on the deck.** `Word.vocabulary` is a ref; `Vocabulary`
holds no `words` array. Appending an extracted word is then a single object write instead of a
read-modify-write on a shared array (which is where concurrent extraction and manual adds would
collide), and every deck view is an ordinary reactive `useQuery`. The cost is that deck order is
not persisted — recovered as an explicit sort control in the vocabulary article, which is what a
learner actually wants anyway (due first, weakest first).

**`Word.language` is denormalized alongside `Word.vocabulary`.** The reader looks terms up across
_every_ deck for the language being read: a word already learned in another deck is still known,
and a reader that only saw the selected deck would underline it as new. One query on `language`
does that; walking every deck for the language would not.

**Both the study language and the base language sit on `Language`.** A Spanish speaker learning
German and an English speaker learning German are different study contexts with different
translations, so they are different objects and can never share a deck by accident.

**Drill state is an embedded struct, not a review log.** `Word.progress` is a Leitner box plus
counters (`reviews`, `correct`, `streak`, `reviewedAt`, `dueAt`). The drill needs one atomic read
per card; a per-answer audit trail is [Phase 3](#phase-3--study-history).

The scheduling rules live in `Word.applyReview` — a correct answer advances one box (intervals
`0, 1, 3, 7, 21` days), a miss drops straight to box 0 rather than stepping down, because a word
the learner cannot recall has to re-earn every interval.

## 3. Surfaces

| Surface             | Role                  | Subject             | Container           |
| ------------------- | --------------------- | ------------------- | ------------------- |
| `vocabularyArticle` | `article`             | `Vocabulary`        | `VocabularyArticle` |
| `flashcardsArticle` | `article` (companion) | `Vocabulary`        | `FlashcardsArticle` |
| `readerArticle`     | `article` (companion) | any readable object | `ReaderArticle`     |

Both companions are contributed as graph nodes in `src/capabilities/app-graph-builder.ts` and bind
to `companionTo`, following the `plugin-review` comments companion.

### 3.1 Vocabulary article — the list

The deck's words with translation and Leitner progress, plus a toolbar toggle for row order
(deck / due first / weakest first). Sorting copies the array; nothing here mutates ECHO.

### 3.2 Flashcards companion — the drill

Due cards first, self-graded (recall is what the schedule measures, not spelling). Each answer is
written straight through `LingoOperation.RecordReview`, so abandoning a session mid-way loses
nothing. The session queue is frozen when the session starts: re-sorting after every answer would
bounce the card just graded to a new position and re-show it immediately. Session score
(`n of m correct`) is transient UI state; the durable score is on each word.

### 3.3 Reader companion — the enhanced language view

The piece that makes the plugin worth using on material the user did not author.

**Getting the text.** `useSourceText` resolves the companion's subject in three steps:

1. `Markdown.Document` → its `content` Text object (and the `Ref<Text>`, which extraction needs).
2. `Text.Text` → itself.
3. anything else → the app-wide `AppCapabilities.TextContent` capability, keyed by typename.

Step 3 is why the same companion works for an email or a transcript without this plugin depending
on `plugin-inbox` or `plugin-transcription`; those plugins opt their types in by contributing a
`TextContent` extractor. Objects reached that way are readable but not harvestable — extraction
takes a `Ref<Text>`, which a capability-extracted string does not have. The toolbar's extract
action is disabled in that case rather than silently doing nothing.

**Revealing vocabulary.** Two extensions, split during Phase 1.6 when the reader moved from
per-token decoration to analyzed structure — `src/extensions/segments.ts` (the analyzed spans, with
`renderTooltip.ts` for the hover card) and `src/extensions/deck-segments.ts` (the `Intl.Segmenter`
word pass that finds deck terms in text the analyzer has not covered). What follows describes the
shared shape of both:

- A `ViewPlugin` that tokenizes the **visible ranges only** and decorates known terms — either an
  underline (`original`) or a widget carrying the translation (`translation`). Visible-range-only
  is not an optimization detail: a long document holds tens of thousands of tokens and the lookup
  runs per token, so a full-document scan would stall the first paint.
- A `hoverTooltip` that resolves the token under the pointer and renders a card with the
  translation, reading and part of speech — or, for a term no deck holds, an "add to deck" action.

The extension takes a plain `lookup: (token: string) => VocabularyEntry | undefined` and a DOM
`render` callback. It never imports ECHO or React: the container builds the lookup from its word
query and rebuilds it when the query changes. The hover card is built with `Domino` rather than a
React portal because CodeMirror owns the tooltip's lifetime — mounting a React root per hover
would leak one root per word passed over.

Tokens are matched with `\p{L}[\p{L}\p{M}’'-]*` so `l'école` and `well-being` resolve as one term,
and normalized (case-fold, NFC, curly→straight apostrophe) on both sides of the lookup.

**Toolbar modes.** The three-way toggle is the toolbar's primary control:

| Mode          | Rendering                                                                    |
| ------------- | ---------------------------------------------------------------------------- |
| `original`    | Source text with markup intact; known terms underlined, translated on hover. |
| `translation` | Markdown rendered; known terms replaced inline by their translation.         |
| `split`       | Both panes side by side.                                                     |

Split is composed at the container, not inside the extension: two `ReaderPane`s over the same
string, one with `translate` set. Keeping the extension single-mode is what makes split cheap and
keeps the extension usable anywhere a single editor is wanted.

The toolbar also carries a deck selector (where new words are filed; its language drives the
lookup) and the extract action.

Everything the reader renders is read-only. The companion never writes to the document it reads.

## 4. Operations

Defined in `src/types/LingoOperation.ts`, handlers in `src/operations/`.

| Operation           | Input                                         | Output                        | Services            |
| ------------------- | --------------------------------------------- | ----------------------------- | ------------------- |
| `TranslatePassage`  | `text`, `language`                            | `text`, `sourceCode`          | Database, AiService |
| `AnalyzeText`       | `subject`, `text`, `language`, `translation?` | `analysis`, `cached`, `added` | Database, AiService |
| `ExtractVocabulary` | `source: Ref<Text>`, `vocabulary`, `limit?`   | `words`, `skipped`            | Database, AiService |
| `AddWord`           | `vocabulary`, term fields                     | `word`, `existing`            | Database            |
| `RecordReview`      | `word`, `correct`                             | `progress`                    | Database            |
| `TranslateTerm`     | `term`, `language`, `context?`                | a candidate entry             | Database, AiService |

**`TranslatePassage`** and **`AnalyzeText`** are the reader's pair, added in Phase 1.5/1.6.
`TranslatePassage` returns the passage in the base language plus the `sourceCode` it detected — the
study language is never given to it. `AnalyzeText` then segments both sides through `@dxos/nlp`,
persists an `Analysis` keyed by source and target hash (so an unchanged document costs no model
call), and harvests the vocab regions into the deck as a side effect — which is why
`ExtractVocabulary` is now largely redundant, and its fate is an open task in `docs/TASKS.md`.

**`ExtractVocabulary`** is the operation the request called for: analyze a Text object, produce
vocabulary, file it. It prompts for a JSON array of candidates (term, lemma, translation, reading,
part of speech, example sentence), validates each against a schema before anything is written, and
deduplicates twice — within the reply (models repeat a term across inflections) and against the
deck. That makes it safe to re-run on a document that has grown since the last pass; `skipped`
reports how much was already known.

**`TranslateTerm`** backs the reader's hover card for unknown words and is deliberately
non-persisting: the learner sees the translation, and only the "add to deck" action writes,
chaining `TranslateTerm` → `AddWord`.

Both AI handlers parse the reply leniently (fenced JSON tolerated) and fail loudly on a malformed
one rather than writing partial garbage into a deck. `TranslateTerm` degrades to echoing the term
so the learner can still file the word by hand.

## 5. Structure

```text
plugin-lingo/
  dx.config.ts             # org.dxos.plugin.lingo, tags: ['labs'], dependsOn plugin-markdown
  docs/DESIGN.md
  src/
    plugin.tsx             # Plugin.define(meta).pipe(...) — the plugin body
    LingoPlugin.ts         # Plugin.lazy wrapper (the entry composer-app imports)
    paths.ts               # Type-section paths for Language and Vocabulary
    translations.ts
    testing.ts             # Fixture deck + passage, shared by stories
    types/                 # Language, Vocabulary, Word, LingoOperation, LingoSettings, …
    capabilities/          # schema, settings, create-object, operation-handler,
                           # react-surface, app-graph-builder
    operations/            # add-word, analyze-text, extract-vocabulary, record-review,
                           # translate-passage, translate-term
    extensions/            # segments, deck-segments, renderTooltip, hide-images
    components/            # WordList, Flashcard, ReaderPane (+ stories)
    containers/            # VocabularyArticle, FlashcardsArticle, ReaderArticle
```

Navtree: `Language` and `Vocabulary` each get a type section under the **content** group, gated on
a non-empty query, with matching `CreateObjectEntry` factories that target the section node rather
than the database subtree.

Settings (`LingoSettings.Settings`): default reader mode, whether to highlight known words, and
whether to offer assistant translation for unknown ones.

## 6. Phasing

### Phase 1 — skeleton (this PR)

- [x] Three ECHO types with a Leitner schedule on `Word`.
- [x] Four operations with handlers.
- [x] Vocabulary article, flashcards companion, reader companion.
- [x] CodeMirror vocabulary extension (highlight, inline translation, hover card).
- [x] Navtree sections, create-object entries, settings, translations.
- [x] Component stories for `WordList`, `Flashcard`, `ReaderPane`; plugin activation test.

### Phase 2 — deeper integration

- Contribute `MarkdownCapabilities.ExtensionProvider` so hover translation is available in the
  markdown editor itself, gated on a setting — the companion stays the default because it is
  read-only and the main editor is not.
- A `LingoSkill` exposing the operations as assistant tools ("add these five words to my German
  deck", "quiz me on the words I missed").
- `Vocabulary` and `Word` cards (`card--content`) so decks render in collections and search.
- Scroll-linking for split mode.

### Phase 3 — study history

- A per-answer review log, so streaks and retention can be charted rather than only counted.
- Due-word notifications and a cross-deck daily session.
- Import/export (Anki `.apkg`, CSV).

## 7. Known limitations

1. **Matching is exact on the token.** A language with heavy inflection will miss forms the deck
   does not literally contain; `lemma` mitigates this only when the extractor filled it in.
   Real lemmatization is out of scope for a first pass.
2. **Split mode does not scroll-link** the two panes.
3. **No container storybooks yet** — the three containers need ECHO and an operation invoker in
   the story harness; the components they render are covered instead.
4. **Extraction quality is model-dependent** and unbounded in cost for a long document; `limit`
   caps how many entries are written, not how much text is sent.
