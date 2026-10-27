# DXOS wiki

The design of DXOS as a wiki: the feature map (`FEATURES.mdl`) is its spine, and every spec in the repository
(`PLUGIN.mdl`, `SPEC.mdl`, and any other `.mdl` a feature cites) is one page, filed under the feature-map area of the
first feature that cites it. Pages link each other wherever one spec names another, the front page embeds the
architecture drawings, and a deck presents the feature map area by area. Nothing here is written by hand: the
`architecture-wiki` routine (`agents/routines/architecture-wiki.md`) regenerates it from the specs.

- Code: `partial.ts` (objects), `wiki.ts` (page, index and deck content), `model.ts` (the `wiki.json` schema),
  `generate.ts` (specs → wiki data, pure), `scripts/generate-wiki.ts` (the CLI that writes `wiki.json`).
- Requires: [Architecture](../CONTENT.md) — `drawings` (`composer` on the front page; `composer`, `echo-model`,
  `composer-plugin`, `composer-framework` under the areas `AREA_DIAGRAMS` names).
- Provides: `index`, `pages.<spec path>`, `deck`
- Clock: unused
- Used by: `ArchitectureSpace.makeTemplate` (`org.dxos.plugin.canvas.template.architecture`)

## Contents

Counts are those of the committed `wiki.json` (generated 2026-10-27: 5 areas, 123 pages — Apps 2, ECHO and HALO 6,
Composer plugins 106, UI 4, SDK and tools 5); a regeneration changes them, and the checks compare against the file.

- 1 `Markdown.Document` **DXOS wiki** (`index`): the feature map's opening paragraph; a paragraph naming the
  generator and routine; the `composer` drawing embedded; then one `## <area>` per area, embedding that area's
  drawing when `AREA_DIAGRAMS` has one, over a table `Page | Status | Summary` with one row per page, the page title
  linked by space-relative URI (`echo:///<id>`), the statuses of the features citing it (`uncited` when none), and the
  spec's first sentence.
- 1 `Markdown.Document` per page (`pages.<path>`), named for the spec's frontmatter `name` (else its `# ` heading,
  else the first citing feature's title):
  - A `Feature | Status` table of the features citing the spec, when any do.
  - `Source:` linking the spec on GitHub (`https://github.com/dxos/dxos/blob/main/<path>`).
  - The spec's prose, reflowed to one line per paragraph and list item; its `# ` title dropped; the `## Extensions`,
    `## Changelog` and `## Appendix…` sections dropped.
  - Each `mdl` fence reduced to one bullet per block, `**<type>** \`<id>\` <title> — <first sentence of desc, note
    or why>`, with each `req`of a`feat` nested under it.
  - Other fences kept verbatim.
  - A backticked path of another paged spec becomes a link to that page.
  - A relative link points at the file on GitHub, and a relative image (a spec's rendered `.dx.svg` diagram) at its
    raw file, so the spec's own illustrator diagrams render on the page.
- 1 `Presentation.Presentation` **DXOS feature map** (`deck`), built by `Presentation.makeFromMarkdown`: a cover
  slide (`layout: cover`) counting specs and areas, then one slide per area with a `Status | Features` tally, most
  common first, and the area's first 8 page titles plus `and N more`.
- 1 `Collection` per area, named for it, holding its pages in feature-map order; uncited specs go to
  `Other specs`, by path.
- 1 `Collection` **Wiki** on the space root: `DXOS wiki`, `DXOS feature map`, then the area collections in
  feature-map order.

## Flows

1. Create a space from **DXOS Architecture** with the presenter, sheet or illustrator plugin off: a toast names the
   plugins it enabled, and every object opens.
2. Open **Wiki** → **DXOS wiki**: the Composer drawing renders, and each area lists its pages.
3. Click a page title in the index: that spec's page opens; a linked spec path in it opens the other page.
4. Open **DXOS feature map** and present it: a cover, then one slide per area.

## Checks

- The Wiki collection's labels are `DXOS wiki`, `DXOS feature map`, then the areas of `wiki.json`, and the area
  collections hold one object per page of `wiki.json` (`ArchitectureSpace.test.ts`).
- A page links another by id for `{{spec:<path>}}`, and leaves a path with no page as code; its features table and
  GitHub source link are present (`partial.test.ts`).
- The index embeds the overview and each mapped area's drawing, and links every page with its status and escaped
  summary (`partial.test.ts`).
- The deck has a cover plus one slide per area (`partial.test.ts`).
- The committed `wiki.json` decodes, has one page per path, and reflowing any page body changes nothing
  (`generate.test.ts`).
- The generator reads areas, statuses and `#item`-stripped spec paths from the feature map, files uncited specs
  last, reports cited specs that do not exist, and drops skipped sections (`generate.test.ts`).
