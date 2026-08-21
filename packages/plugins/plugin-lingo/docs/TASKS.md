# plugin-lingo — Tasks

_Resume: Phase 0 is complete — build, unit test, storybook test, lint and the full `composer-app`
build all pass locally on `claude/language-learning-plugin-eyedv0`. One real defect surfaced and was
fixed: the activation test never supplied `plugin-markdown`, which `dx.config.ts` declares in
`dependsOn`, so plugin resolution failed outright. Next: `PLUGIN.mdl`, then open a PR or continue
into Phase 2._

Design, object model, and the reasoning behind each decision: `packages/plugins/plugin-lingo/docs/DESIGN.md`.

## Phase 0: Verify the skeleton locally — DONE

All five ran green in the `plugin-lingo` worktree on 2026-08-20.

- [x] `moon run plugin-lingo:build` — passes (152 tasks); declarations and project references are
      genuinely exercised, unlike the sandbox's `customConditions: ["source"]` typecheck.
- [x] `moon run plugin-lingo:test` — passes after adding `MarkdownPlugin.make()` to the harness.
      It failed first with `Plugin dependency resolution failed: missing ["org.dxos.plugin.markdown"]`;
      the test was copied from `plugin-template`, which declares no `dependsOn`.
- [x] `moon run plugin-lingo:test-storybook` — 4 tests across the three component stories.
- [x] `moon run plugin-lingo:lint` — clean; the moon task found nothing the standalone oxlint missed.
- [x] `moon run composer-app:build` — passes with plugin-lingo in the graph (287 tasks).

## Phase 1: Skeleton — DONE

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
