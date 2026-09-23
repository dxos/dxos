# Walkthrough

A walkthrough is ONE markdown document whose prose, headings and ```diff fences read as a single
narrative — the shape Graphite's pull-request walkthroughs have. `diffBlocks()` renders the fences;
`walkthroughSidebar()` navigates them, on two levels: a row per section, and beneath it one row per
file that section touches, each scrolling to what it names.

## Why this is not `@codemirror/merge`

`@codemirror/merge` is the obvious candidate and neither of its views fits:

| API | Documents | Layout | Shape |
| --- | --- | --- | --- |
| `MergeView` | two | side by side | a component owning two `EditorView`s, never a region of one document |
| `unifiedMergeView` | one | inline | a real extension, but the WHOLE document is one side of one diff |

Neither can express "these ten lines are a diff and the rest is prose". So a chunk is a block widget
rendering plain DOM. CodeMirror supplies the host document and, separately, syntax colour: the
language resolves through `@codemirror/language-data` and `highlightCode` turns the tree into static
spans. The unified-diff parsing is `diff-parser.ts`, not the merge package's differ.

## Visual reference

The design target, as supplied. Keep these when changing `theme.ts`: the layout was built against
them and there is no other record of the intent.

| | Shows |
| --- | --- |
| [Graphite reference 1](https://pub-39066a86073446d7b77b1c157b660bb5.r2.dev/demos/2026-09-14-walkthrough-diff-chunks/graphite-reference-1.png) | The whole shape: outline rail with per-section file names and counts, section heading, a one-line meta row, prose, then a chunk. The chunk header is caret, dimmed directory, bold file name, counts, language, and the line range at the trailing edge. A pure insertion hatches the left column. |
| [Graphite reference 2](https://pub-39066a86073446d7b77b1c157b660bb5.r2.dev/demos/2026-09-14-walkthrough-diff-chunks/graphite-reference-2.png) | The rail collapsed to counts alone with the current section marked, a rendered diagram between two chunks, and the "N lines" expanders above and below a chunk. |

What this extension currently renders, from the `plugins/plugin-github/stories/Walkthrough` story:

| | Story |
| --- | --- |
| [Side by side with the rail](https://pub-39066a86073446d7b77b1c157b660bb5.r2.dev/demos/2026-09-14-walkthrough-diff-chunks/default.png) | `Default` |
| [Unified](https://pub-39066a86073446d7b77b1c157b660bb5.r2.dev/demos/2026-09-14-walkthrough-diff-chunks/inline.png) | `Inline` |
| [Counts-only rail](https://pub-39066a86073446d7b77b1c157b660bb5.r2.dev/demos/2026-09-14-walkthrough-diff-chunks/stats-rail.png) | `StatsRail` |
| [Narrow, auto fallback to unified](https://pub-39066a86073446d7b77b1c157b660bb5.r2.dev/demos/2026-09-14-walkthrough-diff-chunks/narrow.png) | `Chunks` at a 620px viewport |

### Regenerating them

```bash
moon run storybook-react:serve                      # one server, port 9009, shared with the user
# then drive http://localhost:9009/iframe.html?id=<story-id>&viewMode=story with Playwright
```

Story ids are `plugins-plugin-github-stories-walkthrough--{default,inline,stats-rail,chunks}`.
Shoot at `deviceScaleFactor: 2` and wait for `.cm-content`. Publish with the `hosting-artifacts`
skill rather than committing the PNGs, and overwrite the keys above so the links in this file and in
the pull request keep pointing at what the code actually renders.

## Known gaps

- **The expanders are labels, not controls.** The leading "N lines" row states the gap the hunk
  header implies, but clicking it does nothing: the surrounding file is not in the document, so
  there is nothing to expand into. A trailing row is not rendered at all, since its size needs a
  file length a walkthrough does not carry.
- **Chunks are atomic**, as every widget from this registry is: the caret steps over a rendered chunk
  rather than into it. The shared widget decoration field rebuilds on document change and not on
  selection, so giving way to the source while the caret is inside would need its own mechanism.
- **No intra-line highlight** on a replaced pair. `diffHunks` in `../review/diff.ts` already does
  word-level diffing and could supply it.
