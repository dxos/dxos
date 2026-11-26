# Group, object, view and hull: design

Status: written 2026-11-26 against the code of [dxos/dxos#14675](https://github.com/dxos/dxos/pull/14675). Sections
1 to 5 describe what is built. Section 6 lists where it disagrees with itself, and section 7 proposes one model.
Nothing in section 7 is decided. [VIEWS.md](./VIEWS.md) holds the earlier reasoning for Views and Objects in the 2D
engine; this document adds the scene model (`@dxos/scene`), 3D, and hulls.

## 1. Summary

The drawing has four ways to put elements inside another element.

| Mechanism  | Purpose                                                          |
| ---------- | ---------------------------------------------------------------- |
| **Group**  | Treat a selection as one thing, where it stands.                 |
| **Object** | A reusable definition, drawn wherever it is placed.              |
| **View**   | A place to drill into, with its own coordinate space.            |
| **Hull**   | A border round nodes that stay selectable and movable one by one. |

All four are stored as the same three records. They differ in five fields spread over those records, and two writers
(the scene model's intents and the 2D engine) set those fields differently. Every group bug fixed on 2026-11-26 came
from a reader that assumed one writer's shape and met the other's.

## 2. The shared model

![An element places a model object, whose parts are a layout of elements](./diagrams/containers.dx.svg)

An **element** of a layout places a **model object**. An object with `parts` names another **layout**, whose elements
are drawn through the placing element. The four mechanisms are four ways to fill in these records.

```ts
// @dxos/scene (Scene.ts, element.ts), reduced to the fields that matter here.
type Layout = {
  id: string;
  model?: string; // the model whose objects its elements place
  elements: Record<string, Element>;
  kind?: 'view' | 'composite'; // unset reads as 'view'
  anonymous?: boolean; // made by Group, kept out of the library
};

type ModelObject = {
  id: string;
  kind: string; // 'group', or the kind the object draws as
  parts?: string; // a layout id; in ECHO, a Ref to the Layout
};

type Element = {
  id: string;
  kind?: string; // unset takes the object's kind
  object?: string; // a model object id
  center?: Point; // 2D and 3D
  size?: Size; // 2D
  scale?: Point; // parts' units to the layout's
  fit?: 'fit' | 'fill' | 'none'; // 'none' draws the parts at true size
  // 2D engine fields, stored beside the rest
  composite?: string; // the layout an `instance` node draws
  scene?: string; // the layout a `view` node opens
  hull?: HullShape; // an instance that is a hull's group
  parent?: string; // editor only: the hull a node is inside
};
```

Two rules hold for every mechanism.

1. **Resolve.** `resolve2D` and `resolve3D` apply the object to the element. The element's own fields win, its kind
   is `element.kind ?? object.kind`, and `parts` comes from the object (`document.ts`).
2. **Place.** A placed composite's box in 2D is its parts' bounds at `scale` about `center` (`scaledFrame` in
   `viewport2d/render-list.ts`). An element with no `center` is placed at the origin at scale 1. 3D does the same
   (`three/render-list.ts`).

## 3. The four cases in the data model

Each example starts from A → B → C in a layout `root` whose model is `m`. Only the fields that tell the cases apart
are shown.

### 3.1 Group

The Group command in a host with a model (plugin-canvas, 2D and 3D) runs the scene model's `group` intent.

```ts
// layout root
g: { id: 'g', object: 'root/g', fit: 'none' } // no kind, no center
bc: { kind: 'link', source: { node: 'g', port: 'b' }, target: { node: 'c' } }
// model m
'root/g': { id: 'root/g', kind: 'group', parts: 'root/g' }
// layout root/g
{ kind: 'composite', anonymous: true, model: 'm', elements: { a, b, ab } } // members keep their coordinates
```

After the 2D canvas first writes the element (a move), it states what the engine draws it as:

```ts
g: { id: 'g', kind: 'instance', object: 'root/g', composite: 'root/g', fit: 'none',
     center: { x: 0, y: 64 }, scale: { x: 1, y: 1 } } // center is the origin its members are placed from
```

The standalone 2D editor's Group (`composeSelection` in `utils/compose.ts`) stores a third shape:

```ts
g: { id: '<instance id>', kind: 'instance', object: 'instance:<object id>', composite: '<object id>', fit: 'none',
     center, size } // a frame of its own
// model
'instance:<object id>': { kind: 'rect', parts: '<object id>' } // not kind 'group'
// layout <object id>
{ kind: 'composite', anonymous: true, name: 'Group 1' } // members shifted to be relative to the instance
```

### 3.2 Object

Make object runs the `extract` intent.

```ts
// layout root
'object-1': { id: 'object-1', object: 'object-1', center, size } // 2D: the members' bounds; 3D: their mean centre
// model m
'object-1': { id: 'object-1', kind: 'rect', parts: 'object-1-parts' } // 3D: kind 'sphere'
// layout object-1-parts
{ model: 'm', elements: { a, b, ab } } // no kind, not anonymous
```

An Object placed from the 2D engine's library is an `instance` node:

```ts
i: { id: 'i', kind: 'instance', object: 'instance:card', composite: 'card', center, scale, fit?: 'fit' | 'fill' }
'instance:card': { kind: 'rect', parts: 'card' }
// layout card
{ kind: 'composite', name: 'Card' }
```

### 3.3 View

A `view` node opens a layout.

```ts
v: { id: 'v', kind: 'view', object: 'view:detail', scene: 'detail', center, size }
'view:detail': { kind: 'rect', parts: 'detail' }
// layout detail
{ name: 'Detail' } // kind unset, which reads as 'view'
```

An element that places an object with parts and states no kind also reads as a View in 2D, unless the object's kind
is `instance` or `group` (`toNode`). The Object of 3.2 made by `extract` is therefore drawn as a View in 2D.

### 3.4 Hull

A hull is stored as a group with a border (`utils/hull-group.ts`).

```ts
h: { id: 'hull-1', kind: 'instance', object: 'instance:hull-1-parts', composite: 'hull-1-parts', fit: 'none',
     center, size, hull: 'box', hullInset?: 1 }
'instance:hull-1-parts': { kind: 'rect', parts: 'hull-1-parts' }
// layout hull-1-parts
{ kind: 'composite', anonymous: true, elements: { a, b, ab } }
```

The 2D editor never shows that shape. `expandHulls` opens the group on read: A and B stand in the scene with
`parent: 'hull-1'`, and a `hull` node stands for the instance. `collapseHulls` closes it again before a write.

### 3.5 What tells them apart today

| Field             | Group (model) | Group (2D engine) | Object (model) | Object (2D engine) | View      | Hull       |
| ----------------- | ------------- | ----------------- | -------------- | ------------------ | --------- | ---------- |
| `element.kind`    | unset         | `instance`        | unset          | `instance`         | `view`    | `instance` |
| `element.fit`     | `none`        | `none`            | unset          | unset or stated    | unset     | `none`     |
| `element.center`  | unset         | set, with a size  | set            | set                | set       | set        |
| `element.hull`    | unset         | unset             | unset          | unset              | unset     | set        |
| `object.kind`     | `group`       | `rect`            | `rect`         | `rect`             | `rect`    | `rect`     |
| `object.id`       | layout/id     | `instance:…`      | `object-N`     | `instance:…`       | `view:…`  | `instance:…` |
| `layout.kind`     | `composite`   | `composite`       | unset          | `composite`        | unset     | `composite` |
| `layout.anonymous` | true         | true              | unset          | unset              | unset     | true       |

No single field names the mechanism. A reader has to combine four of them, and each reader combines them its own way.

## 4. Nesting

A container can hold another container: a group of a group and an element, a hull inside a hull, an Object placed in
a group. Three rules make that work, and each was missing somewhere until 2026-11-26.

1. **A frame is derived, to any depth.** A part that has no frame of its own (a group that was never moved) spans
   its own parts. `scaledFrame` recurses, and keeps the layouts it has entered so a cycle stops.
2. **No centre means the origin.** A group stored with no `center` places its members from the origin. A group with
   a `center` and no `size` places them from that centre.
3. **Ungroup carries the offset down.** Ungrouping a moved group adds the group's `center` to each member. A member
   that is itself a group with no centre takes that offset as its own centre (`shifted` in `model-intent.ts`).

An Object may not be placed inside its own parts (`placesCycle`), and an Object cannot contain a View
(`SPEC-2D.mdl` F-9.9).

## 5. How they behave

| Property              | Group                         | Object                               | View                    | Hull                      |
| --------------------- | ----------------------------- | ------------------------------------ | ----------------------- | ------------------------- |
| Parts' coordinates    | The parent's                  | Their own, scaled into the frame     | Their own space         | The parent's              |
| Named and reusable    | No                            | Yes                                  | A place, opened by nodes | No                       |
| Edit a member         | Open the group                | Open the Object                      | Drill in                | In place                  |
| Double-click, 2D      | Opens in isolation            | Opens in isolation                   | Drills in               | Not established           |
| Double-click, 3D      | Not established               | Drills into the parts                | No `view` node in 3D    | No hull in 3D             |
| Chrome                | None                          | None in 2D, a frame in 3D            | A frame and a label     | A border                  |
| A link from outside   | Ends on a port named by the member | Ends on the instance            | Ends on the view node   | Ends on the member        |
| Drawn in 3D           | Members only, no item of its own | An item, with its parts fitted inside | Not built            | Not built                 |

## 6. Where the code disagrees with itself

1. **Two Group implementations.** The model's `group` and the engine's `composeSelection` store the shapes of 3.1.
   Model Ungroup refuses the engine's group, because its object is not of kind `group`.
2. **A hull cannot be ungrouped** through the model, for the same reason.
3. **Synthesized objects.** The 2D writer makes an object `view:<layout>` or `instance:<layout>` for every View and
   instance node. A drawing then holds two objects for one definition when the model also made one.
4. **Make object draws as a View in 2D** (3.3), and its parts layout is not marked `composite`.
5. **The Objects inspector lists everything**: anonymous groups and synthesized objects included (`objectEntries`),
   against "kept out of the library" (`SPEC-2D.mdl` F-9.4).
6. **Group is offered differently.** The plugin needs two or more elements selected, the standalone editor one.
7. **Ungroup differs.** The model keeps member ids and ignores the group's `scale`. The engine makes fresh ids.
8. **A group selected in 3D shows no outline**, since it has no item of its own.
9. **Specs.** `SPEC-2D.mdl` says an instance places `instance:<composite>`. Scene decision D-46 lists the model
   intents as define, update, remove and extract, without group and ungroup. No spec feature states what a hull is.

## 7. Proposal

One record shape, one discriminator, one writer.

1. **The model object's `kind` names the mechanism.** `group`, `hull` and `view` are the three reserved kinds. Any
   other object with `parts` is an Object. A reader then asks one question (`groupOf` already asks it for groups).
2. **The element's `kind` is only how it draws.** The 2D reader derives `view` or `instance` from the object, and no
   reader treats the element's kind as what the thing is.
3. **A node names the object it places.** The 2D writer stops making `view:` and `instance:` objects. Groups already
   work this way since 2026-11-26.
4. **A parts layout is always `kind: 'composite'`**, and `anonymous` exactly when its object is a `group` or a `hull`.
5. **Group and Ungroup are the model's intents everywhere.** The standalone 2D editor calls the same reducer, and
   `composeSelection` and `ungroupInstance` go. Group needs one element or more in both.
6. **A hull is a group with a border.** Its object is of kind `hull`, Ungroup takes it apart, and `expandHulls` keeps
   opening it out in the 2D editor.
7. **The library shows named Objects only.**
8. **Stored drawings migrate once.** The 0.2.0 migration of this PR gains a step that renames `view:` and
   `instance:` objects and sets the reserved kinds.

### Decisions needed

1. Is `object.kind` the discriminator (proposal 1), or a new field on the element?
2. Does the standalone 2D editor move to the model's intents (proposal 5), or does the model adopt the engine's shape?
3. Should Ungroup on a hull dissolve it (proposal 6)?
4. Should a group be drawn with a selection box in 3D, as its members' bounds?
5. Does the migration belong in this PR (proposal 8), which is already marked `breaking: storage`?
