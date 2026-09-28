---
branch: claude/gracious-planck-0f6oo8
commit: 119f317bf9acb42b2f764051721e5322028a6139
base: 6409948bb049d0d1149ddb7e5b26fb5f71a7d39a
mode: default
createdAt: 2026-09-21T02:08:46.885Z
isFinalized: true
groups: 21
rules: [declare-optional-services-with-noop-layers, import-as-namespace-is-all-or-nothing, leaf-owns-its-subscription, no-casts, no-compat-shims, no-hand-rolled-lists, no-invented-theme-tokens, no-native-form-controls, no-sleep-in-test, no-styling-wrapper-divs, no-trivial-wrappers-over-official-apis, private-new-packages, subscribe-where-you-read, themed-primitives-take-classNames, toolbars-are-menu-actions, write-through-the-live-object]
reviewId: 119f317b
---

_241 error(s), 154 warning(s)._

# ERROR 119f317b-1 private-new-packages `packages/common/diagram/package.json:1`

This is a newly-added package (`@dxos/diagram`, not present at the base commit `6409948bb049d0d1149ddb7e5b26fb5f71a7d39a`) but its `package.json` lacks `"private": true` — it even declares `"publishConfig": {"access": "public"}`. Per the `private-new-packages` rule, every new package must be marked private until a trusted publisher exists; add `"private": true` to the top-level object.

# ERROR 119f317b-2 no-casts `packages/common/diagram/src/content.ts:58`

`identify: (record: any) => ...` types the callback's only parameter `any`, a widened signature the no-casts rule forbids; give it the concrete record union `ContentMap` actually holds instead of erasing it.

# ERROR 119f317b-3 no-casts `packages/common/diagram/src/content.ts:64`

`translate: (record: any, delta: Scene.Point) => void;` widens `record` to `any`; type it with the real record union so callers keep type safety.

# ERROR 119f317b-4 no-casts `packages/common/diagram/src/content.ts:166`

`isCounted: (record: any) => boolean` widens the predicate's parameter to `any`; use the concrete record type instead.

# ERROR 119f317b-5 no-casts `packages/common/diagram/src/mermaid-engine.test.ts:67`

Non-null assertion `node.origin!.x` silences the possibly-undefined `origin`; fix at the source with a presence check or a helper that throws on a missing origin instead of asserting it away.

# ERROR 119f317b-6 no-casts `packages/common/diagram/src/mermaid-engine.test.ts:68`

Same as line 67: `node.origin!.y` asserts away a possibly-undefined `origin` rather than narrowing it.

# ERROR 119f317b-7 no-casts `packages/common/diagram/src/mermaid-engine.test.ts:72`

`objects.find((entry) => entry.id === id)!` asserts the find result is non-null; use a helper that throws with a useful message on a missing id instead of `!`.

# ERROR 119f317b-8 no-casts `packages/common/diagram/src/mermaid-engine.test.ts:74`

`object.origin!.x` / `object.origin!.y` both assert away a possibly-undefined `origin` on this line.

# ERROR 119f317b-9 no-casts `packages/common/diagram/src/mermaid-engine.test.ts:77`

`objects.find((entry) => entry.id === nodeId)!` asserts a non-null find result; replace with a throwing lookup helper.

# ERROR 119f317b-10 no-casts `packages/common/diagram/src/mermaid-engine.test.ts:81`

`node.origin!.x` asserts away a possibly-undefined `origin`.

# ERROR 119f317b-11 no-casts `packages/common/diagram/src/mermaid-engine.test.ts:82`

`node.origin!.y` asserts away a possibly-undefined `origin`.

# ERROR 119f317b-12 no-casts `packages/common/diagram/src/mermaid-engine.test.ts:83`

`node.origin!.x` asserts away a possibly-undefined `origin`.

# ERROR 119f317b-13 no-casts `packages/common/diagram/src/mermaid-engine.test.ts:84`

`node.origin!.y` asserts away a possibly-undefined `origin`.

# ERROR 119f317b-14 no-casts `packages/common/diagram/src/mermaid-engine.test.ts:116`

`.find(({ id }) => id === 'edges')!.elements` asserts a non-null find result instead of narrowing it via a throwing helper.

# ERROR 119f317b-15 no-casts `packages/common/diagram/src/mermaid-engine.test.ts:159`

Same pattern: `.find(({ id }) => id === 'edges')!.elements` asserts the find result is non-null.

# ERROR 119f317b-16 no-casts `packages/common/diagram/src/mermaid-engine.test.ts:180`

`.find(({ id }) => id === 'edges')!` asserts a non-null find result rather than narrowing it.

# ERROR 119f317b-17 no-casts `packages/common/diagram/src/mermaid-engine.test.ts:182`

`arrows.find((...) => id.startsWith(prefix))!` asserts a non-null find result.

# ERROR 119f317b-18 no-casts `packages/common/diagram/src/mermaid-engine.test.ts:204`

`.find(({ id }) => id === 'edges')!.elements` asserts a non-null find result.

# ERROR 119f317b-19 no-casts `packages/common/diagram/src/mermaid-engine.test.ts:212`

`objects.find((object) => object.id === id)!.origin!.y` stacks two non-null assertions; replace the find with a throwing lookup and type `origin` so it doesn't need asserting.

# ERROR 119f317b-20 no-casts `packages/common/diagram/src/mermaid-engine.test.ts:224`

`object.origin!.x` / `object.origin!.y` both assert away a possibly-undefined `origin` on this line.

# ERROR 119f317b-21 no-casts `packages/common/diagram/src/mermaid.test.ts:64`

`objects.find((object) => object.id === id)!.elements` asserts a non-null find result.

# ERROR 119f317b-22 no-casts `packages/common/diagram/src/mermaid.test.ts:68`

`objects.find((object) => object.id === 'CORE')!.elements[0]` asserts a non-null find result.

# ERROR 119f317b-23 no-casts `packages/common/diagram/src/mermaid.test.ts:75`

`objects.find((object) => object.id === id)!.origin!.y` stacks two non-null assertions on one line.

# ERROR 119f317b-24 no-casts `packages/common/diagram/src/mermaid.test.ts:87`

`.find((object) => object.id === 'edges')!` asserts a non-null find result.

# ERROR 119f317b-25 no-casts `packages/common/diagram/src/mermaid.test.ts:97`

`objects.find((object) => object.id === 'CORE')!` asserts a non-null find result.

# ERROR 119f317b-26 no-casts `packages/common/diagram/src/mermaid.test.ts:101`

`objects.find((object) => object.id === id)!` asserts a non-null find result.

# ERROR 119f317b-27 no-casts `packages/common/diagram/src/mermaid.test.ts:102`

`node.origin!.x` / `core.origin!.x` both assert away a possibly-undefined `origin`.

# ERROR 119f317b-28 no-casts `packages/common/diagram/src/mermaid.test.ts:103`

`node.origin!.y` / `core.origin!.y` both assert away a possibly-undefined `origin`.

# ERROR 119f317b-29 no-casts `packages/common/diagram/src/mermaid.test.ts:104`

`node.origin!.x` / `core.origin!.x` both assert away a possibly-undefined `origin`.

# ERROR 119f317b-30 no-casts `packages/common/diagram/src/mermaid.test.ts:105`

`node.origin!.y` / `core.origin!.y` both assert away a possibly-undefined `origin`.

# ERROR 119f317b-31 no-casts `packages/common/diagram/src/mermaid.test.ts:138`

`objects.find((object) => object.id === id)!.origin!` stacks two non-null assertions in this helper; replace with a throwing lookup and a typed, always-present `origin`.

# ERROR 119f317b-32 no-casts `packages/common/diagram/src/svg-handler.ts:31`

`isSvgRecord = (record: any): record is SvgRecord =>` widens its input parameter to `any`; type it as the base record union (e.g. `ContentRecord`) so the type guard narrows from a real type instead of from `any`.

# ERROR 119f317b-33 no-casts `packages/common/diagram/src/uml-engine.test.ts:24`

`node.origin!.x` asserts away a possibly-undefined `origin`.

# ERROR 119f317b-34 no-casts `packages/common/diagram/src/uml-engine.test.ts:25`

`node.origin!.y` asserts away a possibly-undefined `origin`.

# ERROR 119f317b-35 no-casts `packages/common/diagram/src/uml-engine.test.ts:31`

`node.origin!.x` and `node.origin!.y` both assert away a possibly-undefined `origin` on this line.

# ERROR 119f317b-36 no-casts `packages/common/diagram/src/uml-engine.test.ts:47`

`objects.find((object) => object.id === id)!.origin!.y` stacks two non-null assertions; use a throwing lookup helper and a typed, always-present `origin`.

# ERROR 119f317b-37 no-casts `packages/common/diagram/src/uml-engine.test.ts:58`

`objects.find((object) => object.id === 'Dog')!` asserts a non-null find result.

# ERROR 119f317b-38 no-casts `packages/common/diagram/src/uml-grid.test.ts:45`

`node.origin!.x` asserts away a possibly-undefined `origin`.

# ERROR 119f317b-39 no-casts `packages/common/diagram/src/uml-grid.test.ts:46`

`node.origin!.y` asserts away a possibly-undefined `origin`.

# ERROR 119f317b-40 no-casts `packages/common/diagram/src/uml-grid.test.ts:54`

`.find((object) => object.id === 'edges')!` asserts a non-null find result.

# ERROR 119f317b-41 no-casts `packages/common/diagram/src/uml-grid.test.ts:65`

`element.start!` and `element.end!` both assert away possibly-undefined endpoints on this line.

# ERROR 119f317b-42 no-casts `packages/common/diagram/src/uml-grid.test.ts:77`

`objects.find((object) => object.id === 'edges')!` asserts a non-null find result.

# ERROR 119f317b-43 no-casts `packages/common/diagram/src/uml-grid.test.ts:78`

`objects.find((object) => object.id === 'Animal')!` asserts a non-null find result.

# ERROR 119f317b-44 no-casts `packages/common/diagram/src/uml-grid.test.ts:84`

Closing `)!` of a multi-line `.find(...)` call asserts a non-null result; narrow via a throwing helper instead.

# ERROR 119f317b-45 no-casts `packages/common/diagram/src/uml-grid.test.ts:85`

`inheritance.end!.y` and `animal.origin!.y` both assert away possibly-undefined values on this line.

# ERROR 119f317b-46 no-casts `packages/common/diagram/src/uml-grid.test.ts:94`

`.find((object) => object.id === 'edges')!` asserts a non-null find result.

# ERROR 119f317b-47 no-casts `packages/common/diagram/src/uml-grid.test.ts:97`

Closing `)!` of a multi-line `.find(...)` call asserts a non-null result.

# ERROR 119f317b-48 no-casts `packages/common/diagram/src/uml-grid.test.ts:108`

`.find((object) => object.id === 'edges')!` asserts a non-null find result.

# ERROR 119f317b-49 no-casts `packages/common/diagram/src/uml-grid.test.ts:143`

`objects.find((object) => object.id === 'edges')!` asserts a non-null find result.

# ERROR 119f317b-50 no-casts `packages/common/diagram/src/uml-grid.test.ts:149`

`arrow.start!.x` and `arrow.end!.x` both assert away possibly-undefined endpoints on this line.

# ERROR 119f317b-51 no-casts `packages/common/diagram/src/uml-grid.test.ts:150`

`objects.find((object) => object.id === id)!` asserts a non-null find result.

# ERROR 119f317b-52 no-casts `packages/common/diagram/src/uml-grid.test.ts:151`

`a.origin!.x` and `b.origin!.x` both assert away a possibly-undefined `origin` on this line.

# ERROR 119f317b-53 no-casts `packages/common/diagram/src/uml-grid.test.ts:166`

`objectsOf(compile(source)).find((object) => object.id === 'edges')!` asserts a non-null find result.

# ERROR 119f317b-54 no-casts `packages/common/diagram/src/uml-grid.ts:151`

`lanes.get(lane)!` asserts a map lookup is non-null; in production code this is a real crash risk if the invariant ever slips — check with `.has`/a default, or add a throwing `mustGet` helper.

# ERROR 119f317b-55 no-casts `packages/common/diagram/src/uml-grid.ts:157`

`columns.get(link.peer)!` asserts a map lookup is non-null in production code; narrow it instead of asserting.

# ERROR 119f317b-56 no-casts `packages/common/diagram/src/uml-grid.ts:297`

`columns.get(id)!` asserts a map lookup is non-null in production code.

# ERROR 119f317b-57 no-casts `packages/common/diagram/src/uml-grid.ts:325`

`rects.get(entry.id)!` asserts a map lookup is non-null in production code.

# ERROR 119f317b-58 no-casts `packages/common/diagram/src/uml-grid.ts:377`

`rects.get(relation.from)!` asserts a map lookup is non-null in production code.

# ERROR 119f317b-59 no-casts `packages/common/diagram/src/uml-grid.ts:378`

`rects.get(relation.to)!` asserts a map lookup is non-null in production code.

# ERROR 119f317b-60 no-casts `packages/common/diagram/src/uml-grid.ts:410`

`rects.get(relation.from)!` asserts a map lookup is non-null in production code.

# ERROR 119f317b-61 no-casts `packages/common/diagram/src/uml-grid.ts:411`

`rects.get(relation.to)!` asserts a map lookup is non-null in production code.

# ERROR 119f317b-62 no-casts `packages/common/diagram/src/uml-grid.ts:430`

`rects.get(nodeId)!` asserts a map lookup is non-null in production code.

# ERROR 119f317b-63 no-casts `packages/common/diagram/src/uml-grid.ts:454`

`rects.get(nodeId)!` asserts a map lookup is non-null in production code.

# ERROR 119f317b-64 no-casts `packages/common/diagram/src/uml-grid.ts:465`

`rects.get(relation.from)!` asserts a map lookup is non-null in production code.

# ERROR 119f317b-65 no-casts `packages/common/diagram/src/uml-grid.ts:466`

`rects.get(relation.to)!` asserts a map lookup is non-null in production code.

# ERROR 119f317b-66 no-casts `packages/common/diagram/src/uml-grid.ts:518`

`gutters.get(gutter)!` asserts a map lookup is non-null in production code.

# ERROR 119f317b-67 no-casts `packages/common/diagram/src/uml-grid.ts:521`

`rects.get(relation.from)!` asserts a map lookup is non-null in production code.

# ERROR 119f317b-68 no-casts `packages/common/diagram/src/uml-grid.ts:522`

`rects.get(relation.to)!` asserts a map lookup is non-null in production code.

# ERROR 119f317b-69 no-casts `packages/common/diagram/src/uml-rules.test.ts:51`

`group.rects.get('Node')!` asserts the map lookup is non-null instead of narrowing it.

# ERROR 119f317b-70 no-casts `packages/common/diagram/src/uml-rules.test.ts:52`

`group.rects.get('Container')!` asserts the map lookup is non-null.

# ERROR 119f317b-71 no-casts `packages/common/diagram/src/uml-rules.test.ts:53`

`group.rects.get('Leaf')!` asserts the map lookup is non-null.

# ERROR 119f317b-72 no-casts `packages/common/diagram/src/uml-rules.test.ts:68`

`group.rects.get(id)!.x` asserts the map lookup is non-null.

# ERROR 119f317b-73 no-casts `packages/common/diagram/src/uml-rules.test.ts:100`

`frame.origin!.x` / `frame.origin!.y` both assert away a possibly-undefined `origin` on this line.

# ERROR 119f317b-74 no-casts `packages/common/diagram/src/uml-rules.ts:228`

`groupOf.get(edge.from)!.id` and `groupOf.get(edge.to)!.id` both assert map lookups are non-null in production code.

# ERROR 119f317b-75 no-casts `packages/common/diagram/src/uml-rules.ts:244`

`lanes.get(rank)!` asserts a map lookup is non-null in production code.

# ERROR 119f317b-76 no-casts `packages/common/diagram/src/uml-rules.ts:279`

`origins.get(group.id)!` asserts a map lookup is non-null in production code.

# ERROR 119f317b-77 no-casts `packages/common/diagram/src/uml-search.test.ts:79`

`object.origin!.x` / `object.origin!.y` both assert away a possibly-undefined `origin` on this line.

# ERROR 119f317b-78 no-casts `packages/common/diagram/src/uml-search.test.ts:85`

`groups.find((group) => group.rule === 'chain')!` asserts a non-null find result.

# ERROR 119f317b-79 no-casts `packages/common/diagram/src/uml-search.test.ts:99`

`frame.origin!.x` / `frame.origin!.y` both assert away a possibly-undefined `origin` on this line.

# ERROR 119f317b-80 no-casts `packages/common/diagram/src/uml-search.ts:141`

`groupOf.get(id)!` asserts a map lookup is non-null in production code.

# ERROR 119f317b-81 no-casts `packages/common/diagram/src/uml-search.ts:146`

`group.rects.get(id)!` asserts a map lookup is non-null in production code.

# ERROR 119f317b-82 no-casts `packages/common/diagram/src/uml-search.ts:162`

`groupOf.get(other)!.id` asserts a map lookup is non-null in production code.

# ERROR 119f317b-83 no-casts `packages/common/diagram/src/uml-search.ts:164`

`groupOf.get(other)!` asserts a map lookup is non-null in production code.

# ERROR 119f317b-84 no-casts `packages/common/diagram/src/uml-search.ts:174`

`groups.find((candidate) => !origins.has(candidate.id))!` asserts a non-null find result.

# ERROR 119f317b-85 no-casts `packages/common/diagram/src/uml-search.ts:181`

`absolute(anchorId)!` asserts a non-null result in production code.

# ERROR 119f317b-86 no-casts `packages/common/diagram/src/uml-search.ts:182`

`connection.group.rects.get(connection.node)!` asserts a map lookup is non-null in production code.

# ERROR 119f317b-87 no-casts `packages/common/diagram/src/uml-search.ts:238`

`origins.get(group.id)!` asserts a map lookup is non-null in production code.

# ERROR 119f317b-88 no-casts `packages/common/diagram/src/uml.test.ts:33`

`model.classes.find((entry) => entry.id === 'Animal')!` asserts a non-null find result.

# ERROR 119f317b-89 no-casts `packages/common/diagram/src/uml.test.ts:39`

`model.classes.find((entry) => entry.id === 'Bone')!` asserts a non-null find result.

# ERROR 119f317b-90 no-casts `packages/common/diagram/src/uml.test.ts:76`

`objects.find((object) => object.id === 'Dog')!` asserts a non-null find result.

# ERROR 119f317b-91 no-casts `packages/common/diagram/src/uml.test.ts:88`

`objects.find((object) => object.id === 'Leg')!` asserts a non-null find result.

# ERROR 119f317b-92 no-casts `packages/common/diagram/src/uml.test.ts:92`

`objects.find((object) => object.id === 'Serializable')!` asserts a non-null find result.

# ERROR 119f317b-93 no-casts `packages/common/diagram/src/uml.test.ts:98`

`objects.find((object) => object.id === id)!.origin!.y` stacks two non-null assertions.

# ERROR 119f317b-94 no-casts `packages/common/diagram/src/uml.test.ts:108`

`.find((object) => object.id === 'edges')!` asserts a non-null find result.

# ERROR 119f317b-95 no-casts `packages/common/diagram/src/uml.test.ts:114`

`arrows.find((arrow) => ...)!` asserts a non-null find result.

# ERROR 119f317b-96 no-casts `packages/common/diagram/src/uml.test.ts:116`

`arrows.find((arrow) => arrow.to === 'Serializable/methods')!` asserts a non-null find result.

# ERROR 119f317b-97 no-casts `packages/common/diagram/src/uml.test.ts:118`

`arrows.find((arrow) => arrow.from === 'Owner/title')!` asserts a non-null find result.

# ERROR 119f317b-98 no-casts `packages/common/diagram/src/uml.test.ts:122`

`arrows.find((arrow) => arrow.to === 'Leg/title')!` asserts a non-null find result.

# ERROR 119f317b-99 no-casts `packages/common/diagram/src/uml.test.ts:153`

`objects.find((object) => object.id === id)!.origin!` stacks two non-null assertions in this helper.

# ERROR 119f317b-100 no-casts `packages/common/diagram/src/uml.ts:152`

`RELATIONS.find(([candidate]) => candidate === token)!` asserts a non-null find result in production code.

# ERROR 119f317b-101 no-casts `packages/common/diagram/src/uml.ts:278`

`boxes.get(entry.id)!` asserts a map lookup is non-null in production code.

# ERROR 119f317b-102 no-casts `packages/common/diagram/src/uml.ts:291`

`lanes.get(lane)!` asserts a map lookup is non-null in production code.

# ERROR 119f317b-103 no-casts `packages/common/diagram/src/uml.ts:304`

`boxes.get(id)!` asserts a map lookup is non-null in production code.

# ERROR 119f317b-104 no-casts `packages/common/diagram/src/uml.ts:305`

`boxes.get(peerId)!` asserts a map lookup is non-null in production code.

# ERROR 119f317b-105 no-casts `packages/common/diagram/src/uml.ts:306`

`positions.get(peerId)!.y` asserts a map lookup is non-null in production code.

# ERROR 119f317b-106 no-casts `packages/common/diagram/src/uml.ts:307`

`positions.get(id)!.y` asserts a map lookup is non-null in production code.

# ERROR 119f317b-107 no-casts `packages/common/diagram/src/uml.ts:323`

`boxes.get(entry.id)!` asserts a map lookup is non-null in production code.

# ERROR 119f317b-108 no-casts `packages/common/diagram/src/uml.ts:324`

`positions.get(entry.id)!` asserts a map lookup is non-null in production code.

# ERROR 119f317b-109 no-casts `packages/common/graph/src/GraphBuilder.ts:502`

`forNode!.delete(...)` asserts a possibly-undefined map entry is non-null; check with `.has`/an `if` guard on the same reference instead of asserting.

# ERROR 119f317b-110 no-casts `packages/common/graph/src/GraphBuilder.ts:503`

`forNode!.size === 0` asserts the same possibly-undefined value is non-null; hoist the guard so both uses narrow it.

# WARN 119f317b-111 import-as-namespace-is-all-or-nothing `packages/common/graph/src/Retention.ts:1`

This new module has a PascalCase filename and is re-exported by the package barrel as `export * as Retention from './Retention.ts'` (`packages/common/graph/src/index.ts:12`), and consumers already import it as a whole namespace (`import type * as Retention from '@dxos/graph/Retention'` in `plugin-deck/src/util/workspace-retention.ts`, `import type * as Retention$ from '@dxos/graph/Retention'` in `sdk/app-toolkit/src/app-framework/AppCapabilities.ts`) — matching every sibling module in this directory (`GraphBuilder.ts`, `GraphEdge.ts`, `GraphModel.ts`, `GraphNode.ts`), which all carry the `// @import-as-namespace` directive. `Retention.ts` alone is missing it. Add `// @import-as-namespace` directly under the copyright header to agree with the other three signals.

# ERROR 119f317b-112 no-casts `packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts:1306`

`spec!.kind` asserts `spec` is non-null; narrow it with an explicit check (or type it non-optional where it's assigned) instead of `!`.

# ERROR 119f317b-113 no-casts `packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts:1383`

`_prepareInputData = (...): any =>` widens the method's return type to `any`; give it the concrete input-data type its callers rely on.

# WARN 119f317b-114 import-as-namespace-is-all-or-nothing `packages/core/compute/progress/src/Progress.ts:46:1`

`Progress.ts` carries `// @import-as-namespace`, but `ProgressSnapshot` (line 46) and `ProgressApi` (line 88) are prefixed with the namespace's own name `Progress`. Per the rule, members inside a namespace module must not repeat the namespace prefix — callers already write `Progress.Snapshot`/`Progress.Api` through the namespace. Rename to `Snapshot` and `Api` (and update the in-file `{@link ProgressApi.task}`/`{@link ProgressApi.cancel}` references and all call sites accordingly).

# WARN 119f317b-115 no-sleep-in-test `packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts:171:5`

The test waits `await new Promise((resolve) => setTimeout(resolve, 10))` to let the registry-only update "settle" before asserting `calls` stayed empty, per `no-sleep-in-test`. A fixed real-time wait is slow and flaky for a negative assertion like this; replace it with a deterministic signal — e.g. drive a subsequent observable event (such as `source.changed` firing once, or `expect.poll` on some state the update cycle is known to touch) and assert `calls` is still empty once that fires, instead of guessing a duration.

# ERROR 119f317b-116 no-casts `packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts:233`

`{ id: objectId } as unknown as Entity.Unknown` is the double-cast escape hatch the no-casts rule forbids; build a real `Entity.Unknown` fixture (or a typed test factory) instead of casting a partial object past the checker.

# ERROR 119f317b-117 no-casts `packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts:277`

Same double-cast: `{ id: objectId } as unknown as Entity.Unknown`.

# ERROR 119f317b-118 no-casts `packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts:357`

Same double-cast: `{ id: objectId } as unknown as Entity.Unknown`.

# ERROR 119f317b-119 no-casts `packages/core/echo/echo-client/src/client/index-query-source-provider.ts:302`

`catch (err: any)` widens the caught error to `any`; catch as `unknown` and narrow it (e.g. `err instanceof Error`) before use.

# ERROR 119f317b-120 no-casts `packages/core/echo/echo-client/src/client/index-query-source-provider.ts:351`

Same pattern: `catch (err: any)` widens the caught error to `any`.

# ERROR 119f317b-121 no-casts `packages/core/echo/echo-client/src/client/index-query-source-provider.ts:443`

Same pattern: `catch (err: any)` widens the caught error to `any`.

# ERROR 119f317b-122 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.test.ts:75`

`handles.linkedDocHandles[0]!` asserts a possibly-undefined array element is non-null; check the array length or use a helper that throws with a clear message instead.

# ERROR 119f317b-123 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.test.ts:80`

`textHandle.change((newDocument: any) => {` widens the callback parameter to `any`; the sibling call at line 77 types the same kind of parameter as `DatabaseDirectory` — use the same real type here.

# ERROR 119f317b-124 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.test.ts:85`

`db.getObjectById(object.id)!` asserts a non-null result; narrow with a check or a throwing lookup helper.

# ERROR 119f317b-125 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.test.ts:130`

`newRootDocHandle.url!` asserts the handle's `url` is non-null; narrow it or type the handle so `url` isn't optional at this point.

# ERROR 119f317b-126 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.test.ts:132`

`(retrievedObject as any).title` is a plain `as any` cast to read a property; type `retrievedObject` (or the accessor) so `.title` is reachable without casting.

# ERROR 119f317b-127 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.test.ts:141`

`newRootDocHandle.url!` asserts the handle's `url` is non-null.

# ERROR 119f317b-128 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.test.ts:150`

`newRootDocHandle.change((newDoc: any) => {` widens the callback parameter to `any`; use the real document type.

# ERROR 119f317b-129 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.test.ts:157`

`newRootDocHandle.url!` asserts the handle's `url` is non-null.

# ERROR 119f317b-130 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.test.ts:174`

`newRootDocHandle.change((newDoc: any) => {` widens the callback parameter to `any`.

# ERROR 119f317b-131 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.test.ts:184`

`newRootDocHandle.url!` asserts the handle's `url` is non-null.

# ERROR 119f317b-132 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.test.ts:205`

`newRootDocHandle.change((newDoc: any) => {` widens the callback parameter to `any`.

# ERROR 119f317b-133 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.test.ts:211`

`getObjectDocHandle(...).change((newDoc: any) => {` widens the callback parameter to `any`.

# ERROR 119f317b-134 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.test.ts:216`

`newRootDocHandle.url!` asserts the handle's `url` is non-null.

# ERROR 119f317b-135 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.test.ts:218`

`(db.getObjectById(ids[0]) as any).content` is an `as any` cast to read a property; type the lookup's result instead of casting past it.

# ERROR 119f317b-136 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.test.ts:220`

`const dbObject: any = db.getObjectById(id);` widens the variable to `any`; keep the inferred/return type instead.

# ERROR 119f317b-137 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.test.ts:238`

`newRootDocHandle.change((newDoc: any) => {` widens the callback parameter to `any`.

# ERROR 119f317b-138 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.test.ts:241`

`newRootDocHandle.url!` asserts the handle's `url` is non-null.

# ERROR 119f317b-139 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.test.ts:252`

`newRootDocHandle.change((newDoc: any) => {` widens the callback parameter to `any`.

# ERROR 119f317b-140 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.test.ts:255`

`oldRootDocHandle.change((newDoc: any) => {` widens the callback parameter to `any`.

# ERROR 119f317b-141 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.test.ts:262`

`newRootDocHandle.url!` asserts the handle's `url` is non-null.

# ERROR 119f317b-142 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.test.ts:273`

`Obj.update(rootObject, (rootObject: any) => {` widens the callback parameter to `any`, shadowing the outer typed `rootObject`.

# ERROR 119f317b-143 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.test.ts:275`

`.flatMap((v: any[]) => v)` widens the callback parameter to `any[]`.

# ERROR 119f317b-144 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.test.ts:276`

`.forEach((obj: any) => {` widens the callback parameter to `any`.

# ERROR 119f317b-145 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.test.ts:285`

`newRootDocHandle.change((newDoc: any) => {` widens the callback parameter to `any`.

# ERROR 119f317b-146 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.test.ts:301`

`newRootDocHandle.url!` asserts the handle's `url` is non-null.

# ERROR 119f317b-147 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.test.ts:330`

`db.rootUrl!` asserts `rootUrl` is non-null.

# ERROR 119f317b-148 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.test.ts:341`

`(object as any).title` is a plain `as any` cast to read a property.

# ERROR 119f317b-149 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.test.ts:392`

`handles.linkedDocHandles[0]!.change((newDoc: any) => {` both asserts a non-null array element and widens the callback parameter to `any` — fix both by checking the array and typing the parameter.

# ERROR 119f317b-150 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.test.ts:545`

`const getObjectDocHandle = (obj: any) => getObjectCore(obj).docHandle!;` widens `obj` to `any` and asserts `docHandle` is non-null; type the parameter as the real object type and narrow `docHandle` instead of both escape hatches.

# ERROR 119f317b-151 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.test.ts:567`

`db1.rootUrl!` asserts `rootUrl` is non-null.

# ERROR 119f317b-152 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.test.ts:581`

`const data: any = { ...object };` widens the variable to `any`; keep the spread's inferred type.

# ERROR 119f317b-153 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.test.ts:583`

`docHandle.change((newDoc: any) => {` widens the callback parameter to `any`.

# ERROR 119f317b-154 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.ts:334`

`this._branchStore!.load()` asserts non-null even though the caller already checked `this._branchStore` — the narrowing doesn't cross the method boundary; pass the checked store in, or re-check inside this method instead of asserting.

# ERROR 119f317b-155 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.ts:363`

`this._branchStore!.save(entries)` runs inside a `.then()` closure, so the `if (!this._branchStore) return;` guard above doesn't narrow it for TypeScript; capture the checked value into a local const before the closure instead of asserting.

# ERROR 119f317b-156 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.ts:650`

`let inactivityTimeoutTimer: any | undefined;` widens the variable to `any`; type it as the real timer handle (e.g. `ReturnType<typeof setTimeout> | undefined`).

# ERROR 119f317b-157 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.ts:672`

`this._areDepsSatisfied(this._objects.get(objectToLoad.id)!)` asserts a map lookup is non-null; the preceding `&&` only checks truthiness, not that the value stays the same on a second `.get()` — bind it to a local once and check that instead of asserting.

# ERROR 119f317b-158 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.ts:681`

`this.getObjectCoreById(objectToLoad.id)!` asserts a non-null result; narrow with a check or a throwing lookup instead.

# ERROR 119f317b-159 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.ts:825`

`.map((o) => o!.id)` asserts non-null after a `.filter((o) => o?.isDeleted())` that TypeScript can't use to narrow; give the filter a type predicate (`(o): o is ObjectCore => ...`) so `.map` doesn't need `!`.

# ERROR 119f317b-160 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.ts:858`

`newStruct.system!.type = ...` asserts `system` is non-null without a preceding check; guard it or initialize `system` up front instead of asserting.

# ERROR 119f317b-161 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.ts:1376`

`queue.shift()!` asserts a non-null result from `shift()` on a possibly-empty queue; guard with a length/while check instead of asserting.

# ERROR 119f317b-162 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.ts:1834`

`objectsToRebind.get(spaceRootUrl)!.objectIds.push(...)` asserts a map lookup is non-null; use `??=`/`.has` to establish the entry instead of asserting it exists.

# ERROR 119f317b-163 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.ts:1836`

`linkedObjectIds.get(object.id)!` asserts a map lookup is non-null; narrow it instead of asserting.

# ERROR 119f317b-164 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.ts:2116`

`this._ctx!` asserts a possibly-unset context is non-null; type the field as required once it's guaranteed set at construction, or guard before this call.

# ERROR 119f317b-165 no-casts `packages/core/echo/echo-client/src/core-db/object-core.ts:327`

`A.change(this.doc!, options, changeFn)` asserts `this.doc` is non-null; guard it once and reuse the narrowed local instead of asserting at each call.

# ERROR 119f317b-166 no-casts `packages/core/echo/echo-client/src/core-db/object-core.ts:329`

`A.change(this.doc!, changeFn)` asserts `this.doc` is non-null.

# ERROR 119f317b-167 no-casts `packages/core/echo/echo-client/src/core-db/object-core.ts:352`

`A.changeAt(this.doc!, heads, options, callback)` asserts `this.doc` is non-null.

# ERROR 119f317b-168 no-casts `packages/core/echo/echo-client/src/core-db/object-core.ts:356`

`A.changeAt(this.doc!, heads, callback)` asserts `this.doc` is non-null.

# ERROR 119f317b-169 no-casts `packages/core/echo/echo-client/src/core-db/object-core.ts:421`

`catch (err: any)` widens the caught error to `any`; catch as `unknown` and narrow before use.

# ERROR 119f317b-170 no-casts `packages/core/echo/echo-client/src/core-db/object-core.ts:461`

`const values: any = value.map((val) => this.encode(val));` widens the variable to `any`; keep the mapped array's inferred type.

# ERROR 119f317b-171 no-casts `packages/core/echo/echo-client/src/core-db/object-core.ts:479`

`decode(value: any): DecodedAutomergePrimaryValue` widens the parameter to `any`; type it with the real encoded-value union this method decodes.

# ERROR 119f317b-172 no-casts `packages/core/echo/echo-client/src/core-db/object-core.ts:532`

`private _setRaw(path: Doc.KeyPath, value: any): void` widens `value` to `any`; type it with the real encodable-value union.

# ERROR 119f317b-173 no-casts `packages/core/echo/echo-client/src/core-db/object-core.ts:581`

`const value: any = getDeep(doc, ...);` widens the variable to `any`; keep (or declare) the real decoded-value type.

# ERROR 119f317b-174 no-casts `packages/core/echo/echo-client/src/core-db/object-core.ts:587`

`(this.getRaw(...) as any) ?? EntityKind.Object` is an `as any` cast; type `getRaw`'s return (or this call site) with the real `EntityKind` union instead of casting past it.

# ERROR 119f317b-175 no-casts `packages/core/echo/echo-client/src/core-db/object-core.ts:799`

`this.getDecoded([META_NAMESPACE]) as unknown as EntityMeta` is the double-cast escape hatch; type `getDecoded`'s overload/return for this namespace instead of forcing it through `unknown`.

# ERROR 119f317b-176 no-casts `packages/core/echo/echo-client/src/query/working-set-executor.test.ts:128`

`results!.map((item) => item.objectId)` asserts `results` is non-null; narrow it with a check instead.

# ERROR 119f317b-177 no-casts `packages/core/echo/echo-client/src/query/working-set-executor.test.ts:231`

`results!.map((item) => item.objectId)` asserts `results` is non-null.

# ERROR 119f317b-178 no-casts `packages/core/echo/echo-client/src/query/working-set-executor.test.ts:409`

`firstIndexByAge.get(age)!` asserts a map lookup is non-null; narrow with `.has`/a default instead.

# WARN 119f317b-179 no-invented-theme-tokens `packages/devtools/devtools/src/components/PropertiesTable.tsx:14:9`

`text-mono` is not a Tailwind palette value or a declared `--color-*` token (nor a real Tailwind utility — the font-family class is `font-mono`), so it produces no CSS.

# WARN 119f317b-180 no-invented-theme-tokens `packages/devtools/devtools/src/containers/panels/client/SqliteArticle/SqliteArticle.tsx:622:30`

`text-foreground` is a shadcn/ui-style invented token with no matching `--color-foreground` in `semantic.css`. Use `text-base-fg` or `text-description`.

# WARN 119f317b-181 subscribe-where-you-read `packages/plugins/plugin-assistant/src/capabilities/AssistantSurfaces.tsx:58`

`InvocationsSurface` reads `space?.properties.invocationTraceFeed?.target` directly in render with no `useObject`/`useResolveRef` subscription on `space.properties` or the feed ref, so the panel stays empty forever if the feed ref isn't resolved yet on first render — per `subscribe-where-you-read`, subscribe with `useObject(ref)` (or `useResolveRef`) before reading `.target`. The identical pattern recurs in `plugin-devtools/DevtoolsSurfaces.tsx:68`, `plugin-script/ScriptSurfaces.tsx:93`, and `plugin-space/SpaceSurfaces.tsx:245` (flagged separately below).

# WARN 119f317b-182 toolbars-are-menu-actions `packages/plugins/plugin-assistant/src/containers/AgentArticle/AgentArticle.tsx:52:9`

`Panel.Toolbar` renders a hardcoded `Toolbar.IconButton` ("reset history") in a bare `Toolbar.Root` instead of `MenuBuilder`/`useMenuActions`/`Menu.Root`; `attendableId` is not destructured from `AgentArticleProps` at all.

# ERROR 119f317b-183 no-casts `packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.stories.tsx:161`

`subAgentDelegationFixture as unknown as Trace.Message[]` is the double-cast escape hatch; give the fixture file the real `Trace.Message[]` type (or a typed loader) instead of forcing it through `unknown`.

# WARN 119f317b-184 leaf-owns-its-subscription `packages/plugins/plugin-blogger/src/containers/PublicationArticle/PublicationArticle.tsx:89`

`const loadedAccessTokens = useObjects(accessTokenRefs);` resolves every connection's `accessToken` ref at the list level just to find one matching connection. Per `leaf-owns-its-subscription`, `useObjects` is deprecated for exactly this reason: it subscribes `PublicationArticle` to every access token's mutations, causing a full re-render whenever any of them changes. Drop the eager resolution and either resolve the single candidate lazily (e.g. `connection.accessToken.target` inside the `find`, loaded once via the existing per-connection subscription) or scope with a query instead of walking the ref array.

# WARN 119f317b-185 leaf-owns-its-subscription `packages/plugins/plugin-blogger/src/containers/PublicationArticle/PublicationArticle.tsx:122`

`loadedPosts = useObjects(postRefs ?? [])` (feeding `tileItems` via `.map((ref) => ref.target)` at line 127) is the exact anti-pattern the rule targets: the comment even documents that it "re-renders ... once cold-loaded refs resolve" and on "later mutations", so editing any single post rebuilds `tileItems` and re-renders every `PostTile`/`PostCard`, even though `PostCard` already re-subscribes to its own post. Drop `useObjects`/`.map(ref => ref.target)` at the list level; pass `postRefs` (unresolved) straight through to `PostTile`, and let `PostCard` (or a thin per-ref leaf) own the `useObject` load+subscribe, rendering a fallback while it loads.

# WARN 119f317b-186 leaf-owns-its-subscription `packages/plugins/plugin-board/src/containers/BoardArticle/BoardArticle.tsx:61`

`itemsAtom` loops over `boardItems` and calls `get(Obj.atomReactive(ref))` for every ref inside one combined atom, functionally identical to `useObjects(refs)`: the resulting `items` array is rendered one `BoardComponent.Cell` per item (line 207-217), so any single board item's edit invalidates `itemsAtom` and re-renders every cell. Per the rule, the list should own only the membership subscription (`boardItems`, already tracked via `useObject(board, 'items')`) and each `BoardComponent.Cell`/its `Surface.Surface` child should resolve and subscribe to its own ref.

# WARN 119f317b-187 toolbars-are-menu-actions `packages/plugins/plugin-board/src/containers/BoardArticle/BoardArticle.tsx:175:13`

The article toolbar is a bare `Toolbar.Root` with three hardcoded `Toolbar.IconButton`s (center, zoom, add) — the file even carries its own `TODO(burdon): Migrate to Menu.Root + useMenuActions (threading attendableId)` acknowledging the gap. `attendableId` is used only for `hasAttention`/`disabled`, never threaded through a `Menu.Root` composition, so plugin/graph actions cannot contribute.

# WARN 119f317b-188 subscribe-where-you-read `packages/plugins/plugin-bookmarks/src/components/Summary/Summary.tsx:37`

`const target = source?.target;` inside the `useTextEditor` initializer is read with no subscription on `source` — the sibling implementation this component's own doc comment claims to mirror, `plugin-video/src/components/Summary/Summary.tsx`, subscribes first via `const [resolved] = useObject(source);` specifically so the editor re-initializes once the ref resolves (see its comment at lines 42-44). This file is missing that `useObject(source)` call, so on a cold load the editor never gets content.

# WARN 119f317b-189 no-invented-theme-tokens `packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:83:28`

`bg-call-active` is invented — there is no `--color-call-active` property. Use a declared token such as `bg-accent-bg` or `bg-success-surface` for the active-mic state.

# WARN 119f317b-190 no-invented-theme-tokens `packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:204:52`

Same invented `bg-call-active` used as the fallback `classNames` for the toggle button.

# WARN 119f317b-191 toolbars-are-menu-actions `packages/plugins/plugin-chess-com/src/containers/ChessGameArticle/ChessGameArticle.tsx:56:11`

`Panel.Toolbar` renders a hardcoded `Toolbar.IconButton` ("sync") in a bare `Toolbar.Root` rather than composing actions with `MenuBuilder`/`useMenuActions`/`Menu.Root`. `attendableId` is destructured from props but never passed to the toolbar.

# WARN 119f317b-192 no-invented-theme-tokens `packages/plugins/plugin-chess/src/components/Chessboard/Info.tsx:194:63`

`text-error-500` is invented — the `error` family only has `error-bg/-fg/-surface/-text/-border` roles, not a numbered `-500` shade. Use `text-error-text` (as used for the sibling `text-success-text` on the same line).

# WARN 119f317b-193 toolbars-are-menu-actions `packages/plugins/plugin-chess/src/containers/ChessArticle/ChessArticle.tsx:73:13`

The article toolbar is a bare `Toolbar.Root` with a hardcoded `Toolbar.Button` and `Toolbar.IconButton`, not built via `MenuBuilder`/`useMenuActions`/`Menu.Root`, and `ChessArticleProps` carries no `attendableId` to thread through.

# WARN 119f317b-194 no-invented-theme-tokens `packages/plugins/plugin-code/src/components/BuildOutput/BuildOutput.tsx:64:39`

`text-success` and (column 79 on the same line) `text-error` are both bare and invented — the theme only declares role-suffixed forms (`success-text`, `error-text`, etc.), confirmed by `packages/ui/ui-theme/src/util/valence.ts` and `DESIGN_SYSTEM.md`, which use `text-success-text` / `text-error-text`. Use those.

# WARN 119f317b-195 no-invented-theme-tokens `packages/plugins/plugin-code/src/components/BuildOutput/BuildOutput.tsx:65:37`

Same invented bare `text-error`; use `text-error-text`.

# WARN 119f317b-196 no-invented-theme-tokens `packages/plugins/plugin-code/src/components/BuildOutput/BuildOutput.tsx:88:52`

Both `text-error` and `text-warning` here are bare and invented; use `text-error-text` / `text-warning-text`.

# WARN 119f317b-197 no-invented-theme-tokens `packages/plugins/plugin-code/src/components/BuildOutput/BuildOutput.tsx:127:51`

Same invented bare `text-error`; use `text-error-text`.

# WARN 119f317b-198 declare-optional-services-with-noop-layers `packages/plugins/plugin-connector/src/capabilities/app-graph-builder.ts:76`

`pluginManager` is obtained via `Option.getOrUndefined(yield* Effect.serviceOption(Plugin.Service))`, and the comment justifies it as "so a headless harness that supplies only the capability manager still builds the graph" — exactly the justification the rule rejects. `Plugin.Service` is never declared as a requirement here; per the rule, a host that lacks a real `PluginManager` should satisfy the tag with a documented noop layer, and this module should read it unconditionally (`yield* Plugin.Service`) so an absent manager fails loudly at the point of use (`requestProviders`/`pluginManager.activate(...)`) instead of silently skipping provider activation.

# WARN 119f317b-199 no-invented-theme-tokens `packages/plugins/plugin-connector/src/containers/CustomTokenDialog/CustomTokenDialog.tsx:101:25`

Bare `text-error` is invented (no `--color-error` property); use `text-error-text`.

# WARN 119f317b-200 no-invented-theme-tokens `packages/plugins/plugin-connector/src/containers/CustomTokenDialog/CustomTokenDialog.tsx:133:33`

Same invented bare `text-error`; use `text-error-text`.

# WARN 119f317b-201 no-invented-theme-tokens `packages/plugins/plugin-connector/src/containers/SyncTargetsDialog/SyncTargetsDialog.tsx:151:87`

`text-base-text` is invented — the theme declares `base-fg` (and `base` as a font-size utility), not `base-text`. Use `text-base-fg`.

# WARN 119f317b-202 no-invented-theme-tokens `packages/plugins/plugin-crx/src/containers/CrxSettings/CrxSettings.tsx:82:34`

Bare `text-success` is invented; use `text-success-text`.

# WARN 119f317b-203 no-invented-theme-tokens `packages/plugins/plugin-crx/src/containers/CrxSettings/CrxSettings.tsx:84:36`

Bare `text-error` is invented; use `text-error-text`.

# WARN 119f317b-204 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/containers/Deck/Deck.stories.tsx:154`

`<div className='grid content-start gap-1 p-2' data-testid='story.launcher'>` is a hand-rolled grid box with a literal `gap-1` (not a ramp step). Per `no-styling-wrapper-divs`, use `Grid` (`cols`, `gap='xs'`, `align='start'`) via `asChild` on this element instead of raw `grid`/`gap-<number>` classes.

# WARN 119f317b-205 no-hand-rolled-lists `packages/plugins/plugin-deck/src/containers/Deck/Deck.stories.tsx:155:7`

`TestLauncher` maps `LAUNCHER_MESSAGES` over a hand-rolled `<button>` per row, tracking the current selection itself (`data-selected={selected === message.id}`) and wiring its own `onClick` — exactly the row-selection state `no-hand-rolled-lists` says the primitives must own. Since the comment states this fixture is deliberately reproducing the mailbox message list's shape, it should build that shape from `Listbox` (selectable, single-select) instead of a raw mapped `<button>` stack, so `dx-current`/`dx-selected` and keyboard navigation come from the primitive rather than being reimplemented here.

# WARN 119f317b-206 no-invented-theme-tokens `packages/plugins/plugin-deck/src/containers/Deck/Deck.stories.tsx:158:78`

`hover:bg-hoverSurface` is camelCase and generates no CSS; the declared token is `--color-hover-surface`, i.e. `bg-hover-surface`.

# WARN 119f317b-207 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/containers/Deck/Deck.stories.tsx:187`

`<div className='fixed bottom-2 start-2 z-10 flex gap-2'>` mixes ad-hoc fixed positioning with a hand-rolled flex row and a literal `gap-2`. Use `Flex` (`asChild`, `gap='sm'`) for the row layout so the positioning classes wrap a real layout primitive instead of a raw flex div.

# WARN 119f317b-208 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/containers/Deck/Deck.stories.tsx:337`

`<div className='grid content-start gap-2 p-4' data-testid='story.companion' ...>` is a hand-rolled grid wrapper with a literal `gap-2`. Replace with `Grid` (`asChild`, `gap='sm'`, `align='start'`) per `no-styling-wrapper-divs`.

# ERROR 119f317b-209 no-casts `packages/plugins/plugin-deck/src/testing/story-plugin.tsx:170`

`(data as any)?.subject` is an `as any` cast; type `data` (or narrow it) at the source instead of casting past the checker.

# ERROR 119f317b-210 no-casts `packages/plugins/plugin-deck/src/testing/story-plugin.tsx:171`

`(data as any)?.attendableId as string | undefined` casts through `any` before casting again to `string | undefined`; type `data` properly instead of stacking casts.

# ERROR 119f317b-211 no-casts `packages/plugins/plugin-deck/src/types/DeckSchema.ts:93`

`isLayoutMode = (value: any): value is LayoutMode =>` widens the guard's parameter to `any`; type it as `unknown` (a type guard's normal input) instead of `any`.

# WARN 119f317b-212 declare-optional-services-with-noop-layers `packages/plugins/plugin-deck/src/url/project.ts:104`

`const manager = yield* Effect.serviceOption(Plugin.Service);` reads the plugin manager as an option and, a few lines below, falls back to `Effect.void` when absent (`pullIdle`), silently skipping idle activation instead of declaring `Plugin.Service` as a real requirement. Per the rule, hosts that have no real `PluginManager` (e.g. a headless caller of `project`) should be given a documented noop layer for it rather than this module treating the tag as optional and quietly degrading.

# WARN 119f317b-213 no-sleep-in-test `packages/plugins/plugin-deck/src/util/openable-children.test.ts:24:5`

`setTimeout(() => { AppGraph.addNode(...); AppGraph.addEdge(...); }, 5)` delays adding the child node by a fixed 5ms so it lands after `firstOpenableChild`'s subscription is registered, per `no-sleep-in-test`. This is a wall-clock guess about fiber-startup timing rather than a deterministic wait; prefer a Trigger or an explicit readiness signal (e.g. observe the registry subscription count on `graph.connections('root/w', 'child')` reaching 1) before adding the node, so the ordering the test relies on isn't racing real time.

# WARN 119f317b-214 subscribe-where-you-read `packages/plugins/plugin-devtools/src/capabilities/DevtoolsSurfaces.tsx:68`

`EdgeTracesSurface` reads `space.properties.invocationTraceFeed?.target` directly in render with no subscription on the feed ref, so a cold-loaded feed never appears; use `useObject`/`useResolveRef` on the ref before reading `.target`, per `subscribe-where-you-read`.

# ERROR 119f317b-215 no-casts `packages/plugins/plugin-devtools/src/capabilities/index.ts:40`

`(globalThis as any).composer ??= {};` is an `as any` cast; augment the global type (`declare global { interface Window { composer?: ... } }`) instead of casting at every use site.

# ERROR 119f317b-216 no-casts `packages/plugins/plugin-devtools/src/capabilities/index.ts:43`

`(globalThis as any).composer.changeStorageVersionInMetadata = ...` is another `as any` cast on the same global; fold it into the same global type augmentation as line 40.

# ERROR 119f317b-217 no-casts `packages/plugins/plugin-devtools/src/capabilities/index.ts:46`

`(window as any).dxos.client` is an `as any` cast; augment `Window` with the real `dxos` shape instead of casting.

# WARN 119f317b-218 toolbars-are-menu-actions `packages/plugins/plugin-explorer/src/containers/ExplorerArticle/ExplorerArticle.tsx:90:11`

`ExplorerArticle`'s toolbar renders a hardcoded `Toolbar.ToggleGroup` directly on a bare `Toolbar.Root` rather than via `MenuBuilder`/`useMenuActions`/`Menu.Root`, and although `ExplorerArticleProps` extends `AppSurface.ObjectArticleProps`, `attendableId` is never destructured or passed to the toolbar.

# WARN 119f317b-219 toolbars-are-menu-actions `packages/plugins/plugin-explorer/src/containers/NeighborhoodCompanion/NeighborhoodCompanion.tsx:72:9`

The depth-selector toolbar is a bare `Toolbar.Root` with a hardcoded `Toolbar.ToggleGroup`, not composed via `MenuBuilder`/`useMenuActions`/`Menu.Root`; `NeighborhoodCompanionProps` carries no `attendableId` at all.

# WARN 119f317b-220 no-invented-theme-tokens `packages/plugins/plugin-file/src/components/PdfCanvas/PdfCanvas.tsx:582:22`

`bg-deck` is not declared — only `--color-deck-surface` exists in `semantic.css`. Use `bg-deck-surface`.

# WARN 119f317b-221 subscribe-where-you-read `packages/plugins/plugin-file/src/containers/FileArticle/FileArticle.tsx:31`

`file.name` is read directly off the `ObjectArticleProps` subject in render with no subscription (`useObject`/`useResolveRef`) anywhere in the component, so a rename of the file elsewhere never updates the preview's displayed name — the canonical `subscribe-where-you-read` case for a surface receiving `AppSurface.ObjectArticleProps<T>`.

# WARN 119f317b-222 no-invented-theme-tokens `packages/plugins/plugin-github/src/stories/Generate.stories.tsx:149:37`

Bare `text-error` is invented; use `text-error-text`.

# ERROR 119f317b-223 no-casts `packages/plugins/plugin-graph/src/graph.ts:86`

`(globalThis as any).composer ??= {};` is an `as any` cast; augment the global type instead of casting at every use site.

# ERROR 119f317b-224 no-casts `packages/plugins/plugin-graph/src/graph.ts:87`

`(globalThis as any).composer.graph = graph;` is another `as any` cast on the same global; fold it into a global type augmentation.

# WARN 119f317b-225 no-styling-wrapper-divs `packages/plugins/plugin-illustrator/src/components/Layout.stories.tsx:156`

`<div className='dx-fill grid grid-cols-[minmax(24rem,2fr)_3fr] gap-px bg-separator'>` is a hand-rolled grid box; `gap-px` is a Tailwind literal, never a ramp step. Use `Grid` with `cols={['minmax(24rem,2fr)', '3fr']}` and a ramp `gap`.

# WARN 119f317b-226 no-styling-wrapper-divs `packages/plugins/plugin-illustrator/src/components/Layout.stories.tsx:158`

`<div className='grid grid-rows-[auto_1fr_auto_1fr] min-h-0 gap-px bg-separator'>` is a hand-rolled grid box with a literal `gap-px`. Use `Grid` (`rows`, `gap`) per `no-styling-wrapper-divs`.

# WARN 119f317b-227 no-styling-wrapper-divs `packages/plugins/plugin-illustrator/src/components/Layout.stories.tsx:170`

`<div className='grid grid-rows-[auto_1fr_auto] min-h-0 gap-px bg-separator'>` is a hand-rolled grid box with a literal `gap-px`. Use `Grid` (`rows`, `gap`) instead.

# WARN 119f317b-228 no-styling-wrapper-divs `packages/plugins/plugin-illustrator/src/components/SceneSvg.stories.tsx:152`

`<div className='dx-fill grid grid-rows-[1fr_auto]'>` is a hand-rolled grid wrapper. Use `Grid` (`rows=['1fr','auto']`, `asChild`) per `no-styling-wrapper-divs`.

# ERROR 119f317b-229 no-casts `packages/plugins/plugin-inbox/src/capabilities/app-graph-builder.ts:241`

`{ name, filter }: { name: string; filter: any }` widens `filter` to `any`; give it the real filter type `mailboxSnapshot.filters` already carries.

# ERROR 119f317b-230 no-casts `packages/plugins/plugin-inbox/src/capabilities/app-graph-builder.ts:272`

`mailbox.filters.findIndex((f: any) => f.name === name)` widens the predicate's parameter to `any`; `mailbox.filters` is already typed elsewhere, reuse that element type here.

# WARN 119f317b-231 no-invented-theme-tokens `packages/plugins/plugin-inbox/src/components/Attachment/Attachment.tsx:79:52`

`bg-baseSurface` is camelCase and not a generated Tailwind class at all — the theme declares `--color-base-surface`, which yields `bg-base-surface`. As written this produces no CSS and renders wrong in exactly one theme.

# WARN 119f317b-232 subscribe-where-you-read `packages/plugins/plugin-inbox/src/components/ConversationStack/ConversationStack.tsx:666`

In `useSystemTag`, `const tagIndex = mailbox?.tags?.target;` reads the mailbox's tag-index ref directly with no subscription, so the star toggle can wedge on a cold load. The same file fixes the identical ref correctly elsewhere — `const tagIndex = useResolveRef(mailbox?.tags);` at line 928 — and that pattern should be used here too, per `subscribe-where-you-read`.

# WARN 119f317b-233 subscribe-where-you-read `packages/plugins/plugin-inbox/src/containers/CalendarArticle/CalendarArticle.tsx:58`

`const feed = calendar.feed?.target;` is read directly in render — the file's own `// TODO(wittjosiah): Should be \`const feed = useObjectValue(calendar.feed)\`` at line 46 documents that the current whole-object `useObject(subject)` does not make this nested ref's resolution reactive. Per `subscribe-where-you-read`, subscribe to `calendar.feed` itself (`useObject`/`useResolveRef`) before reading `.target`.

# WARN 119f317b-234 subscribe-where-you-read `packages/plugins/plugin-inbox/src/containers/CalendarArticle/CalendarArticle.tsx:76`

`const tagIndex = calendar.tags?.target;` has the same missing-subscription defect as line 58: no `useObject`/`useResolveRef` is established on the `calendar.tags` ref, so on a cold load `tagIndex` stays `undefined` and the star markers never appear until an unrelated re-render happens to occur.

# WARN 119f317b-235 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/containers/CalendarArticle/CalendarArticle.tsx:208`

`<div className='grid grid-cols-1 @2xl:grid-cols-[min-content_1fr] h-full'>` is a hand-rolled grid wrapper around the calendar/event panels. Use `Grid` (`cols`, responsive variant) instead of a raw `grid`/`grid-cols-*` div.

# WARN 119f317b-236 subscribe-where-you-read `packages/plugins/plugin-inbox/src/containers/EventArticle/EventArticle.tsx:53`

`const tagIndex = eventCalendar?.tags?.target;` reads the calendar's tag-index ref directly with no subscription (no `useObject`/`useResolveRef` on `eventCalendar` or `eventCalendar.tags`), driving the `starredAtom` used to render the star toggle. On a cold load this stays `undefined` and the star never resolves; compare the fixed pattern for the same ref at `ConversationStack.tsx:928` (`useResolveRef(mailbox?.tags)`).

# WARN 119f317b-237 toolbars-are-menu-actions `packages/plugins/plugin-inbox/src/containers/SubscriptionsArticle/SubscriptionsArticle.tsx:164:9`

The toolbar is a bare `Toolbar.Root` with a hardcoded `Toolbar.IconButton` ("remove") rather than actions built with `MenuBuilder`/`useMenuActions` and rendered via `Menu.Root`. `attendableId` is not destructured from `SubscriptionsArticleProps` at all.

# WARN 119f317b-238 subscribe-where-you-read `packages/plugins/plugin-kanban/src/components/KanbanBoard/KanbanBoard.tsx:64`

`KanbanBoardRoot` reads `kanban.spec.view.target` directly in render with no subscription of its own on `kanban.spec.view` — it relies entirely on the caller (`KanbanArticle`) happening to call `useObject` on the same ref. As a shared, reusable component this is fragile: any other caller that passes `kanban` without also subscribing the view ref leaves `pivotFieldId`/`columnFieldPath` permanently based on a stale (often `undefined`) view. Subscribe locally with `useObject(kanban.spec.kind === 'view' ? kanban.spec.view : undefined)` before reading `.target`.

# WARN 119f317b-239 toolbars-are-menu-actions `packages/plugins/plugin-library/src/containers/BookArticle/BookArticle.tsx:32:9`

`BookArticle`'s `Panel.Toolbar` is a bare `Toolbar.Root` with hardcoded paging `Toolbar.IconButton`s and a `Toolbar.ToggleGroup`, not built via `MenuBuilder`/`useMenuActions`/`Menu.Root`. `attendableId` is not even destructured from `BookArticleProps`, so it cannot be threaded to the toolbar at all.

# WARN 119f317b-240 no-invented-theme-tokens `packages/plugins/plugin-library/src/containers/BookArticle/BookInfo.tsx:146:79`

`bg-input` is exactly the invented token called out by the rule — `semantic.css` declares `input-bg`, `input-bg-hover`, `input-fg` and `input-surface`, never bare `input`. Use `bg-input-surface`.

# WARN 119f317b-241 toolbars-are-menu-actions `packages/plugins/plugin-magazine/src/containers/SubscriptionsArticle/SubscriptionsArticle.tsx:89:9`

`Panel.Toolbar` renders a single hardcoded `Toolbar.IconButton` in a bare `Toolbar.Root` instead of composing it through `MenuBuilder`/`useMenuActions`/`Menu.Root`. `attendableId` is destructured and used elsewhere in the component but is never passed to the toolbar.

# WARN 119f317b-242 no-invented-theme-tokens `packages/plugins/plugin-magazine/src/stories/ArticleExtractor.stories.tsx:124:43`

Bare `text-error` is invented; use `text-error-text`.

# ERROR 119f317b-243 no-casts `packages/plugins/plugin-map/src/capabilities/app-graph-builder.ts:32`

`(node.properties as any).presentation` is an `as any` cast; type `node.properties` (or add a typed accessor for `presentation`) instead of casting past it.

# WARN 119f317b-244 subscribe-where-you-read `packages/plugins/plugin-map/src/containers/MapViewEditor/MapViewEditor.tsx:26`

`const view = object?.view?.target;` is read directly in render with no `useObject`/`useResolveRef` subscription anywhere in the component, so `typeUri`/`currentSchema` (and therefore the rendered form) never update once the view ref resolves after a cold load.

# ERROR 119f317b-245 no-casts `packages/plugins/plugin-markdown/src/components/MarkdownEditor/MarkdownEditorContent.tsx:188`

`(window as any).composer` is an `as any` cast; augment `Window` with the real `composer` shape instead of casting at each use site.

# WARN 119f317b-246 no-styling-wrapper-divs `packages/plugins/plugin-markdown/src/components/PreviewComponent/PreviewComponent.tsx:359`

`<div className='absolute bottom-1 right-1 flex items-center justify-end gap-1'>` is a hand-rolled flex row (icon + label chip) with a literal `gap-1`. Wrap the icon/label row in `Flex` (`asChild`, `align='center'`, `justify='end'`, `gap='xs'`) so only the absolute placement is ad hoc, not the internal layout.

# WARN 119f317b-247 no-styling-wrapper-divs `packages/plugins/plugin-markdown/src/components/PreviewComponent/PreviewComponent.tsx:366`

`<div className='absolute top-1 right-1 flex items-center justify-end gap-1'>` is the same hand-rolled flex pattern as line 359 (open button row) with a literal `gap-1`. Use `Flex` (`asChild`) for the internal row.

# ERROR 119f317b-248 no-casts `packages/plugins/plugin-markdown/src/containers/MarkdownArticle/MarkdownArticle.stories.tsx:46`

`const generator: ValueGenerator = random as any;` is an `as any` cast bridging `random` into `ValueGenerator`; type/adapt `random` to satisfy `ValueGenerator` directly instead of casting past the mismatch.

# WARN 119f317b-249 subscribe-where-you-read `packages/plugins/plugin-meeting/src/containers/MeetingArticle/MeetingArticle.tsx:44`

`meeting.notes?.target`, `meeting.transcript?.target` and `meeting.summary?.target` (lines 44-46) are all read directly in render with no subscription on `meeting` or on any of the three refs. `hasSummary` (derived from `summary`) gates whether the summary tab's `articleData` is produced at all, so on a cold load the summary tab silently stays empty and never recovers. Subscribe with `useObject(meeting)` (or per-field `useResolveRef`) before reading `.target`.

# ERROR 119f317b-250 no-casts `packages/plugins/plugin-mermaid/src/extensions/mermaid-extension.ts:222`

`div.innerHTML = svg!;` asserts `svg` is non-null; narrow it with a check (and handle the empty-render case) instead of asserting.

# ERROR 119f317b-251 no-casts `packages/plugins/plugin-mermaid/src/extensions/mermaid-extension.ts:247`

`catch (err: any)` widens the caught error to `any`; catch as `unknown` and narrow before use.

# WARN 119f317b-252 toolbars-are-menu-actions `packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineComponent.tsx:113:5`

`PipelineToolbar` (used as `PipelineArticle`'s main `Panel.Toolbar`) renders a single hardcoded `Toolbar.IconButton` off a `Toolbar.Root` instead of `MenuBuilder`/`useMenuActions`/`Menu.Root`, and takes no `attendableId`, so plugin/graph actions cannot compose into the pipeline's toolbar.

# WARN 119f317b-253 subscribe-where-you-read `packages/plugins/plugin-presenter/src/containers/CollectionArticle/CollectionArticle.tsx:28`

`collection.objects.length` and `collection.objects[slide]` are read directly in render (lines 28-29, 34) with no subscription on `collection`, so the page count/pager and the rendered slide never update when `collection.objects` is mutated (e.g. a slide added/removed) while this article is mounted.

# WARN 119f317b-254 subscribe-where-you-read `packages/plugins/plugin-presenter/src/containers/DocumentArticle/DocumentArticle.tsx:23`

`const content = document.content.target?.content;` is read directly in render with no subscription on `document` or `document.content`. The comment directly above it ("wait for the markdown ref to resolve so the presentation isn't initialized empty") states the intended behavior but no `useObject`/`useResolveRef` implements it, so on a cold load the presentation is left permanently blank.

# WARN 119f317b-255 subscribe-where-you-read `packages/plugins/plugin-presenter/src/containers/SlideArticle/SlideArticle.tsx:15`

`const content = document.content.target?.content;` is read directly in render with no subscription on `document` or `document.content`, gating the whole component's output (`if (!content) return null;`) — the same defect as `DocumentArticle.tsx:23` in the same plugin.

# WARN 119f317b-256 no-styling-wrapper-divs `packages/plugins/plugin-progress/src/components/ProgressStatusIndicator.tsx:43`

`<div className='flex flex-col gap-1 w-[18rem] p-1 overflow-hidden'>` is a hand-rolled flex column with a literal `gap-1`. Replace with `Flex` (`column`, `gap='xs'`, `asChild`) per `no-styling-wrapper-divs`.

# WARN 119f317b-257 no-hand-rolled-lists `packages/plugins/plugin-progress/src/components/ProgressStatusIndicator.tsx:44:15`

The active-providers popover maps `active` over `<ProgressMeter>` inside a plain `<div className='flex flex-col gap-1 ...'>`, i.e. a hand-rolled flat list of rows with no list primitive backing it. Per the rule, even a non-selectable flat display list should be built on `Listbox` (omitting `value`/`onValueChange` for a plain `role=list`) so the row rhythm and semantics come from the shared primitive instead of an ad hoc flex column.

# WARN 119f317b-258 no-invented-theme-tokens `packages/plugins/plugin-qa/src/components/RunResults/RunResults.tsx:112:23`

`text-redText` should be `text-red-text` (`--color-red-text` is declared); the camelCase form generates no CSS.

# WARN 119f317b-259 no-invented-theme-tokens `packages/plugins/plugin-qa/src/components/StatusBadge/StatusBadge.tsx:13:61`

`text-greenText` is camelCase and generates no CSS; the declared token is `--color-green-text`, i.e. `text-green-text`.

# WARN 119f317b-260 no-invented-theme-tokens `packages/plugins/plugin-qa/src/components/StatusBadge/StatusBadge.tsx:14:57`

Same problem: `text-redText` should be `text-red-text` (`--color-red-text` is declared).

# WARN 119f317b-261 no-invented-theme-tokens `packages/plugins/plugin-qa/src/components/StatusBadge/StatusBadge.tsx:15:58`

Same problem: `text-orangeText` should be `text-orange-text` (`--color-orange-text` is declared).

# WARN 119f317b-262 no-invented-theme-tokens `packages/plugins/plugin-qa/src/components/StatusBadge/StatusBadge.tsx:17:57`

Same problem: `text-blueText` should be `text-blue-text` (`--color-blue-text` is declared). All four status colors in this file's `presentation` map use the invented camelCase form and render as unstyled text in both themes.

# WARN 119f317b-263 no-invented-theme-tokens `packages/plugins/plugin-qa/src/containers/TestPlanArticle/TestPlanArticle.tsx:98:25`

Same invented `text-redText`; use `text-red-text`.

# WARN 119f317b-264 no-native-form-controls `packages/plugins/plugin-qa/src/containers/TestPlanArticle/TestPlanArticle.tsx:106:13`

A bare `<input className='dx-input' ... />` collects the new test case's key and feeds it straight into `QaOperation.SetCase`, bypassing both the theme (styled only via the `dx-input` class, not a themed primitive) and any schema validation. Per `no-native-form-controls`, this field should be rendered through `Form`/`Field.Input` (or another themed `Input.*`-style primitive) rather than a raw `<input>`.

# WARN 119f317b-265 no-native-form-controls `packages/plugins/plugin-qa/src/containers/TestPlanArticle/TestPlanArticle.tsx:113:13`

Same issue as the case-key field immediately above: the "Title" `<input className='dx-input' .../>` is a native element wired directly to component state instead of a themed `Field.Input`/`Form` control, violating `no-native-form-controls`.

# WARN 119f317b-266 leaf-owns-its-subscription `packages/plugins/plugin-review/src/components/CommentThread/CommentThread.tsx:89`

`loadedMessages = (messages ?? []).map((ref) => ref.target).filter(...)` resolves the whole `messages` ref array at the list level and passes the already-resolved `message` into `<MessageComponent.Tile key={message.id} message={message} />` (line 222-224). This is the literal case the rule calls out ("Flag a `.target` ... call inside a list's `map()`"): `CommentThread` now subscribes to every message, so one message's edit re-renders every tile, and a cold-loaded ref can drop a message on first render. Pass the unresolved `Ref` to `MessageComponent.Tile` and have the tile call its own `useObject`/`ref.load()` to render a fallback until it resolves.

# WARN 119f317b-267 no-trivial-wrappers-over-official-apis `packages/plugins/plugin-review/src/stories/DocumentVersioning.stories.tsx:68`

`const concat = (...lines: string[]) => lines.join('\n');` is a module-local helper whose body is one expression wrapping a single call to `Array.prototype.join`, with no computation beyond passthrough. Per `no-trivial-wrappers-over-official-apis`, this renames `join` rather than removing duplication; the six call sites (e.g. lines 118, 135, 155, 415, 918-919) should call `lines.join('\n')` directly, keeping the fixture-building API visible at each use.

# ERROR 119f317b-268 no-casts `packages/plugins/plugin-review/src/stories/DocumentVersioning.stories.tsx:302`

`currentDoc!.content.load()` asserts `currentDoc` is non-null; narrow it with a check instead of asserting.

# ERROR 119f317b-269 no-casts `packages/plugins/plugin-review/src/stories/DocumentVersioning.stories.tsx:303`

`seedComments(defaultSpace, currentDoc!, text, ...)` asserts the same `currentDoc` is non-null again; hoist a single narrowed local instead of repeating `!`.

# WARN 119f317b-270 subscribe-where-you-read `packages/plugins/plugin-routine/src/components/TemplateEditor/TemplateEditor.tsx:40`

`const target = source?.target;` inside the `useTextEditor` initializer (and in the hook's dependency array at line 65, `[themeMode, source?.target, lineNumbers]`) is read with no subscription on `source`. Compare `plugin-video/src/components/Summary/Summary.tsx`, which calls `useObject(source)` before doing the same `.target` read specifically so the editor initializes once the ref resolves; without it, `TemplateEditor` can render with empty content on a cold load and never recover.

# WARN 119f317b-271 subscribe-where-you-read `packages/plugins/plugin-script/src/capabilities/ScriptSurfaces.tsx:93`

`ScriptLogsSurface` reads `space?.properties.invocationTraceFeed?.target` directly in render with no subscription on the feed ref; the same fix as `AssistantSurfaces.tsx:58` applies — subscribe with `useObject`/`useResolveRef` before reading `.target`.

# WARN 119f317b-272 subscribe-where-you-read `packages/plugins/plugin-script/src/components/NotebookStack/NotebookCell.tsx:50`

`cell.source?.target`, `cell.graph?.target` (line 55) and `cell.prompt?.target` (line 133) are all read directly in render, gating each case branch's output, with no `useObject`/`useResolveRef` subscription anywhere in the component. On a cold load any of these three refs can still be resolving, in which case the cell permanently renders `null` for that case instead of recovering once the ref loads.

# WARN 119f317b-273 toolbars-are-menu-actions `packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:186:11`

The "compute" action is a hardcoded `Toolbar.IconButton` sitting next to a `Menu.Root`-based insert control, rather than being folded into the same `MenuBuilder`/`useMenuActions` composition. `attendableId` is obtained via `useAttention` but never passed to the toolbar for graph/plugin-action composition.

# WARN 119f317b-274 subscribe-where-you-read `packages/plugins/plugin-script/src/containers/ScriptArticle/ScriptArticle.tsx:40`

`script.source.target` is read directly inside the `extensions` `useMemo` (and its dependency array at line 61) with no subscription on `script` or `script.source`; `extensions.length === 0` makes the whole article render `null` (line 63-65), so a script whose source ref is still resolving at mount stays blank forever.

# WARN 119f317b-275 no-native-form-controls `packages/plugins/plugin-sidekick/src/components/ActionItems.tsx:39:17`

The action-item's completed toggle is a bare `<input type='checkbox' .../>`, which inherits no theme and skips the themed control entirely. `@dxos/react-ui` already exports `Field.Checkbox` for exactly this case; per `no-native-form-controls`, replace the native checkbox with `Field.Checkbox`.

# WARN 119f317b-276 no-native-form-controls `packages/plugins/plugin-sidekick/src/components/Permissions.tsx:49:17`

The `autoRespond`/`createDraft`/`researchEnabled` toggles (lines 49, 57, 65) are all native `<input type='checkbox' .../>` elements editing boolean fields via `onUpdate`, instead of the themed `Field.Checkbox` primitive from `@dxos/react-ui`. Per `no-native-form-controls`, swap all three for `Field.Checkbox` so they pick up the theme and stay consistent with the rest of the design system.

# ERROR 119f317b-277 no-casts `packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/collections.ts:174`

`.map((ref: any) => {` widens the callback parameter to `any`; `collection.objects` is already typed as a ref array — use that element type instead.

# ERROR 119f317b-278 no-casts `packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/collections.ts:244`

Same pattern: `.map((ref: any) => {` widens the callback parameter to `any`; use `collectionSnapshot.objects`'s real element type.

# ERROR 119f317b-279 no-casts `packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/database.ts:319`

`Entity.atom(mutableSchema as unknown as Entity.Unknown)` is the double-cast escape hatch; the comment above explains a genuine type/runtime mismatch on `Type.AnyEntity`, but that mismatch belongs on the `Type.AnyEntity` type itself (or a narrow, named helper) rather than a local `as unknown as` at the call site.

# ERROR 119f317b-280 no-casts `packages/plugins/plugin-space/src/capabilities/spaces-ready.ts:163`

`(space.properties as any)[Type.getTypename(Collection.Collection)]` is an `as any` cast to read a legacy dynamic key; give `properties` a typed index signature (or a typed legacy-migration accessor) instead of casting.

# ERROR 119f317b-281 no-casts `packages/plugins/plugin-space/src/capabilities/spaces-ready.ts:171`

`(space.properties as any)[`${Migrations.namespace}.version`]` is another `as any` cast on the same object; fold it into the same typed accessor as line 163.

# ERROR 119f317b-282 no-casts `packages/plugins/plugin-space/src/capabilities/spaces-ready.ts:306`

`ephemeral.viewersByObject[id]!.set(...)` asserts a possibly-undefined index result is non-null; use `??=` to establish the entry or check with `in`/`Object.hasOwn` instead of asserting.

# ERROR 119f317b-283 no-casts `packages/plugins/plugin-space/src/capabilities/spaces-ready.ts:313`

`ephemeral.viewersByIdentity.get(identityKey)!.add(id)` asserts a map lookup is non-null; use `.has`/`??=` to establish the entry instead of asserting.

# WARN 119f317b-284 subscribe-where-you-read `packages/plugins/plugin-space/src/capabilities/SpaceSurfaces.tsx:245`

`NavbarPresenceSurface` reads the space's root-collection ref via `Annotation.get(space.properties, ...).pipe(Option.getOrUndefined)?.target` directly in render, with no subscription on `space.properties` or the annotation ref, so presence never shows for a root collection that resolves after mount. Subscribe with `useObject`/`useResolveRef` before reading `.target`, per `subscribe-where-you-read`.

# WARN 119f317b-285 subscribe-where-you-read `packages/plugins/plugin-space/src/components/RelatedObjectCard/RelatedObjectCard.tsx:24`

`Entity.getIcon(subject)` and `Entity.getLabel(subject, ...)` (line 38) read the entity's fields directly in render with no `useObject` subscription on `subject`. This card is used as the leaf tile for related-object masonry lists, so a label/icon edit made elsewhere while the tile is mounted never re-renders it.

# WARN 119f317b-286 subscribe-where-you-read `packages/plugins/plugin-space/src/containers/CollectionArticle/CollectionArticle.tsx:87`

In `useCollectionItems`, `(collection.objects ?? []).map((ref) => ref.target)` resolves every ref directly inside a `useMemo` with no subscription on `collection` or the individual refs, so any object ref still loading at mount is silently dropped from the list and never appears once it resolves.

# WARN 119f317b-287 leaf-owns-its-subscription `packages/plugins/plugin-space/src/containers/CollectionArticle/CollectionArticle.tsx:87`

`useCollectionItems` builds `objects` via `(collection.objects ?? []).map((ref) => ref.target).filter(...)` and feeds it straight into `items`, rendered as `<Mosaic.Stack items={items} Tile={ObjectTile} />`. `ObjectTile` never subscribes on its own (it just reads `item.object` from props), so this is a pure list-level resolution with no leaf subscription at all — per `leaf-owns-its-subscription`, membership should be tracked (e.g. `useQuery(Filter.childOf(collection))` or a membership-only subscription) and each `ObjectTile` should resolve/subscribe to its own ref, rendering a fallback until loaded.

# WARN 119f317b-288 subscribe-where-you-read `packages/plugins/plugin-space/src/containers/RecordArticle/RecordArticle.tsx:69`

`Obj.getLabel(subject, { fallback: 'typename' })` (and `Obj.getIcon(subject)` at line 47) read the subject's fields directly in render with no `useObject` subscription — `RecordArticle` is exactly the "surface receiving `AppSurface.ObjectArticleProps<T>`" case `subscribe-where-you-read` calls out as needing to subscribe at the point it reads fields.

# WARN 119f317b-289 no-styling-wrapper-divs `packages/plugins/plugin-space/src/containers/TypeArticle/TypeArticle.stories.tsx:129`

`<div className='w-full grid grid-cols-2'>` is a hand-rolled two-column grid wrapping `TypeArticle`/`StoryCompanion`. Use `Grid` (`cols={2}`) instead.

# WARN 119f317b-290 no-sleep-in-test `packages/plugins/plugin-space/src/operations/open-object-form.test.ts:66:7`

`setTimeout(() => handle.settle(object), 10)` uses a fixed 10ms real-time delay to make the dialog's settlement arrive after the synchronous dismiss/retain calls, per `no-sleep-in-test`. The ordering under test (StrictMode's synchronous unmount+remount followed by a later settle) doesn't need a specific duration — use a Trigger or a microtask-based deferral tied to an actual readiness signal instead of an arbitrary timer, so the test isn't relying on 10ms being enough under load.

# ERROR 119f317b-291 no-casts `packages/plugins/plugin-space/src/types/SpaceSchema.ts:146`

`props: any,` widens the `CreateObject` type's parameter to `any`; give it the real props type this factory expects.

# ERROR 119f317b-292 no-casts `packages/plugins/plugin-spacetime/src/components/SpacetimeCanvas/SpacetimeCanvas.tsx:145`

`(obj as any).id as string` is an `as any` cast, then cast again to `string`; type `obj` so `.id` is reachable without either cast.

# ERROR 119f317b-293 no-casts `packages/plugins/plugin-spacetime/src/components/SpacetimeCanvas/SpacetimeCanvas.tsx:273`

`(obj as any).id === id` is an `as any` cast; type `obj` instead of casting past it.

# ERROR 119f317b-294 no-casts `packages/plugins/plugin-spacetime/src/components/SpacetimeCanvas/SpacetimeCanvas.tsx:455`

`(obj as any).id as string` is an `as any` cast, then cast again to `string`; type `obj` instead of stacking casts.

# ERROR 119f317b-295 no-casts `packages/plugins/plugin-spacetime/src/components/SpacetimeCanvas/SpacetimeCanvas.tsx:512`

`(toolManagerRef.current as any)?._ctx` is an `as any` cast; type `toolManagerRef` (or the tool manager) so `._ctx` is reachable without casting.

# ERROR 119f317b-296 no-casts `packages/plugins/plugin-spacetime/src/components/SpacetimeCanvas/SpacetimeCanvas.tsx:520`

`meshesRef.current.get(objectId)!` asserts a map lookup is non-null; narrow it with a check (e.g. filter out missing meshes) instead of asserting.

# ERROR 119f317b-297 no-casts `packages/plugins/plugin-spacetime/src/components/SpacetimeCanvas/SpacetimeCanvas.tsx:612`

`(obj as any).id as string` is an `as any` cast, then cast again to `string`; type `obj` instead of stacking casts.

# WARN 119f317b-298 toolbars-are-menu-actions `packages/plugins/plugin-stack/src/containers/StackArticle/StackArticle.tsx:181:11`

`StackArticle`'s toolbar is a bare `Toolbar.Root` with a hardcoded `Toolbar.IconButton` plus an `ActionMenu`-wrapped button, not built via `MenuBuilder` inside an `Atom` + `useMenuActions` + `Menu.Root`. `attendableId` is available (passed to `Stack.Root`) but is never threaded to the toolbar, so graph/plugin actions cannot contribute to it.

# WARN 119f317b-299 leaf-owns-its-subscription `packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx:58`

`const objects = useObjects(objectRefs);` resolves the entire `collection.objects` ref array at the list level to build `items`, which are rendered one per `ArtifactTile`. `useObjects` is explicitly named as deprecated by the rule for this reason — the gallery now re-renders every tile whenever any single artifact is edited. Replace with a membership-only subscription (e.g. `useQuery(Filter.childOf(collection))` if artifacts are queryable children) and let `ArtifactTile` resolve/subscribe to its own ref.

# WARN 119f317b-300 leaf-owns-its-subscription `packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactForm.tsx:79`

`const variants = useObjects(variantRefs);` is a new call to the deprecated `useObjects`, flagged by the rule regardless of downstream use — it subscribes `MediaArtifactForm` to every variant's mutations just to compute `pendingIndex`/`pendingId` (lines 184-185). Use a membership-only subscription (the `variants` array property, e.g. via `useObject(artifact, 'variants')`) plus a lazily-loaded check on `jobId` instead of resolving every target up front.

# WARN 119f317b-301 leaf-owns-its-subscription `packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactVariants.tsx:50`

`const variants = useObjects(variantRefs);` resolves every variant ref at the list level to build both the tab strip (`variants.map(...)` at line 133) and `galleryItems` (fed to `VariantGallery`). This is a direct instance of the rule's example (`useObjects(refs)`), and it means editing any one variant re-renders every tab and every gallery tile. Keep `variantRefs` unresolved for the list/tabs and let each variant tab/tile resolve and subscribe to its own ref.

# WARN 119f317b-302 subscribe-where-you-read `packages/plugins/plugin-support/src/containers/SupportArticle/SupportArticle.tsx:59`

`ticket.status` (line 59) and the controlled `ticket.title`/`ticket.body`/`ticket.resolution` values bound to the form fields (lines 74, 79, 86) are all read directly off the `ObjectArticleProps` subject with no `useObject` subscription anywhere in the component, so an edit to the ticket made elsewhere while this article is open (e.g. a concurrent peer, or the status buttons' own `Obj.update` calls landing through a different code path) is not guaranteed to re-render the visible form values.

# WARN 119f317b-303 toolbars-are-menu-actions `packages/plugins/plugin-support/src/containers/SupportCompanion/SupportCompanion.tsx:91:9`

The tours toolbar is a raw `Toolbar.Root` looping `Toolbar.IconButton`s directly rather than building the per-tour actions with `MenuBuilder`/`useMenuActions` and rendering via `Menu.Root`; `attendableId` is used only inside the click handler, never passed to the toolbar itself to allow other contributions to compose in.

# WARN 119f317b-304 toolbars-are-menu-actions `packages/plugins/plugin-support/src/containers/SupportHomeCompanion/SupportHomeCompanion.tsx:25:9`

`Panel.Toolbar` renders a single hardcoded `Toolbar.IconButton` inside a bare `Toolbar.Root` instead of going through `MenuBuilder`/`useMenuActions`/`Menu.Root`, closing the toolbar to composition.

# WARN 119f317b-305 subscribe-where-you-read `packages/plugins/plugin-table/src/containers/TableCard/TableCard.tsx:31`

`object.view.target?.query` is read directly in render with no subscription on `object` or `object.view`, so `typeUri`/`schema`/the queried rows never populate if the view ref hasn't resolved by first render. Compare `TableArticle.tsx:51`, which correctly calls `useObject(object.view)` before reading `.target` at line 77.

# WARN 119f317b-306 toolbars-are-menu-actions `packages/plugins/plugin-tasks/src/containers/JournalArticle/JournalArticle.tsx:32:9`

The calendar-toggle toolbar is a bare `Toolbar.Root` with a hardcoded `Toolbar.ToggleGroup`, not built via `MenuBuilder`/`useMenuActions`/`Menu.Root`. `attendableId` is destructured as `attendableId: _attendableId` and discarded, which the rule explicitly forbids.

# WARN 119f317b-307 subscribe-where-you-read `packages/plugins/plugin-tasks/src/containers/OutlineCard/OutlineCard.tsx:17`

`<Show when={subject.content.target}>` reads the outline's content ref directly in render with no `useObject`/`useResolveRef` subscription, so the card renders nothing and never recovers if the ref is still resolving when the card first mounts.

# WARN 119f317b-308 subscribe-where-you-read `packages/plugins/plugin-thread/src/containers/ThreadArticle/ThreadArticle.tsx:41`

`thread.messages.map((message) => message.target)` resolves each message ref directly inside a `useMemo` with no subscription on `thread` or the individual message refs, so messages whose refs are still loading at mount never appear (the `useMemo`'s `[thread.messages]` dependency doesn't change when an individual ref resolves).

# WARN 119f317b-309 leaf-owns-its-subscription `packages/plugins/plugin-thread/src/containers/ThreadArticle/ThreadArticle.tsx:41`

`messages = useMemo(() => thread.messages.map((message) => message.target).filter(isNonNullable), [thread.messages])` resolves every message ref at the list level (with no reactive load/subscribe at all) before handing the resolved array to `MessageThread`. This matches the rule's flagged pattern exactly (`refs.map((ref) => ref.target)` inside the list) and risks both defects it names: a cold-loaded ref silently drops the message, and any per-message edit forces `ThreadArticle` to recompute the whole list. Pass the unresolved refs through and let each message tile own its subscription.

# WARN 119f317b-310 write-through-the-live-object `packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.tsx:102:15`

`settings` is the read-only value returned by `useAtomCapability` (`useAtomValue(atom)` under the hood), i.e. a snapshot of the `TldrawCapabilities.Settings` atom — not the atom itself or a setter. `settings.showGrid = toInstance.isGridMode;` mutates that snapshot in place, which per `write-through-the-live-object` is a silent no-op: the atom's stored value is untouched, so the grid-mode change from the tldraw editor never propagates back into the settings atom (and never reaches other subscribers/persistence). Fix by writing through the atom's setter — e.g. switch the capability read to `useAtomCapabilityState` (which returns `[value, update]`) and call `update((current) => ({ ...current, showGrid: toInstance.isGridMode }))`, or otherwise obtain and use the atom registry's writable setter instead of assigning onto the read snapshot.

# ERROR 119f317b-311 no-casts `packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.tsx:252`

`actions: (_editor: Editor, actions: any, _helpers: any) => ({` widens both `actions` and `_helpers` to `any`; use tldraw's real `TLUiActionsContextType`/`TLUiOverrideHelpers` parameter types instead.

# ERROR 119f317b-312 no-casts `packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.tsx:264`

`tools: (_editor: Editor, tools: any) => {` widens `tools` to `any`; use tldraw's real tools-context type.

# ERROR 119f317b-313 no-casts `packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.tsx:288`

`Toolbar: (props: any) => (` widens `props` to `any`; use the real toolbar component's prop type.

# WARN 119f317b-314 no-styling-wrapper-divs `packages/plugins/plugin-tldraw/src/components/Canvas/UiSchematic.stories.tsx:52`

`<div className='grid grid-cols-[20rem_1fr] dx-fill'>` is a hand-rolled grid wrapper around the ASCII/canvas panes. Use `Grid` (`cols={['20rem', '1fr']}`) per `no-styling-wrapper-divs`.

# ERROR 119f317b-315 no-casts `packages/plugins/plugin-tldraw/src/model/builder.ts:27`

`isShape = (record: any) => record?.typeName === 'shape';` widens the parameter to `any`; type it as the base record union (or `unknown`, since this is a type-guard-shaped predicate) instead of `any`.

# ERROR 119f317b-316 no-casts `packages/plugins/plugin-tldraw/src/model/read.ts:171`

`.sort((a: any, b: any) => ...)` widens both sort parameters to `any`; type them with the real shape/index element type.

# ERROR 119f317b-317 no-casts `packages/plugins/plugin-tldraw/src/model/read.ts:172`

`.map((point: any) => ({ x: point.x, y: point.y }))` widens the parameter to `any`; type it with the real point element type.

# ERROR 119f317b-318 no-casts `packages/plugins/plugin-tldraw/src/model/scene.test.ts:101`

`Object.values(content) as any[]` casts the array to `any[]`; type `content`'s value union directly instead of casting the whole array away.

# WARN 119f317b-319 subscribe-where-you-read `packages/plugins/plugin-transcription/src/containers/TranscriptionArticle/TranscriptionArticle.tsx:26`

`const feed = transcript.feed.target;` is read directly in render with no subscription on `transcript` or `transcript.feed`, so the messages query built from `feed` never activates if the feed ref is still resolving at mount.

# ERROR 119f317b-320 no-casts `packages/plugins/plugin-trip/src/capabilities/app-graph-builder.ts:65`

`(ref as unknown as Segment.Segment | undefined)` is the double-cast escape hatch used as the non-`Ref` branch; if `ref` can genuinely be a raw `Segment.Segment` here, widen the parameter's declared type to include it instead of forcing it through `unknown`.

# WARN 119f317b-321 leaf-owns-its-subscription `packages/plugins/plugin-trip/src/capabilities/marker-provider.tsx:131`

`const loaded = useObjects(segmentRefs ?? []);` duplicates the same anti-pattern as `TripArticle.tsx` (its own comment says "Mirrors `TripArticle`"): it re-renders `useTripMarkers` on every segment load and edit, recomputing the entire `markers` array instead of scoping the subscription to membership only. Per `leaf-owns-its-subscription`, drop `useObjects` and resolve markers incrementally (or accept that per-marker recomputation needs its own subscription boundary) rather than subscribing the whole list to every segment.

# WARN 119f317b-322 toolbars-are-menu-actions `packages/plugins/plugin-trip/src/containers/SegmentArticle/SegmentArticle.tsx:54:9`

The view-mode toolbar is a bare `Toolbar.Root` with a hardcoded `Toolbar.ToggleGroup`, not built via `MenuBuilder`/`useMenuActions`/`Menu.Root`; `SegmentArticleProps` never carries an `attendableId` to thread through, closing the toolbar to plugin composition.

# WARN 119f317b-323 leaf-owns-its-subscription `packages/plugins/plugin-trip/src/containers/TripArticle/TripArticle.tsx:49`

`const loaded = useObjects(segmentRefs ?? []);` is the deprecated "re-render-trigger hack" the rule explicitly names: the comment states it "re-renders ... when each target loads and when a segment is edited", so any single segment edit re-renders and re-sorts the whole `segments` list, which is then passed fully resolved to `<SegmentStack segments={segments} .../>` (line 290). Replace with a membership-only subscription (`useObject(reactiveSubject, 'segments')` already gives that) and have `SegmentStack`'s per-segment tile resolve/subscribe to its own ref, rendering a fallback while cold.

# WARN 119f317b-324 toolbars-are-menu-actions `packages/plugins/plugin-voxel/src/components/VoxelToolbar/VoxelToolbar.tsx:66:5`

`VoxelToolbar` builds its `Toolbar.Root` from a long chain of hardcoded `Toolbar.IconButton`/`Toolbar.ToggleGroupIconItem` children rather than `MenuBuilder` + `useMenuActions` + `Menu.Root`, and never accepts or threads an `attendableId`, closing this container's toolbar to plugin/graph-action composition.

# WARN 119f317b-325 toolbars-are-menu-actions `packages/plugins/plugin-voxel/src/containers/VoxelArticle/VoxelArticle.tsx:27:38`

`attendableId` is renamed to `attendableId: _attendableId` and dropped, which the rule calls out by name ("never underscore it as unused"); it is never passed into `VoxelToolbar`.

# WARN 119f317b-326 toolbars-are-menu-actions `packages/plugins/plugin-zen/src/components/Mixer/Mixer.tsx:151:13`

`Mixer`'s `Panel.Toolbar` renders a bare `Toolbar.Root` with two hardcoded `Toolbar.IconButton`s (add layer, play/stop) instead of building actions with `MenuBuilder`/`useMenuActions` and rendering through `Menu.Root`. No `attendableId` is threaded to it either, so neither graph actions nor plugin extensions can compose into this toolbar, per `toolbars-are-menu-actions`.

# WARN 119f317b-327 toolbars-are-menu-actions `packages/plugins/plugin-zen/src/containers/ZenArticle/ZenArticle.tsx:17:44`

`attendableId` is destructured as `attendableId: _attendableId` and discarded — the rule explicitly says never to underscore it as unused. It is never passed to the `Mixer` component it renders, whose toolbar therefore cannot participate in attention-driven action composition.

# ERROR 119f317b-328 no-casts `packages/sdk/app-graph/src/AppGraph.test.ts:458`

`let json: any;` widens the variable to `any`; give it the real `Atom`/graph JSON snapshot type it's assigned from.

# ERROR 119f317b-329 no-casts `packages/sdk/app-graph/src/AppGraph.ts:474`

`graph as unknown as GraphImpl` is the double-cast escape hatch; if `getInternal` needs to reach the implementation behind the public `BaseGraph` handle, express that with a single typed downcast helper (or a brand/symbol) documented at the type level instead of `as unknown as`.

# ERROR 119f317b-330 no-casts `packages/sdk/app-toolkit/src/app-framework/AppCapabilities.ts:332`

`getText: (obj: any, anchor: string) => string | undefined;` widens `obj` to `any`; type it with the real object type this capability operates on.

# ERROR 119f317b-331 no-casts `packages/sdk/app-toolkit/src/app-framework/AppCapabilities.ts:343`

`getTextContent: (object: any) => Promise<string | undefined>;` widens `object` to `any`; type it with the real object type.

# ERROR 119f317b-332 no-casts `packages/sdk/app-toolkit/src/app-graph/AppNode.ts:55`

`cache.get(key)!` asserts a map lookup is non-null; narrow with `.has`/a default instead of asserting.

# ERROR 119f317b-333 no-casts `packages/sdk/client-services/src/packlets/identity/identity-manager.ts:402`

`this._identity!.identityKey` asserts `this._identity` is non-null; guard it (or type the field as required once construction guarantees it) instead of asserting.

# ERROR 119f317b-334 no-casts `packages/sdk/client-services/src/packlets/spaces/data-space-manager.ts:452`

`data as any as DatabaseDirectory` is the double-cast escape hatch (via `any` instead of `unknown`) that the adjoining `TODO(dmaretskyi): Broken types` comment already flags as a known type bug; fix `createDoc`'s parameter type (or the source of `data`) instead of casting through `any` at the call site.

# ERROR 119f317b-335 no-casts `packages/sdk/client-services/src/packlets/spaces/data-space-manager.ts:657`

`this._edgeHttpClient!.recordSpaceRoot(...)` asserts a possibly-undefined client is non-null; guard it (or type the field as required once construction guarantees it) instead of asserting.

# ERROR 119f317b-336 no-casts `packages/sdk/client-services/src/packlets/spaces/data-space-manager.ts:940`

`catch (err: any)` widens the caught error to `any`; catch as `unknown` and narrow before use.

# ERROR 119f317b-337 no-casts `packages/sdk/client/src/halo/halo-proxy.ts:376`

`this._invitationProxy!.share(options)` asserts a possibly-undefined proxy is non-null; guard it instead of asserting.

# ERROR 119f317b-338 no-casts `packages/sdk/client/src/halo/halo-proxy.ts:394`

`this._invitationProxy!.join(...)` asserts the same possibly-undefined proxy is non-null again; guard once and reuse the narrowed value.

# WARN 119f317b-339 no-invented-theme-tokens `packages/sdk/shell/src/panels/Panels.stories.tsx:41:23`

`bg-body` is not a Tailwind palette value or a declared `--color-*` token; nothing in `semantic.css` defines `body`. Use one of the surface tokens, e.g. `bg-base-surface`.

# WARN 119f317b-340 no-invented-theme-tokens `packages/sdk/worker-framework/src/stories/SharedCounter.stories.tsx:187:78`

Both `bg-primary/15` and `text-primary` are invented — there is no bare `--color-primary` (or `--color-primary` shade-less) surface/text token, only the numbered `primary-50..950` scale and the `primary-bg/-fg/-surface/-text/-border` roles. Use `bg-primary-surface`/`text-primary-text` or a numbered shade.

# WARN 119f317b-341 no-invented-theme-tokens `packages/sdk/worker-framework/src/stories/SharedCounter.stories.tsx:192:36`

Both `bg-warning/15` and `text-warning` are invented — `semantic.css` declares `warning-bg`, `warning-fg`, `warning-surface`, `warning-text` and `warning-border`, never bare `warning`. Use `bg-warning-surface`/`text-warning-text` (the pattern this file already uses correctly two lines later for `text-foreground`... see below).

# WARN 119f317b-342 no-invented-theme-tokens `packages/sdk/worker-framework/src/stories/SharedCounter.stories.tsx:198:44`

Same invented `text-foreground` (also at column 44 on line 201 below) — no `--color-foreground` property exists.

# WARN 119f317b-343 no-invented-theme-tokens `packages/sdk/worker-framework/src/stories/SharedCounter.stories.tsx:201:44`

Same invented `text-foreground` as line 198.

# WARN 119f317b-344 no-invented-theme-tokens `packages/stories/stories-assistant/src/modules/AgentModule.tsx:55:29`

Both `text-errorText` and `text-successText` are camelCase and generate no CSS; the declared tokens are `--color-error-text` and `--color-success-text` (`text-error-text` / `text-success-text`).

# WARN 119f317b-345 no-invented-theme-tokens `packages/stories/stories-assistant/src/modules/AgentModule.tsx:165:45`

Same invented `text-errorText`; use `text-error-text`.

# WARN 119f317b-346 no-invented-theme-tokens `packages/stories/stories-brain/src/components/CrawlPanel/CrawlPanel.tsx:128:69`

`text-subdued-text` is invented — the declared token is `--color-subdued` (bare), not `subdued-text`. Use `text-subdued`.

# WARN 119f317b-347 no-invented-theme-tokens `packages/stories/stories-brain/src/components/QuestionsPanel/QuestionsPanel.tsx:61:29`

Same invented `text-subdued-text`; use `text-subdued`.

# WARN 119f317b-348 no-invented-theme-tokens `packages/stories/stories-brain/src/components/QuestionsPanel/QuestionsPanel.tsx:67:71`

Same invented `text-subdued-text`; use `text-subdued`.

# WARN 119f317b-349 no-invented-theme-tokens `packages/stories/storybook-testing/src/ModuleContainer.tsx:146:55`

Bare `text-warning` is invented; use `text-warning-text`.

# WARN 119f317b-350 no-invented-theme-tokens `packages/ui/react-ui-assistant/src/widgets/ToolWidget.tsx:272:75`

Bare `text-error` is invented; use `text-error-text`.

# WARN 119f317b-351 no-invented-theme-tokens `packages/ui/react-ui-assistant/src/widgets/ToolWidget.tsx:273:52`

Same invented bare `text-error`; use `text-error-text`.

# WARN 119f317b-352 no-invented-theme-tokens `packages/ui/react-ui-assistant/src/widgets/ToolWidget.tsx:320:73`

Same invented bare `text-error`; use `text-error-text`.

# ERROR 119f317b-353 no-casts `packages/ui/react-ui-attention/src/components/AttentionProvider/attention-context.ts:22`

`attention: undefined as unknown as AttentionManager` is the double-cast escape hatch used as a placeholder default context value; make the context's default `undefined` (typed `AttentionContextValue | undefined`) and have `useAttentionContext` throw when used outside a provider, instead of lying to the type checker about the default.

# WARN 119f317b-354 subscribe-where-you-read `packages/ui/react-ui-canvas-compute/src/shapes/Trigger.tsx:22`

`const functionTrigger = shape.functionTrigger?.target;` is read directly in render with no `useObject`/`useResolveRef` subscription, so the trigger shape renders nothing (and stays that way) if the ref hasn't resolved by first render.

# WARN 119f317b-355 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/archive/components/Canvas/Canvas.stories.tsx:34`

`<div className='grid grid-cols-2 gap-2 dx-fill'>` is a hand-rolled two-column grid with a literal `gap-2`. Use `Grid` (`cols={2}`, `gap='sm'`) instead.

# ERROR 119f317b-356 no-casts `packages/ui/react-ui-canvas/src/archive/components/CellGrid/CellGrid.stories.tsx:176`

`atoms={atoms as any}` is an `as any` cast; type `atoms` to match the prop's expected type instead of casting past a mismatch.

# ERROR 119f317b-357 no-casts `packages/ui/react-ui-canvas/src/archive/util/util.ts:28`

`(window as any).INSPECT = () => {` is an `as any` cast; augment `Window` with the debug helpers' real shape instead of casting at each assignment.

# ERROR 119f317b-358 no-casts `packages/ui/react-ui-canvas/src/archive/util/util.ts:30`

`(window as any).inspect(el);` is another `as any` cast on the same global; fold it into the same `Window` augmentation.

# ERROR 119f317b-359 no-casts `packages/ui/react-ui-canvas/src/archive/util/util.ts:40`

`(window as any).INSPECT = () => {` is another `as any` cast on the same global (duplicate of line 28's pattern).

# ERROR 119f317b-360 no-casts `packages/ui/react-ui-canvas/src/archive/util/util.ts:41`

`(window as any).inspect(el);` is another `as any` cast on the same global.

# ERROR 119f317b-361 no-casts `packages/ui/react-ui-canvas/src/archive/util/util.ts:42`

`(window as any).element = el;` is another `as any` cast on the same global; fold all five of this file's casts into one `declare global` `Window` augmentation.

# WARN 119f317b-362 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/Palette/Palette.tsx:68`

`<div className='flex flex-col rounded-sm bg-modal-surface border border-separator divide-y divide-separator'>` is a hand-rolled flex column used only to stack the palette's groups. Use `Flex` (`column`, `asChild`) so the box comes from the layout primitive.

# WARN 119f317b-363 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/Palette/Palette.tsx:70`

`<div key={index} className='flex flex-col gap-1 p-1'>` is a hand-rolled flex column with a literal `gap-1`. Use `Flex` (`column`, `gap='xs'`) per `no-styling-wrapper-divs`.

# WARN 119f317b-364 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/SceneLayer/SceneLayer.tsx:238`

`<div className={mx('dx-fullscreen', !opening && 'bg-hover-surface', tier === 'dot' && 'bg-primary-500/40')}>`'s child `<div className='dx-fullscreen flex flex-col items-center justify-center gap-1 pointer-events-none'>` (portal preview label) is a hand-rolled centered flex column with a literal `gap-1`. Use `Flex` (`column`, `align='center'`, `justify='center'`, `gap='xs'`, `asChild`).

# WARN 119f317b-365 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/SceneView/Constrained.stories.tsx:67`

`<div className='flex flex-col gap-1 p-2 text-sm font-mono overflow-y-auto'>` is a hand-rolled flex column with a literal `gap-1`. Use `Flex` (`column`, `gap='xs'`) instead.

# WARN 119f317b-366 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/SceneView/Constrained.stories.tsx:88`

`<div className='dx-fill grid grid-cols-[1fr_16rem_20rem]'>` is a hand-rolled three-column grid. Use `Grid` (`cols={['1fr', '16rem', '20rem']}`) per `no-styling-wrapper-divs`.

# WARN 119f317b-367 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/SceneView/Dynamic.stories.tsx:91`

`<div className='flex flex-col gap-1 p-2 text-sm font-mono overflow-y-auto'>` is a hand-rolled flex column with a literal `gap-1`. Use `Flex` (`column`, `gap='xs'`) instead.

# WARN 119f317b-368 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/SceneView/Dynamic.stories.tsx:126`

`<div className='dx-fill grid grid-cols-[1fr_16rem_20rem]'>` is a hand-rolled three-column grid. Use `Grid` (`cols={['1fr', '16rem', '20rem']}`) instead.

# WARN 119f317b-369 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/SceneView/SceneView.stories.tsx:51`

`<div className='dx-fill grid grid-cols-[1fr_20rem]'>` is a hand-rolled two-column grid wrapping the scene view and the properties panel. Use `Grid` (`cols={['1fr', '20rem']}`) per `no-styling-wrapper-divs`.

# WARN 119f317b-370 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/SceneView/SceneView.tsx:1278`

`<div className='absolute top-2 left-2 flex items-center gap-2 px-2 py-1 rounded-sm bg-modal-surface border border-separator text-sm'>` (the toolbar overlay: Up/Breadcrumbs/Fit/Snap/Undo/Redo/Cut/Copy/Paste) is a hand-rolled flex row with a literal `gap-2`. Use `Flex` (`asChild`, `align='center'`, `gap='sm'`) so only the `absolute top-2 left-2` placement stays ad hoc.

# WARN 119f317b-371 no-compat-shims `packages/ui/react-ui-canvas/src/index.ts:5:1`

The package's main barrel used to re-export the implementation directly (`./components/index.ts`, `./hooks/index.ts`, `./types.ts`, `./util/index.ts`); this change physically moves that implementation to `./archive/*` and replaces the top-level export with `export * from './archive/index.ts'`, preceded by a comment stating it is being "kept for canvas-editor, canvas-compute and the sequencer until the scene engine replaces them" — a re-export shim at the old location plus a comment explicitly announcing a temporary compat layer, both called out by the rule. The consuming packages (canvas-editor, canvas-compute, sequencer) should be migrated to import from the new `@dxos/react-ui-canvas/scene` subpath (or the archived API's new path directly) in this same change rather than being left on the old top-level import via this forwarding barrel.

# WARN 119f317b-372 no-trivial-wrappers-over-official-apis `packages/ui/react-ui-components/src/components/ProgressMeter/ProgressMeter.stories.tsx:26`

`const step = () => random.number.int({ min: 1, max: 4 });` is a module-local helper whose body is a single call to `@dxos/random`'s `number.int` with fixed literal args — no branching, error handling, derived value, or non-trivial default. Per `no-trivial-wrappers-over-official-apis`, it just renames the API the story actually exercises; inline `random.number.int({ min: 1, max: 4 })` at its one call site (line 91) instead.

# WARN 119f317b-373 no-styling-wrapper-divs `packages/ui/react-ui-components/src/components/ProgressMeter/ProgressMeter.tsx:190`

`<div className='flex items-center justify-between gap-2 text-xs'>` is a hand-rolled flex row with a literal `gap-2`. Use `Flex` (`align='center'`, `justify='between'`, `gap='sm'`) per `no-styling-wrapper-divs`.

# WARN 119f317b-374 no-styling-wrapper-divs `packages/ui/react-ui-components/src/components/ProgressMeter/ProgressMeter.tsx:197`

`<div className='flex items-center gap-1 shrink-0 text-description'>` is a hand-rolled flex row with a literal `gap-1`. Use `Flex` (`align='center'`, `gap='xs'`) instead.

# WARN 119f317b-375 no-invented-theme-tokens `packages/ui/react-ui-feed/src/components/Minimap/Minimap.tsx:61:43`

`bg-accent-fill/30` is not a declared theme token — `semantic.css` declares `accent-bg`, `accent-fg` and `accent-text` but no `accent-fill`, so the class produces no CSS and the fill is invisible. Use `bg-accent-bg/30` (the same family used for the border two lines below).

# WARN 119f317b-376 no-invented-theme-tokens `packages/ui/react-ui-feed/src/components/Minimap/Minimap.tsx:75:69`

Same invented `bg-accent-fill/70` — no `--color-accent-fill` custom property exists. Use `bg-accent-bg/70`.

# WARN 119f317b-377 no-invented-theme-tokens `packages/ui/react-ui-feed/src/debug/Debug.tsx:83:61`

Bare `text-error` is invented; use `text-error-text`.

# WARN 119f317b-378 themed-primitives-take-classNames `packages/ui/react-ui-graph/src/components/SVG/Markers.tsx:12`

`MarkersProps` (the props of the exported `Markers` component from `@dxos/react-ui-graph`) declares only `className?: string`, with no `classNames` prop at all, and the component forwards it straight to `<defs className={className} />`. Per the rule this composite part should take `classNames` and reconcile it internally instead of publishing `className` on its props.

# WARN 119f317b-379 themed-primitives-take-classNames `packages/ui/react-ui-graph/src/components/SVG/Zoom.tsx:11`

Same issue as `Markers.tsx`: the exported `ZoomProps` surfaces `className?: string` (no `classNames`), and `Zoom` forwards it directly to `<g className={className}>`. Per the rule, this `@dxos/react-ui-graph` component should expose `classNames` rather than publishing `className` on its props.

# ERROR 119f317b-380 no-casts `packages/ui/react-ui-list/src/components/Tree/Tree.tsx:102`

`Atom.make((get: any): TreeWalkState<T> => {` widens the callback parameter to `any`; type it as `Atom.AtomContext` (the type used for `get` elsewhere in this codebase) instead of `any`.

# WARN 119f317b-381 no-styling-wrapper-divs `packages/ui/react-ui-list/src/components/Tree/Tree.tsx:1173`

`<div data-testid='treeItem.heading' className={mx('flex items-center min-w-0 gap-2 ps-0.5 min-h-(--dx-control) cursor-pointer select-none', ...)}>` is a hand-rolled flex row with a literal `gap-2` for the icon/label/badge heading. Use `Flex` (`asChild`, `align='center'`, `gap='sm'`) so the icon/label composition comes from the primitive.

# WARN 119f317b-382 no-invented-theme-tokens `packages/ui/react-ui-markdown/src/MarkdownView/MarkdownView.stories.tsx:72:29`

`border-border` is not a Tailwind palette value or a declared `--color-*` property (this reads like a leftover shadcn/ui convention). Use `border-separator` or another declared separator token.

# WARN 119f317b-383 themed-primitives-take-classNames `packages/ui/react-ui-markdown/src/MarkdownView/MarkdownView.tsx:20`

`MarkdownViewProps` wraps its object in `ThemedClassName<...>` (which already supplies `classNames`) but then re-adds `& { className?: string }`, so the exported, consumer-facing type still surfaces a real `className` field alongside `classNames`. Unlike the ark/Radix passthrough exemption, `MarkdownView` renders a plain `<div>` it owns itself; per the rule it should merge via `classNames` only and drop the extra `className` field from the public `MarkdownViewProps`.

# WARN 119f317b-384 no-styling-wrapper-divs `packages/ui/react-ui-trace/src/components/ProcessTree/ProcessTree.tsx:184`

`<div className='flex items-center justify-end ps-1 text-xs text-description tabular-nums'>` (the elapsed-time column) is a hand-rolled flex box. Use `Flex` (`asChild`, `align='center'`, `justify='end'`) per `no-styling-wrapper-divs`.

# WARN 119f317b-385 no-styling-wrapper-divs `packages/ui/react-ui-trace/src/components/ProcessTree/ProcessTree.tsx:189`

`<div className='flex items-center mx-1'>` (the terminate-control column) is a hand-rolled flex box. Use `Flex` (`asChild`, `align='center'`) instead of a raw `flex` div.

# ERROR 119f317b-386 no-casts `packages/ui/react-ui-trace/src/components/Timeline/timeline-layout.test.ts:132`

`subAgentFixture as unknown as Trace.Message[]` is the double-cast escape hatch; type the fixture as `Trace.Message[]` at its source instead of forcing it through `unknown` here.

# ERROR 119f317b-387 no-casts `packages/ui/react-ui-trace/src/execution-graph/execution-graph.ts:499`

`childPidsByParent.get(pending.pop()!)` asserts `pending.pop()` is non-null on a possibly-empty array; guard with a length/while check before popping instead of asserting.

# ERROR 119f317b-388 no-casts `packages/ui/react-ui-trace/src/execution-graph/execution-graph.ts:843`

`span.events[eventIndex]!` asserts a possibly-out-of-range index is non-null; bounds-check `eventIndex` instead of asserting.

# ERROR 119f317b-389 no-casts `packages/ui/react-ui-trace/src/execution-graph/execution-graph.ts:854`

`span.events[eventIndex]!` asserts a possibly-out-of-range index is non-null; bounds-check `eventIndex` instead of asserting.

# ERROR 119f317b-390 no-casts `packages/ui/react-ui-trace/src/execution-graph/execution-graph.ts:889`

`pipe(...args: any) {` widens the rest parameter to `any` (dropping even the array shape); type it as `any[]`'s real element union or the specific `pipe` overload's parameter types.

# ERROR 119f317b-391 no-casts `packages/ui/react-ui-trace/src/execution-graph/execution-graph.ts:1073`

`this.#commits[index]!` asserts a possibly-out-of-range index is non-null; bounds-check `index` instead of asserting.

# WARN 119f317b-392 no-invented-theme-tokens `packages/ui/react-ui/src/components/Avatars/Avatar.stories.tsx:79:64`

`bg-cubes` is not a Tailwind palette value or declared theme token.

# WARN 119f317b-393 themed-primitives-take-classNames `packages/ui/react-ui/src/components/Calendar/Calendar.tsx:54`

`BaseCalendarProps` (feeding the exported `CalendarRootProps`, the props of the public `Calendar.Root` composite) declares both `classNames?: ClassNameValue` and `className?: string` as parallel fields, and `CalendarRoot`/`CalendarShell` accept and forward both into `tx('calendar.root', {}, classNames, className)`. Per the rule, a composite part must never publish `className` on its own props — only `classNames` is the consumer-facing prop; drop the `className` field (and its plumbing through `CalendarShell`) from the public API.

# ERROR 119f317b-394 no-casts `packages/ui/react-ui/src/components/Tooltip/Tooltip.stories.tsx:38`

`component: Tooltip as any,` is an `as any` cast; type the storybook `meta` object (`satisfies Meta<typeof Tooltip>` or an explicit generic) instead of casting the component past the checker.

# WARN 119f317b-395 no-invented-theme-tokens `packages/ui/ui-theme/src/Theme.stories.tsx:281:53`

`text-test-experimental` is not a Tailwind palette value or declared theme token — it produces no CSS (the adjacent `text-error-text` on the surrounding lines is the correctly declared form).
