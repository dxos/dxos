# MDL spec dependencies — Design

Date: 2026-10-27. Decided with user:richburdon in a brainstorming session; items marked _(agent's call)_
were filled in by the agent and are open to change.

## Intent

A spec often builds on other specs. plugin-canvas's `PLUGIN.mdl` is a host between two of them: the
illustrator plugin (`org.dxos.plugin.illustrator`), which it depends on at runtime, and the canvas engine
(`org.dxos.ui.react-ui-canvas`), whose model it uses and should not restate. Today the only way to say so
is prose with inline `github:` keys, which nothing checks and which break when a file moves.

This design makes a spec's dependencies part of the language: declared once, in the body (not the
frontmatter), checked by `deus lint`, and navigable in the spec viewer.

## Goals

1. A **core** `## Dependencies` section any spec can use, listing the specs it builds on.
2. A **plugin-dialect** field on the `plugin` block listing the Composer plugins this plugin depends on.
3. **Fully qualified references** into another spec: `<spec id>#<item>`.
4. `deus lint` rejects a reference to a spec that is not a dependency, or that does not exist.
5. The spec viewer opens a referenced spec, scrolled to the item.

## Non-goals

- Frontmatter. `extends:` stays as it is: language inheritance between dialects, not "builds on".
- Implicit resolution. A bare `[F-9.2]` or `type:View` always means this spec's own item; there is no
  import or search path.
- Versioned dependencies. A dependency names a spec id, not a version.
- Transitive dependencies. Depending on A does not let a spec reference what A depends on.

## Anti-goals

- **A dependency listed twice.** An id in the `plugin` block's `dependsOn` is never repeated under `uses`.
  Tools take the union.
- **A path in a reference.** References name specs by id, because files move and ids do not.

## The model

### Spec ids and the index

Every `.mdl` spec already has a frontmatter `id` (`org.dxos.ui.react-ui-canvas`). A **spec index** maps each
id to its file, built by reading the frontmatter of every tracked `.mdl` file in the checkout, the deus
dialects under `lang/` included (they have ids, e.g. `org.dxos.spec.review`), and excluding `*.review.mdl`
and test fixtures _(agent's call)_. Two files with one id is an index error that lint reports on both;
`plugin-spacetime` has one today (`PLUGIN.mdl` and `docs/PLUGIN.mdl`), which the builder resolves.
_(agent's call: deus owns the index builder; lint builds it from the checkout, and the build emits the same
index for the viewer, so they cannot disagree.)_

### Core: the Dependencies section

A new core block type, `uses`, defined in `packages/reflect/deus/lang/core.mdl` and declared in a spec's
Extensions table like any other. One block per dependency, under a `## Dependencies` section placed after
the opening prose and before `## Extensions`. _(agent's call: section placement; block name `uses`.)_

```mdl
uses org.dxos.ui.react-ui-canvas: The engine — its Ontology, types, operations and features are this canvas's model.
```

- The identifier is the depended-on spec's `id`; the inline prose is one line on what this spec takes from
  it. _(agent's call: the one-line reason is required, so a reader knows why the dependency exists.)_
- Any spec this one builds on or refers to goes under `uses`, plugin specs included, unless it is already a
  runtime dependency in the `plugin` block's `dependsOn` (anti-goal 1).

### Plugin dialect: `dependsOn`

The `plugin` block (`org.dxos.mdl.plugin`, `lang/plugin.mdl`) gains an optional field, named as in
`dx.config.ts` _(agent's call)_:

```mdl
plugin CanvasPlugin: An infinite, zoomable canvas of typed nodes and links at multiple depths.
  id: org.dxos.plugin.canvas
  dependsOn: [org.dxos.plugin.illustrator]
  modules:
    - ...
```

`dependsOn` is exactly the plugin's runtime dependencies, as `dx.config.ts`'s `plugin.dependsOn` declares them
(decided by the user). Each entry is a plugin id, which is also its `PLUGIN.mdl`'s frontmatter id. The dialect's version moves to
1.1 _(agent's call: additive field, minor bump)_.

### The full dependency set

A spec's dependencies are the union of its `uses` blocks and its `plugin` block's `dependsOn`.

### References

A reference into another spec is `<spec id>#<item>`, e.g. `org.dxos.ui.react-ui-canvas#F-9.2`, where the item
is any block id or `req` id of that spec. It may appear in prose and in block field values (as `requires:`
does today).

## deus lint

New diagnostics, in `src/extension/check.ts` so the editor and the CLI share them _(agent's call: source
names)_:

| Source     | Severity | When                                                                                                |
| ---------- | -------- | --------------------------------------------------------------------------------------------------- |
| `mdl/ref`  | error    | A reference names a spec id not in the index, or an item that spec does not declare.                |
| `mdl/ref`  | error    | A reference names a spec outside this spec's full dependency set.                                   |
| `mdl/ref`  | error    | A `github:` key points into a `.mdl` file (code-file keys are unaffected).                          |
| `mdl/uses` | error    | A `uses` or `dependsOn` id is not in the index; a dependency is declared twice; a spec uses itself. |
| `mdl/uses` | error    | An id in `dependsOn` is also listed under `uses`.                                                   |

Lint needs the index; a single-file lint (the editor) loads it once per session. A dependency cycle is
allowed: specs can legitimately describe each other. _(agent's call)_

## Spec review

A review judges a plugin's `dependsOn` against `dx.config.ts`'s `plugin.dependsOn`: a plugin in one and not
the other is `diverged` (decided by the user). A plugin spec with no `plugin` block declares no `dependsOn`, so
the check applies once the block is added. `uses` blocks are not reviewed; they are design relationships, not code.

## Spec viewer (plugin-code)

- **How an id resolves in Composer** (decided by the user): deus generates the spec index (id → repository
  path) at build time and plugin-code bundles it. The viewer looks the id up, forms the `github:` key and opens
  it as it opens keys today (GitHub, or `/__dx/fs` in development). The index covers the dxos repository only;
  another repository (such as edge) gets its own index later, and its specs cannot reference dxos specs until
  then.
- A `<spec id>#<item>` reference, and a `uses` / `dependsOn` id, is a link. Clicking opens that spec in the
  viewer, scrolled to the item (to the top for a bare id). This extends the existing `sourceLinks` editor
  extension and `parseSourceKey` (`sync/spec-key.ts`).
- An unresolvable reference is drawn as a broken link, with the lint message on hover. _(agent's call)_

## Migration (same change)

1. Convert every `github:…/*.mdl#Item` reference in spec bodies to `<id>#<Item>`. Today that is eight in
   plugin-code's `PLUGIN.mdl`; lint finds the rest.
2. Add the `uses` / `dependsOn` declarations each converted reference now requires.
3. plugin-canvas `PLUGIN.mdl`: replace its prose list with `uses org.dxos.ui.react-ui-canvas` and a `plugin`
   block declaring `dependsOn: [org.dxos.plugin.illustrator]`.
4. Each changed spec gets a changelog decision.

Review files (`evidence:`, `tests:`, walkthroughs) keep `github:` keys: they point at code, and at a spec
only as their `spec:` frontmatter, which is out of scope.

## Constraints

- `.mdl` is parsed by the deus CodeMirror extension (`src/extension`); the new block and the reference
  syntax must parse there and keep `deus lint`, `deus review check` and `deus changelog check` green.
- The spec index must work in the cloud sandbox and in CI, so it reads the checkout, not a running app.

### Where references are recognised

In prose and anywhere inside an `mdl` block, `#` comments included. Text inside any other code fence (an
ASCII diagram, an example) is not scanned, so an illustration may show a reference without declaring a
dependency. _(agent's call)_

## Left to the builder

- Where the index lives and how it caches.
- The reference grammar: an id is dotted lowercase segments; an item is any block or `req` id.
- Tests: lint fixtures under `src/cli/__fixtures__`, viewer stories.
