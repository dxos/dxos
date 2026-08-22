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

## Phase 1.5: Reader corrections — DONE

Found by actually rendering the stories; every one was invisible to the type-checker.

- [x] `ReaderPane` promised markdown decorations but only added the language bundle, so the reader
      showed raw `#` and `**` markup. `decorateMarkdown()` is what hides it; both are needed.
- [x] Dead theme tokens: `text-accent`, `bg-hoverSurface` and `bg-activeSurface` are not utilities
      and silently resolved to nothing. Correct names are `text-accent-text`, `bg-hover-surface`
      and `bg-current-surface`.
- [x] Tokenization was `\p{L}+`, which returns a whole Japanese sentence as one token — no term
      ever matched. Now `Intl.Segmenter`, plus a longest-match over up to 4 adjacent segments so
      ICU-split compounds ("パン屋" → "パン" + "屋") still resolve.
- [x] `original` mode rendered markdown source while `translation` rendered prose, and split's two
      panes disagreed. Mode now controls translation only.
- [x] The articles passed `attendableId` straight through. `Menu.Toolbar` gates itself on
      `useAttention(attendableId)`, so a surface that supplied none left the toolbar permanently
      disabled; all three now fall back to the subject's URI.
- [x] Fixtures are Japanese, which exercises `reading` (furigana) and the segmenter — a
      space-delimited language left both dead.

## Phase 1.6: Structural selection — DONE

- [x] `@dxos/nlp` gains `Segment`/`Segmentation` plus a hierarchical aligner. Children align inside
      their parent's extent, and a segment carries a range in the source AND the translation —
      the paired range is what makes cross-pane selection possible.
- [x] `segmentText` in `@dxos/nlp`: one cheap-model call returns nested regions quoted verbatim;
      offsets are computed deterministically, because a model cannot count characters but can copy
      a phrase exactly. Same split `parseText` already uses for POS.
- [x] `AnalyzeText` operation caching onto an ECHO `Analysis` object, keyed by subject + source
      hash, so reopening a document costs a query rather than a model call.
- [x] `segments` CodeMirror extension replacing `vocabulary`: hover/caret outlines the most
      specific region, click commits it as a selection distinct from the text selection, and the
      committed id drives the popover, the other pane, and the toolbar.
- [x] Deck vocabulary now produces `vocab` segments rather than its own decorations, so the editor
      has one selection mechanism; it stays deterministic and offline.
- [x] Storybook play tests for hover→outline, click→commit, most-specific-wins, and cross-pane
      mirroring. These caught a real bug: `ReaderPane`'s extension memo depended on its callbacks,
      so an inline handler rebuilt the editor on every selection.

## Phase 2: Deeper integration — NOT STARTED

- [ ] Manage the list of languages from plugin settings. `Language.POPULAR` is a hard-coded ten
      offered in the reader's selector; the learner should be able to choose which languages appear,
      add one outside the list, and set the base language per entry (creation currently defaults
      `baseCode` to `Language.DEFAULT_BASE_CODE`).

- [ ] Offer the reader companion beside any article that _has_ a Text document, not only one that
      _is_ one. `isReadable` covers `Markdown.Document`, `Text.Text` and anything registered under
      `AppCapabilities.TextContent`; the general case is an object with a `Ref<Text.Text>` field,
      which would pick up new types without each one registering an extractor.

- [ ] Reuse the analyzer in the email pipeline. `@dxos/nlp` is importable today (as `pipeline-rdf`
      imports `@dxos/ai`); a `@dxos/pipeline-nlp` Stage wrapper is ~30 lines and should be added
      when the email pipeline actually wires it, not before.
- [ ] Escalate the selection to the parent segment (the model already carries `parent`), so a
      learner can widen from a term to its clause to its sentence.

- [ ] Contribute `MarkdownCapabilities.ExtensionProvider` so hover translation works in the markdown
      editor itself, gated on a setting.
- [ ] `LingoSkill` exposing the operations as assistant tools.
- [ ] `Vocabulary`/`Word` cards (`card--content`) for collections and search.
- [x] `ReaderArticle` container storybook (ECHO-backed, seeds the deck and the document).
- [ ] `VocabularyArticle` and `FlashcardsArticle` container storybooks.
- [ ] A storybook pairing the reader with `plugin-magazine`, showing the companion working as a
      translation/helper beside an article the lingo plugin does not own — the case the
      `AppCapabilities.TextContent` indirection exists for. MagazineCurate's story already wires a
      live `AiService` LayerSpec, so it is also the natural place to exercise `TranslatePassage`.

## Cross-plugin follow-ups — SAME BRANCH

Surfaced while using the reader inside Composer; they are defects in other plugins, agreed to land
on this branch rather than fork a second one.

- [ ] Default a new feed's type to `rss` in the create form. The union renders with no selection, so
      a feed created from the navtree has no type until the user opens the properties form. The fix
      is in the shared `react-ui-form` union control (defaulting to the first member), not in
      `plugin-magazine`.
- [ ] Give the ref-create popover standard padding. Selecting an object from a properties-form ref
      field opens a popover whose content sits flush against its edges.
- [ ] Make the flat-deck companion open/closed state global (`plugin-deck`). Today it is per-article,
      so moving between articles loses the companion. Only the open/closed flag is shared — which
      tab is selected still depends on the subject's type.

## Loose ends from the reader work

- [ ] Decide the fate of `ExtractVocabulary`. Harvesting moved into `AnalyzeText` (the analysis
      already chose the vocab regions and carries gloss/lemma/reading), so nothing calls it. Either
      delete it, or keep it as the standalone "just build me a deck from this document" entry point
      and give it a surface.
- [ ] Clean up the stale objects the ref-comparison bug left in "My Space": five `Analysis` objects
      for one document, two duplicate Japanese `Language` objects, an orphan `companionTo` relation,
      and French/German entries whose `baseCode` was written under the inverted language model.
      A one-shot script over the debug port; it mutates the user's space, so confirm before running.

## Phase 3: Study history — NOT STARTED

- [ ] Per-answer review log (charts retention, not just counts).
- [ ] Due-word notifications and a cross-deck daily session.
- [ ] Import/export (Anki `.apkg`, CSV).

## Known weaknesses to revisit

- [ ] Term matching is exact on the (segmented) token; inflected languages miss forms unless the
      extractor filled in `lemma`. Real lemmatization is unscoped.
- [ ] Client-backed container stories do not render in the Claude Code Browser pane — the client
      hangs in `initializeIdentity`. Verify them with Playwright against a real Chromium; a
      reference story from another plugin hangs identically, so this is the pane, not the code.
- [ ] Three behaviours are asserted but never observed: the translate button's spinner clearing on
      completion, a real pointer click landing on the segment rather than the native line selection,
      and furigana actually coming back from the live model for Japanese. All three were reasoned
      about from the code; none was watched end to end in Composer.
- [ ] `ExtractVocabulary` caps how many entries are _written_ (`limit`), not how much text is sent
      to the model — cost is unbounded on a long document.
