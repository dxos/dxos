# plugin-lingo — Tasks

_Resume: **PR [#12712](https://github.com/dxos/dxos/pull/12712) is OPEN** — the plugin itself is
built, live-verified in Composer (Phase 1.7) and documented (`PLUGIN.mdl`, `TESTING.md`). Phases 0,
1, 1.5, 1.6 and 1.7 are all DONE.

The branch has since grown a **second, larger work-stream that has nothing to do with language
learning**: the progress-meter rebuild and the mail-sync investigation it uncovered (see
"Progress + sync work carried on this branch" below). That is the part still moving; the lingo plugin
itself is waiting on review.

Next, in order: (1) decide whether the progress work ships with #12712 or splits into its own PR — it
is ~36 commits across `react-ui`, `react-ui-components`, `app-toolkit`, `plugin-magazine` and
`plugin-inbox`, and reviewing it alongside a new plugin is a lot to ask of one reviewer; (2) push —
the branch is 36 commits ahead of its remote; (3) `MAIL_REMOTE_SYNC` is a live product decision
awaiting the user (see below)._

Design, object model, and the reasoning behind each decision: `packages/plugins/plugin-lingo/docs/DESIGN.md`.
Manual test plan, and what has actually been run by hand: `packages/plugins/plugin-lingo/docs/TESTING.md`.

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
- [x] `PLUGIN.mdl` — authored from the as-built plugin (2026-08-22), which is what the
      composer-plugins skill requires before a first PR merges.
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

- [x] Default a new feed's type to `rss` in the create form. A form whose ROOT is a discriminated
      union rendered a lone select and nothing else, so the fix is in `react-ui-form`
      (`getDiscriminatorDefaults`, seeded through `useFormHandler`) and applies to every union form;
      the magazine's union now declares `RssCreate` first, which is what makes RSS the default.
- [x] Give the ref-create popover standard padding. Cause was not the popover: a portal escapes the
      DOM but not React context, so a `Form.Viewport` declared inside a `Column` believed it still had
      that host's gutter and placed itself in a content track no ancestor provided. `PopoverPortal`
      now resets `ColumnContext`; `ObjectPicker` adds the top trim a dialog header normally supplies.
      Measured in Chromium: form inset 0px → 10px on all four sides.
- [x] Clear the required-marker asterisk once a field holds a value — a filled-in form read as though
      every required field were still outstanding.
- [x] Add a feed from the magazine toolbar via a dialog over the feed's own schema, and drop the
      auto-open of the settings companion when a magazine has no posts.
- [ ] Replace `FeedDialog` with the generic plugin-space create dialog once that lands. Spun out as a
      background task (`Generalize FeedDialog into plugin-space`): `SpaceOperation.OpenObjectForm`
      taking a schema plus defaults, with a `'live'` mode that adds the object up front and removes it
      on cancel, returning the object. When it merges, the magazine toolbar calls it with
      `defaults: { type: 'rss' }` and `FeedDialog.tsx`, its story, its surface registration and
      `constants.ts` are deleted.
- [x] Make the flat-deck companion open/closed state global (`plugin-deck`). It was keyed per plank,
      so moving between articles lost the pane. `isCompanionOpen` reads the flag deck-wide under
      `flatten` and per plank while the deck slides; which TAB shows still resolves from the plank's
      own companions and the global variant.

## Phase 1.7: Live run against Composer — DONE

Driven through the debug port on 2026-08-22 against a real nippon.com feed. Every item below was
invisible to the type-checker and to storybook; each was found by using the app.

- [x] The feed dialog removed its own subscription the instant it opened. The cleanup hung off
      unmount, and StrictMode's double-invoke fired it — the form held the typed URL while the space
      held no feed at all. Every dismissal route now cancels explicitly; the StrictMode story fails
      with the old code and passes with the new.
- [x] A magazine Post was not readable: `isReadable` recognises Markdown, Text, and types registered
      under `TextContent`, and the magazine registered none. Added the extractor (fetched body over
      the feed's summary, title as a heading) — verified against a live synced Post, which returns
      the Japanese article with its heading.
- [x] That capability activates on `Startup`. Its consumers read the capability set rather than
      declaring it as a requirement, so the maker's default dependency gate would never fire.
- [x] The reader's language selector opened on Arabic for everyone: the option list is sorted for
      reading and the fallback took its first entry. It now reads a new `language` setting.
- [x] `LingoSettings.revealMode` removed — it described the split view that no longer exists, and
      nothing read it.
- [x] The settings select needed a literal union: `Format.OptionsAnnotation` on a string is ignored
      because the form picks its renderer by type before it looks at options.
- [x] The reader toolbar's overflow control rendered the raw key `toolbar-overflow.menu`; the plugin
      never pulled in the `react-ui-menu` translations.

## Open from the live run

- [ ] Offer the Translation companion beside a Post _in the deck_. `isReadable(post)` is now true, so
      `readerCompanion` matches any node whose data is a Post — but the magazine exposes a selected
      post only as its own companion node (`magazinePost`), and nothing was observed rendering a
      companion of a companion. Decide between opening a Post as its own plank and surfacing the
      reader alongside the magazine's post companion.
- [ ] Feed sync is gated on the `magazine.remote-pull` dev flag (`sync-feed.ts`), which returns
      silently when unset — the flag reads as "sync is broken". Surface the gate in the UI (a
      disabled sync action with a tooltip) rather than a no-op.
- [ ] Give the form's select labelled options. The language setting lists bare BCP-47 codes (`ar`,
      `de`, `en`, …) because `Format.Options` is `string | number` with no label channel.
- [ ] A magazine renders no tiles for posts whose refs resolve only asynchronously. Curation adds the
      Post to the space db as a side effect, so its refs resolve synchronously; a hand-built
      `Ref.make(queuePost)` does not, and the Masonry stays empty with no empty-state either.
- [ ] The create-feed dialog shows every field on the schema, including `link` and `iconUrl`, which
      no fetcher populates. Either fill `link` from the RSS channel link in `parseFeed` or drop it.

## From the #12712 review — one deliberate decline

Everything else CodeRabbit raised is fixed (see the PR threads). Two were declined with reasons —
`Segmenter`'s Promise boundary mirrors `Parser` by design, and the `targetLanguage` patch would have
put a tag where a name belongs. This one is confirmed, unfixed, and the biggest open defect here.

- [ ] **Every document creates its own `Language`, and so its own word list.** Confirmed against the
      running app; the safe fix is a re-sequencing, not the fallback lookup the review proposed.

`translated` only holds Languages related to THIS subject, so a second document in a language already
studied takes the create path in `handleRun`; `ensureDeck` then gives it a second `Vocabulary`. Words
are queried by `Filter.type(Word.Word, { language: languageRef })` — by OBJECT, not by code — so the
learner's vocabulary silently fragments one deck per document. Not an edge case: it is the normal path
for document two onward.

The obvious fix is unsafe. Reusing an existing `Language` by `baseCode` alone merges a Japanese and a
Spanish document onto one object, and `handleRun` then overwrites `target.code` with the newly
detected source — corrupting the first document's reading system and its word list. The correct
identity is (source, target), and the source is not known until `TranslatePassage` returns, which is
after the object has to exist to be passed to it.

So this is a re-sequencing — resolve or create the `Language` from the detected `sourceCode` once the
translation is back, adopting an existing (source, target) object where one exists — plus a decision
about what to do with the per-document Languages already in a user's space. Deliberately not attempted
under review: getting it wrong merges decks irreversibly.

## Loose ends from the reader work

- [ ] Decide the fate of `ExtractVocabulary`. Harvesting moved into `AnalyzeText` (the analysis
      already chose the vocab regions and carries gloss/lemma/reading), so nothing calls it. Either
      delete it, or keep it as the standalone "just build me a deck from this document" entry point
      and give it a surface.
- [ ] Clean up the stale objects the ref-comparison bug left in "My Space": five `Analysis` objects
      for one document, two duplicate Japanese `Language` objects, an orphan `companionTo` relation,
      and French/German entries whose `baseCode` was written under the inverted language model.
      A one-shot script over the debug port; it mutates the user's space, so confirm before running.

## Progress + sync work carried on this branch — DONE, unpushed

Not language learning at all. It started as "does magazine curation deserve a progress monitor?" and
turned into a rebuild of the progress readout plus a live investigation of why mail sync never
finishes. Kept here because it is what this branch actually contains; the detail lives in the
packages it touches.

- [x] **One progress readout, two components, one core.** `ProgressBar` + `ProgressMeter`
      consolidated; `Stepper` and `TextCrawl` moved down to `react-ui`; `Status` renamed `Progress`.
      `@dxos/progress` gained `phases`/`phase` and `TaskHandle.phase/total/plan`. The meter reads
      `Progress.TaskProgress` directly — no intermediate mapping, per the user's call — and the
      `app-toolkit` wrapper that once did the mapping is deleted, so its six consumers import from
      `@dxos/react-ui-components` and declare the dependency.
- [x] **The meter no longer flashes.** `delay` (500ms) withholds it until a run is worth reporting;
      `minDuration` (1s) then holds it long enough to read. Every `Panel.Statusbar` call site mounts
      it unconditionally, since a host that unmounts on state loss defeats both bounds.
- [x] **Feed sync and magazine curation report progress**, displayed in `Panel.Statusbar`; the feed
      sync button moved to the toolbar's trailing edge.
- [x] **A total survives a process change.** An EDGE continuation reports under a fresh pid;
      re-registering dropped the entry and the total with it, so a counted run fell back to a sweep
      mid-flight.
- [x] **A run that stops reporting no longer wedges the UI.** Every terminal travels the same lossy
      path as the progress it ends — a killed process runs no finalizer, a defect escapes the error
      channel, a swarm broadcast is fire-and-forget — so the sink gives up after 90s and fails the
      monitor as `Stopped reporting`, claiming only what it knows. Verified firing at exactly 90s
      against the live session. Also un-sticks the Sync button, which `app-graph-builder` disables
      while `status === 'running'`.
- [x] **A phase no longer inherits the previous phase's count.** `total` is an optional schema field,
      so an explicit `undefined` and an absent one are the same bytes on the wire; the phase change is
      the only signal that survives, and the sink now resets on it. Magazine curation showed this as
      `0 / 1` — phase 0's feed count — while phase 1's uncountable agent call was in flight.

Filed against other people's areas rather than fixed here:

- [x] **Surface flash on first navigation** — [#12717](https://github.com/dxos/dxos/issues/12717),
      @wittjosiah. `Surface` fires `SurfacesRequested(role)` on mount to load role-gated modules, so a
      lazy `ReactSurface` loses the slot to an eager one; measured at 1.06s. In
      `app-framework/TASKS.md`.
- [x] **EDGE mail sync never completes** — [#12719](https://github.com/dxos/dxos/issues/12719),
      @wittjosiah. 146 edge runs, 146 `operation.start`, zero `operation.end`, with the sync cursor's
      `lastTick` 23 hours stale across all of them; the same operation in-process succeeds in 41s and
      commits 99 messages. Detail in `plugin-inbox/docs/TASKS.md`.

- [ ] **Decide `MAIL_REMOTE_SYNC`** — put to the user, unanswered. Mail does not sync in the
      background at all until #12719 lands, and the Sync button is not a workaround (`Binding.runSync`
      fires the trigger whenever the connector declares one, so it takes the same dead path). The
      options offered were: flip to `false` for local sync, leave it, or gate it behind a setting.
- [ ] **Decide whether this work ships with #12712 or as its own PR.** ~36 commits over five packages,
      against a PR whose subject is a new plugin.

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
