# plugin-lingo — Tasks

_Resume: Phase 1 skeleton is committed and pushed on `claude/language-learning-plugin-eyedv0`
(head `b8fa67d1`). It type-checks and lints clean, but **the build, unit tests and storybook tests
have never run** — the cloud sandbox that produced it could not run `moon` at all. First action in
a local worktree is to run them._

Design, object model, and the reasoning behind each decision: `packages/plugins/plugin-lingo/docs/DESIGN.md`.

## Phase 0: Verify the skeleton locally — NOT DONE

Nothing here was runnable in the sandbox (moon's ghcr toolchain plugins are policy-blocked), so
every box below is genuinely unverified, not merely unticked.

- [ ] `moon run plugin-lingo:build` — the real build (vite + tsc declarations, project references).
      Typecheck passed only via a throwaway `customConditions: ["source"]` tsconfig, which does not
      emit declarations or exercise references.
- [ ] `moon run plugin-lingo:test` — `src/plugin.test.ts` asserts the schema module activates and
      ReactSurface stays parked; copied from `plugin-template` and never executed.
- [ ] `moon run plugin-lingo:test-storybook` — three component stories (WordList, Flashcard,
      ReaderPane).
- [ ] `moon run plugin-lingo:lint` — `pnpm exec oxlint` was clean, but the moon task may add
      type-aware rules the standalone binary skipped.
- [ ] `moon run composer-app:build` — plugin-lingo is registered in `plugin-defs.tsx`; confirm the
      app still builds with it in the graph.

## Phase 1: Skeleton — DONE (unverified)

- [x] `Language`, `Vocabulary`, `Word` ECHO types; Leitner schedule in `Word.applyReview`.
- [x] Operations `ExtractVocabulary`, `AddWord`, `RecordReview`, `TranslateTerm` with handlers.
- [x] `VocabularyArticle` (list + order toggle), `FlashcardsArticle` (companion drill),
      `ReaderArticle` (companion reader, original/translation/split).
- [x] `src/extensions/vocabulary.ts` — CodeMirror decorations over visible ranges + hover card.
- [x] Navtree type sections, create-object entries, settings, translations.
- [x] Component stories and a plugin activation test.
- [ ] `PLUGIN.mdl` — required before the first PR merges, authored from the as-built plugin
      (see the `composer-plugins` skill § Specification). Deliberately not in the skeleton.

## Phase 2: Deeper integration — NOT STARTED

- [ ] Contribute `MarkdownCapabilities.ExtensionProvider` so hover translation works in the markdown
      editor itself, gated on a setting.
- [ ] `LingoSkill` exposing the operations as assistant tools.
- [ ] `Vocabulary`/`Word` cards (`card--content`) for collections and search.
- [ ] Scroll-link the two panes in split mode.
- [ ] Container storybooks — the three containers need ECHO plus an operation invoker in the story
      harness; only their components are covered today.

## Phase 3: Study history — NOT STARTED

- [ ] Per-answer review log (charts retention, not just counts).
- [ ] Due-word notifications and a cross-deck daily session.
- [ ] Import/export (Anki `.apkg`, CSV).

## Known weaknesses to revisit

- [ ] Term matching is exact on the token; inflected languages miss forms unless the extractor
      filled in `lemma`. Real lemmatization is unscoped.
- [ ] `ExtractVocabulary` caps how many entries are _written_ (`limit`), not how much text is sent
      to the model — cost is unbounded on a long document.
