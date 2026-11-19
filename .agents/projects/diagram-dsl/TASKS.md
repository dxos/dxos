# Diagram DSL — Tasks

_Resume: mark #14595 ready (`moon run :lint :build :test-types`, `gh pr ready`); it is based on `main` and includes #14583, which was closed on 2026-11-18. Uncommitted: none. Last: the deck left this PR on 2026-11-18; its files are at `ff69e85fdfd` under `packages/plugins/plugin-debug/src/samples/cloudflare` and go to a PR of their own, stacked on this one._

## Phase 1: A drawing as intent

A drawing is written without coordinates (`diagram kind=grid`), read back out of its records, and shown beside the
canvas. Landed on PR #14595, stacked on #14583.

### Tasks

- [x] **Grid kind** — `group`, `node` and `edge` lower to the grid boxes `@dxos/scene` solves.
- [x] **Read back** — `DSL.printIntent` prints a drawing's intent, or the reasons it has none.
- [x] **DSL companion** — the text beside a Canvas drawing, editable, with Rebuild; read-only under a read-only host.
- [x] **Nine slides as intent** — each `.dx` is what its boxes read back as.
- [x] **Fixes** — diagnostics measure a grid's members where the grid puts them; a headless connector stays headless;
      a packing places every member; a dotted connector draws dotted; a card's body and footer sit under its title.

## Phase 2: One source, one home

The nine slides exist in four generations and live in `plugin-canvas/src/experimental`. This phase leaves one source
(`.dx`), moves the deck where a presentation belongs, and finishes the DSL's vocabulary.

### Tasks

- [x] **Presentation story from the nine `.dx` files** — moved out with the deck.
- [x] **Rename the `space-graph` kind to `graph`** — a stored node under the old name reads as `graph` where a stored
      layout is read (`@dxos/scene` D-105); the stored name changes when the element is next written.
- [x] **`.dx` is the only slide source** — delete the deck export (`.diagram`, `.json`), the `SlideSpec` layout
      (`*.spec.ts`, `spec.ts`, `studio.ts`, `studio.test.ts`), the grid boxes (`.grid.diagram`) and their stories.
- [x] **Give the Architecture slide's cards room for a second body line** — 136 tall, 8 apart.
- [x] **Move the Grids story out of `experimental`** into `src/dsl/`, with its source column.
- [x] **The deck as a space template in plugin-debug** — built here, then moved out of this PR (decision 8); `graph`
      stays in plugin-canvas.
- [x] **A node states its own size** — `width=` / `height=`; a diameter in a packed group, kept in the middle of its
      cell on tracks. Stored apart from the frame (`extent` on a node). Groups do not take them yet.
- [x] **`custom <id> kind=<name>` in the box form**, replacing `rect … kind=`, which is now an error.
- [ ] **Land** — #14583 first, then #14595 stacked on it.

### References

- PRs: https://github.com/dxos/dxos/pull/14583 (base), https://github.com/dxos/dxos/pull/14595.
- Specs: `packages/common/diagram/SPEC.mdl`, `packages/common/scene/SPEC.mdl`, `packages/plugins/plugin-canvas/PLUGIN.mdl`.
- Language: `packages/common/diagram/docs/DSL.md`.
