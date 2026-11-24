---
# Generated: do not edit. Run `moon run scene:gen-ontology`.
title: Scene schema
description: Every type a stored drawing is made of, generated from the schemas in @dxos/scene.
---

This page lists every type that makes up a stored drawing: its scenes, layouts, models, elements and styles.
Use it to look up a field's name and type when you read or write a drawing's records.

A `?` after a field name marks it optional, and a linked type opens that type. A type that extends another lists
only the fields that differ. The page is generated from the schemas in `@dxos/scene`, whose source also holds the
same types as one JSON Schema document, `ontology.schema.json`.

## Document

The root of a drawing as it is read or printed whole.

### Document

Scenes, layouts and models together. The first scene is the root.

| Field     | Type                                                                                             |
| --------- | ------------------------------------------------------------------------------------------------ |
| `scenes`  | ([Scene.SceneRecord2D](#scenescenerecord2d) or [Scene.SceneRecord3D](#scenescenerecord3d))[]     |
| `layouts` | ([Scene.LayoutRecord2D](#scenelayoutrecord2d) or [Scene.LayoutRecord3D](#scenelayoutrecord3d))[] |
| `models`  | ([Scene.ModelRecord2D](#scenemodelrecord2d) or [Scene.ModelRecord3D](#scenemodelrecord3d))[]     |

## Scenes

A scene views one layout through a camera.

### Scene.SceneRecord2D

A 2D scene as plain data.

| Field    | Type                             |
| -------- | -------------------------------- |
| `id`     | string                           |
| `dim`    | `2d`                             |
| `name?`  | string                           |
| `theme?` | string                           |
| `layout` | string                           |
| `camera` | [Scene.Camera2D](#scenecamera2d) |

### Scene.SceneRecord3D

A 3D scene as plain data. Extends [Scene.SceneRecord2D](#scenescenerecord2d).

| Field    | Type                             |
| -------- | -------------------------------- |
| `dim`    | `3d`                             |
| `camera` | [Scene.Camera3D](#scenecamera3d) |

### Scene.Scene2D

A 2D scene as an ECHO object. ECHO type `org.dxos.type.scene.scene2d`, version 0.1.0. As [Scene.SceneRecord2D](#scenescenerecord2d), without `dim`.

| Field    | Type                                    |
| -------- | --------------------------------------- |
| `key`    | string                                  |
| `layout` | ref to [Scene.Layout2D](#scenelayout2d) |

### Scene.Scene3D

A 3D scene as an ECHO object. ECHO type `org.dxos.type.scene.scene3d`, version 0.1.0. As [Scene.SceneRecord3D](#scenescenerecord3d), without `dim`.

| Field    | Type                                    |
| -------- | --------------------------------------- |
| `key`    | string                                  |
| `layout` | ref to [Scene.Layout3D](#scenelayout3d) |

### Scene.Camera2D

Where a 2D scene looks and how far in.

| Field    | Type                     |
| -------- | ------------------------ |
| `center` | { x: number, y: number } |
| `zoom`   | number                   |

### Scene.Camera3D

An orbit camera. Angles are in degrees.

| Field        | Type                         |
| ------------ | ---------------------------- |
| `target`     | [Scene.Vec3](#scenevec3)     |
| `yaw`        | number                       |
| `pitch`      | number                       |
| `distance`   | number                       |
| `fov`        | number                       |
| `projection` | `perspective` `orthographic` |

## Layouts

A layout positions elements in one coordinate space.

### Scene.LayoutRecord2D

A 2D layout as plain data.

| Field          | Type                                                  |
| -------------- | ----------------------------------------------------- |
| `id`           | string                                                |
| `dim`          | `2d`                                                  |
| `name?`        | string                                                |
| `model?`       | string                                                |
| `elements`     | map of [Scene.ElementRecord2D](#sceneelementrecord2d) |
| `styles?`      | map of [Style2D](#style2d)                            |
| `layers?`      | map of [Layer](#layer)                                |
| `kind?`        | [Scene.LayoutKind](#enums)                            |
| `anonymous?`   | boolean                                               |
| `arrange?`     | [Scene.Arrangement](#scenearrangement)                |
| `props?`       | map of any                                            |
| `grid?`        | [Scene.GridPitch](#scenegridpitch)                    |
| `lattice?`     | [Scene.Lattice](#scenelattice)                        |
| `constraints?` | [Scene.Constraint](#sceneconstraint)[]                |

### Scene.LayoutRecord3D

A 3D layout as plain data. As [Scene.LayoutRecord2D](#scenelayoutrecord2d), without `grid`, `lattice`, `constraints`.

| Field      | Type                                                  |
| ---------- | ----------------------------------------------------- |
| `dim`      | `3d`                                                  |
| `elements` | map of [Scene.ElementRecord3D](#sceneelementrecord3d) |
| `styles?`  | map of [Style3D](#style3d)                            |

### Scene.Layout2D

A 2D layout as an ECHO object. ECHO type `org.dxos.type.scene.layout2d`, version 0.2.0. As [Scene.LayoutRecord2D](#scenelayoutrecord2d), without `dim`.

| Field    | Type              |
| -------- | ----------------- |
| `key`    | string            |
| `model?` | ref to any object |

### Scene.Layout3D

A 3D layout as an ECHO object. ECHO type `org.dxos.type.scene.layout3d`, version 0.2.0. As [Scene.LayoutRecord3D](#scenelayoutrecord3d), without `dim`.

| Field    | Type              |
| -------- | ----------------- |
| `key`    | string            |
| `model?` | ref to any object |

### Scene.GridPitch

A grid pitch in scene px.

Type: number, at least 1.

### Scene.Lattice

Lattice mode's grid: shapes span whole cells and links run in the gutters.

| Field     | Type   |
| --------- | ------ |
| `width`   | number |
| `height`  | number |
| `gutterX` | number |
| `gutterY` | number |

### Scene.Constraint

Constrained mode's relation of one element to another.

| Field      | Type                      |
| ---------- | ------------------------- |
| `subject`  | string                    |
| `relation` | [Scene.Placement](#enums) |
| `object`   | string                    |

### Scene.Arrangement

How a layout places the elements that have no position yet.

| Field     | Type       |
| --------- | ---------- |
| `kind`    | string     |
| `params?` | map of any |

### Layer

A layer that elements paint on, bottom first.

| Field     | Type    |
| --------- | ------- |
| `id`      | string  |
| `name`    | string  |
| `z`       | string  |
| `hidden?` | boolean |

## Models

A model holds the reusable objects that elements place, and the named styles.

### Scene.ModelRecord2D

A 2D model as plain data.

| Field       | Type                                    |
| ----------- | --------------------------------------- |
| `id`        | string                                  |
| `dim`       | `2d`                                    |
| `name?`     | string                                  |
| `objects`   | map of [Scene.Object2D](#sceneobject2d) |
| `styles?`   | map of [NamedStyle2D](#namedstyle2d)    |
| `catalogs?` | string[]                                |

### Scene.ModelRecord3D

A 3D model as plain data. Extends [Scene.ModelRecord2D](#scenemodelrecord2d).

| Field     | Type                                    |
| --------- | --------------------------------------- |
| `dim`     | `3d`                                    |
| `objects` | map of [Scene.Object3D](#sceneobject3d) |
| `styles?` | map of [NamedStyle3D](#namedstyle3d)    |

### Scene.Model2D

A 2D model as an ECHO object. ECHO type `org.dxos.type.scene.model2d`, version 0.2.0. As [Scene.ModelRecord2D](#scenemodelrecord2d), without `dim`.

| Field       | Type                                                |
| ----------- | --------------------------------------------------- |
| `key`       | string                                              |
| `objects`   | map of [Scene.StoredObject2D](#scenestoredobject2d) |
| `catalogs?` | ref to [StyleCatalog](#stylecatalog)[]              |

### Scene.Model3D

A 3D model as an ECHO object. ECHO type `org.dxos.type.scene.model3d`, version 0.2.0. As [Scene.ModelRecord3D](#scenemodelrecord3d), without `dim`.

| Field       | Type                                                |
| ----------- | --------------------------------------------------- |
| `key`       | string                                              |
| `objects`   | map of [Scene.StoredObject3D](#scenestoredobject3d) |
| `catalogs?` | ref to [StyleCatalog](#stylecatalog)[]              |

### Scene.Object2D

A reusable 2D object, with no position.

| Field         | Type                              |
| ------------- | --------------------------------- |
| `id`          | string                            |
| `kind`        | string                            |
| `style?`      | string                            |
| `props?`      | map of any                        |
| `lockAspect?` | boolean                           |
| `size?`       | { width: number, height: number } |
| `overrides?`  | [Style2D](#style2d)               |
| `parts?`      | string                            |

### Scene.Object3D

A reusable 3D object, with no position.

| Field         | Type                     |
| ------------- | ------------------------ |
| `id`          | string                   |
| `kind`        | string                   |
| `style?`      | string                   |
| `props?`      | map of any               |
| `lockAspect?` | boolean                  |
| `scale?`      | [Scene.Vec3](#scenevec3) |
| `overrides?`  | [Style3D](#style3d)      |
| `parts?`      | string                   |

### Scene.StoredObject2D

A 2D object as a `Model2D` stores it. Extends [Scene.Object2D](#sceneobject2d).

| Field    | Type              |
| -------- | ----------------- |
| `parts?` | ref to any object |

### Scene.StoredObject3D

A 3D object as a `Model3D` stores it. Extends [Scene.Object3D](#sceneobject3d).

| Field    | Type              |
| -------- | ----------------- |
| `parts?` | ref to any object |

## Elements

An element is one stored record of a layout, in either dimension.

### Scene.BaseElement

The fields every element has, in either dimension.

| Field        | Type                                   |
| ------------ | -------------------------------------- |
| `id`         | string                                 |
| `object?`    | string                                 |
| `kind?`      | string                                 |
| `z?`         | string                                 |
| `layer?`     | string                                 |
| `hidden?`    | boolean                                |
| `locked?`    | boolean                                |
| `label?`     | string                                 |
| `style?`     | string                                 |
| `source?`    | [ElementEndpoint](#elementendpoint)    |
| `target?`    | [ElementEndpoint](#elementendpoint)    |
| `pinned?`    | boolean                                |
| `constrain?` | [PartLayout](#partlayout)              |
| `composite?` | string                                 |
| `dsl?`       | [Scene.DslIdentity](#scenedslidentity) |
| `data?`      | map of any                             |
| `props?`     | map of any                             |

### Scene.Element2D

A 2D element. Extends [Scene.BaseElement](#scenebaseelement).

| Field            | Type                                                               |
| ---------------- | ------------------------------------------------------------------ |
| `center?`        | { x: number, y: number }                                           |
| `size?`          | { width: number, height: number }                                  |
| `rotation?`      | number                                                             |
| `scale?`         | { x: number, y: number }                                           |
| `fit?`           | [InstanceFit](#enums)                                              |
| `overrides?`     | [Style2D](#style2d)                                                |
| `ports?`         | [Port](#port)[]                                                    |
| `portsPerSide?`  | number                                                             |
| `exposed?`       | boolean                                                            |
| `bind?`          | string                                                             |
| `optional?`      | boolean                                                            |
| `grow?`          | string                                                             |
| `follows?`       | string                                                             |
| `partOverrides?` | map of map of unknown                                              |
| `parent?`        | string                                                             |
| `extent?`        | { width?: number, height?: number }                                |
| `path?`          | `line` `ortho` `curve` `spline` `smart`                            |
| `points?`        | [Point](#point)[]                                                  |
| `tail?`          | `arrow` `circle` `diamond` `diamond-filled` `crowsfoot` `triangle` |
| `head?`          | `arrow` `circle` `diamond` `diamond-filled` `crowsfoot` `triangle` |
| `connector?`     | [DiagramConnector](#diagramconnector)                              |

### Scene.Element3D

A 3D element. Extends [Scene.BaseElement](#scenebaseelement).

| Field        | Type                     |
| ------------ | ------------------------ |
| `center?`    | [Scene.Vec3](#scenevec3) |
| `scale?`     | [Scene.Vec3](#scenevec3) |
| `rotation?`  | [Scene.Vec3](#scenevec3) |
| `fit?`       | [InstanceFit](#enums)    |
| `overrides?` | [Style3D](#style3d)      |

### Scene.ElementRecord2D

A 2D element as a layout stores it: the element, and its kind's own fields beside it.

| Field            | Type                                                               |
| ---------------- | ------------------------------------------------------------------ |
| `id`             | string                                                             |
| `object?`        | string                                                             |
| `kind?`          | string                                                             |
| `z?`             | string                                                             |
| `layer?`         | string                                                             |
| `hidden?`        | boolean                                                            |
| `locked?`        | boolean                                                            |
| `label?`         | string                                                             |
| `style?`         | string                                                             |
| `source?`        | [ElementEndpoint](#elementendpoint)                                |
| `target?`        | [ElementEndpoint](#elementendpoint)                                |
| `pinned?`        | boolean                                                            |
| `constrain?`     | [PartLayout](#partlayout)                                          |
| `composite?`     | string                                                             |
| `dsl?`           | [Scene.DslIdentity](#scenedslidentity)                             |
| `data?`          | map of any                                                         |
| `props?`         | map of any                                                         |
| `center?`        | { x: number, y: number }                                           |
| `size?`          | { width: number, height: number }                                  |
| `rotation?`      | number                                                             |
| `scale?`         | { x: number, y: number }                                           |
| `fit?`           | [InstanceFit](#enums)                                              |
| `overrides?`     | [Style2D](#style2d)                                                |
| `ports?`         | [Port](#port)[]                                                    |
| `portsPerSide?`  | number                                                             |
| `exposed?`       | boolean                                                            |
| `bind?`          | string                                                             |
| `optional?`      | boolean                                                            |
| `grow?`          | string                                                             |
| `follows?`       | string                                                             |
| `partOverrides?` | map of map of unknown                                              |
| `parent?`        | string                                                             |
| `extent?`        | { width?: number, height?: number }                                |
| `path?`          | `line` `ortho` `curve` `spline` `smart`                            |
| `points?`        | [Point](#point)[]                                                  |
| `tail?`          | `arrow` `circle` `diamond` `diamond-filled` `crowsfoot` `triangle` |
| `head?`          | `arrow` `circle` `diamond` `diamond-filled` `crowsfoot` `triangle` |
| `connector?`     | [DiagramConnector](#diagramconnector)                              |

### Scene.ElementRecord3D

A 3D element as a layout stores it.

| Field        | Type                                   |
| ------------ | -------------------------------------- |
| `id`         | string                                 |
| `object?`    | string                                 |
| `kind?`      | string                                 |
| `z?`         | string                                 |
| `layer?`     | string                                 |
| `hidden?`    | boolean                                |
| `locked?`    | boolean                                |
| `label?`     | string                                 |
| `style?`     | string                                 |
| `source?`    | [ElementEndpoint](#elementendpoint)    |
| `target?`    | [ElementEndpoint](#elementendpoint)    |
| `pinned?`    | boolean                                |
| `constrain?` | [PartLayout](#partlayout)              |
| `composite?` | string                                 |
| `dsl?`       | [Scene.DslIdentity](#scenedslidentity) |
| `data?`      | map of any                             |
| `props?`     | map of any                             |
| `center?`    | [Scene.Vec3](#scenevec3)               |
| `scale?`     | [Scene.Vec3](#scenevec3)               |
| `rotation?`  | [Scene.Vec3](#scenevec3)               |
| `fit?`       | [InstanceFit](#enums)                  |
| `overrides?` | [Style3D](#style3d)                    |

### ElementEndpoint

A link's end as an element stores it.

| Field    | Type            |
| -------- | --------------- |
| `node?`  | string          |
| `port?`  | string          |
| `point?` | [Point](#point) |

### Scene.DslIdentity

The DSL statement that made an element.

| Field     | Type   |
| --------- | ------ |
| `object`  | string |
| `element` | string |
| `part?`   | string |
| `ref?`    | string |
| `index?`  | string |
| `portal?` | string |

### PartLayout

How a part of a composite follows its frame on each axis.

| Field | Type                     |
| ----- | ------------------------ |
| `x?`  | [PartConstraint](#enums) |
| `y?`  | [PartConstraint](#enums) |

### Scene.Vec3

A 3D vector.

| Field | Type   |
| ----- | ------ |
| `x`   | number |
| `y`   | number |
| `z`   | number |

## Nodes

A node is the typed form of a 2D element that is not a link, one schema per kind.

### NodeBase

The fields every node kind shares.

| Field            | Type                                | Notes       |
| ---------------- | ----------------------------------- | ----------- |
| `kind`           | string                              |             |
| `id`             | string                              |             |
| `z`              | string                              |             |
| `locked?`        | boolean                             |             |
| `center`         | [Point](#point)                     |             |
| `size`           | [Size](#size)                       |             |
| `rotation?`      | number                              | -360 to 360 |
| `ports?`         | [Port](#port)[]                     |             |
| `portsPerSide?`  | number                              |             |
| `layer?`         | string                              |             |
| `style?`         | string                              |             |
| `overrides?`     | [Style2D](#style2d)                 |             |
| `exposed?`       | boolean                             |             |
| `bind?`          | string                              |             |
| `optional?`      | boolean                             |             |
| `hidden?`        | boolean                             |             |
| `grow?`          | string                              |             |
| `follows?`       | string                              |             |
| `composite?`     | string                              |             |
| `partOverrides?` | map of map of unknown               |             |
| `parent?`        | string                              |             |
| `extent?`        | { width?: number, height?: number } |             |
| `constrain?`     | [PartLayout](#partlayout)           |             |

### BaseNode

A node whose kind is not known here: a box with a label. Extends [NodeBase](#nodebase).

| Field    | Type   |
| -------- | ------ |
| `label?` | string |

### RectNode

A rectangle. Extends [NodeBase](#nodebase).

| Field      | Type                |
| ---------- | ------------------- |
| `kind`     | `rect`              |
| `label?`   | string              |
| `padding?` | [Padding](#padding) |

### EllipseNode

An ellipse inscribed in the frame. Extends [NodeBase](#nodebase).

| Field      | Type                |
| ---------- | ------------------- |
| `kind`     | `ellipse`           |
| `label?`   | string              |
| `padding?` | [Padding](#padding) |

### CloudNode

A cloud filling the frame. Extends [NodeBase](#nodebase).

| Field      | Type                        |
| ---------- | --------------------------- |
| `kind`     | `cloud`                     |
| `label?`   | string                      |
| `padding?` | [Padding](#padding)         |
| `params?`  | [CloudParams](#cloudparams) |

### CloudParams

A cloud's own settings.

| Field    | Type    | Notes   |
| -------- | ------- | ------- |
| `bumps?` | integer | 3 to 24 |

### PolygonNode

A regular polygon. Extends [NodeBase](#nodebase).

| Field      | Type                            |
| ---------- | ------------------------------- |
| `kind`     | `polygon`                       |
| `label?`   | string                          |
| `padding?` | [Padding](#padding)             |
| `params?`  | [PolygonParams](#polygonparams) |

### PolygonParams

A polygon's own settings.

| Field    | Type             | Notes   |
| -------- | ---------------- | ------- |
| `sides?` | integer          | 3 to 24 |
| `fit?`   | `frame` `circle` |         |

### ShapeNode

A shape that a named recipe draws from the frame and parameters. Extends [NodeBase](#nodebase).

| Field      | Type                |
| ---------- | ------------------- |
| `kind`     | `shape`             |
| `label?`   | string              |
| `padding?` | [Padding](#padding) |
| `recipe`   | string              |
| `params?`  | map of number       |

### PolylineNode

A line through points, in the 0 to 1 space of its frame. Extends [NodeBase](#nodebase).

| Field      | Type                              |
| ---------- | --------------------------------- |
| `kind`     | `polyline`                        |
| `label?`   | string                            |
| `padding?` | [Padding](#padding)               |
| `points`   | [Point](#point)[]                 |
| `bends?`   | [PolylineBend](#polylinebend)[]   |
| `params?`  | [PolylineParams](#polylineparams) |

### PolylineParams

A polyline's own settings.

| Field     | Type    |
| --------- | ------- |
| `closed?` | boolean |
| `smooth?` | boolean |

### PolylineBend

A segment of a polyline that runs as a curve.

| Field     | Type            |
| --------- | --------------- |
| `segment` | number          |
| `control` | [Point](#point) |
| `second?` | [Point](#point) |

### HullNode

A border drawn round the nodes that name it as their parent. Extends [NodeBase](#nodebase).

| Field      | Type                | Notes      |
| ---------- | ------------------- | ---------- |
| `kind`     | `hull`              |            |
| `label?`   | string              |            |
| `padding?` | [Padding](#padding) |            |
| `shape?`   | `perimeter` `box`   |            |
| `inset?`   | integer             | At least 0 |
| `points?`  | [Point](#point)[]   |            |
| `group?`   | string              |            |

### NoteNode

Free text. Extends [NodeBase](#nodebase).

| Field      | Type                |
| ---------- | ------------------- |
| `kind`     | `note`              |
| `padding?` | [Padding](#padding) |
| `label`    | string              |

### ViewNode

A window onto a child view. Extends [NodeBase](#nodebase).

| Field    | Type                  |
| -------- | --------------------- |
| `kind`   | `view`                |
| `label?` | string                |
| `scene`  | string                |
| `link?`  | [ViewLink](#viewlink) |
| `frame?` | [Bounds](#bounds)     |

### ViewLink

How a view node shows what it links to.

| Field       | Type    |
| ----------- | ------- |
| `contents?` | boolean |

### InstanceNode

A composite object placed in a scene. Extends [NodeBase](#nodebase).

| Field        | Type                  |
| ------------ | --------------------- |
| `kind`       | `instance`            |
| `composite`  | string                |
| `fit?`       | [InstanceFit](#enums) |
| `frame?`     | [Bounds](#bounds)     |
| `hull?`      | `perimeter` `box`     |
| `hullInset?` | number                |

### PathNode

A vector shape from SVG path data. Extends [NodeBase](#nodebase).

| Field     | Type              |
| --------- | ----------------- |
| `kind`    | `path`            |
| `d`       | string            |
| `viewBox` | [Bounds](#bounds) |

### GeneratorNode

A node whose content a generator computes. Extends [NodeBase](#nodebase).

| Field       | Type           |
| ----------- | -------------- |
| `kind`      | `generator`    |
| `generator` | string         |
| `params?`   | map of unknown |
| `seed?`     | number         |

### DiagramNode

A shape of a laid-out diagram. Extends [NodeBase](#nodebase).

| Field      | Type                              |
| ---------- | --------------------------------- |
| `kind`     | `diagram`                         |
| `label?`   | string                            |
| `element`  | [DiagramShape](#diagramshape)     |
| `heading?` | [DiagramHeading](#diagramheading) |

### DiagramHeading

Where a diagram shape's heading sits.

| Field     | Type             |
| --------- | ---------------- |
| `id`      | string           |
| `x`       | number           |
| `y`       | number           |
| `w?`      | number           |
| `color?`  | [Color](#color)  |
| `weight?` | [Weight](#enums) |

### DiagramShape

The diagram shapes a diagram node can hold.

One of [Shape.Box](#shapebox), [Shape.Circle](#shapecircle), [Shape.Text](#shapetext), [Shape.Portal](#shapeportal).

### BuiltinNode

Any node kind this package defines.

One of [RectNode](#rectnode), [EllipseNode](#ellipsenode), [CloudNode](#cloudnode), [PolygonNode](#polygonnode), [ShapeNode](#shapenode), [PolylineNode](#polylinenode), [HullNode](#hullnode), [NoteNode](#notenode), [ViewNode](#viewnode), [InstanceNode](#instancenode), [PathNode](#pathnode), [GeneratorNode](#generatornode), [DiagramNode](#diagramnode).

### Port

An attachment point on a node, as a fraction of its frame.

| Field      | Type                    |
| ---------- | ----------------------- |
| `id`       | string                  |
| `x`        | number                  |
| `y`        | number                  |
| `side?`    | [Side](#enums)          |
| `accepts?` | [PortDirection](#enums) |

### Padding

Space between a shape's frame and its text.

| Field | Type   |
| ----- | ------ |
| `x?`  | number |
| `y?`  | number |

## Links

A link is the typed form of a 2D element that joins two ends.

### Link

A link between two ends.

| Field        | Type                                                               |
| ------------ | ------------------------------------------------------------------ |
| `kind`       | `link`                                                             |
| `id`         | string                                                             |
| `z`          | string                                                             |
| `locked?`    | boolean                                                            |
| `source`     | [Endpoint](#endpoint)                                              |
| `target`     | [Endpoint](#endpoint)                                              |
| `path?`      | `line` `ortho` `curve` `spline` `smart`                            |
| `points?`    | [Point](#point)[]                                                  |
| `tail?`      | `arrow` `circle` `diamond` `diamond-filled` `crowsfoot` `triangle` |
| `head?`      | `arrow` `circle` `diamond` `diamond-filled` `crowsfoot` `triangle` |
| `label?`     | string                                                             |
| `layer?`     | string                                                             |
| `style?`     | string                                                             |
| `overrides?` | [LineStyle](#linestyle)                                            |
| `connector?` | [DiagramConnector](#diagramconnector)                              |
| `constrain?` | [PartLayout](#partlayout)                                          |

### Endpoint

A link's end: on a node, or free at a point.

One of [PortEndpoint](#portendpoint), [PointEndpoint](#pointendpoint).

### PortEndpoint

A link end on a node.

| Field   | Type   |
| ------- | ------ |
| `node`  | string |
| `port?` | string |

### PointEndpoint

A free link end at a point.

| Field   | Type            |
| ------- | --------------- |
| `point` | [Point](#point) |

### DiagramConnector

A link drawn as a diagram connector.

| Field       | Type                              |
| ----------- | --------------------------------- |
| `relation?` | [Shape.Relation](#enums)          |
| `head?`     | [Shape.ArrowHead](#enums)         |
| `tail?`     | [Shape.ArrowTail](#enums)         |
| `stroke?`   | [Stroke](#enums)                  |
| `color?`    | [Color](#color)                   |
| `route?`    | [Point](#point)[]                 |
| `caption?`  | [DiagramCaption](#diagramcaption) |

### DiagramCaption

Where a diagram connector's caption sits.

| Field     | Type             |
| --------- | ---------------- |
| `x`       | number           |
| `y`       | number           |
| `w?`      | number           |
| `color?`  | [Color](#color)  |
| `weight?` | [Weight](#enums) |

## Styles

A style is the look an element takes, by name or as its own overrides.

### LineStyle

A link's style.

| Field       | Type             |
| ----------- | ---------------- |
| `color?`    | string           |
| `stroke?`   | [Stroke](#enums) |
| `fontSize?` | number           |

### Style2D

A 2D look: what a node draws with. Extends [LineStyle](#linestyle).

| Field        | Type                    | Notes  |
| ------------ | ----------------------- | ------ |
| `opacity?`   | number                  | 0 to 1 |
| `fill?`      | [Fill](#enums)          |        |
| `corners?`   | [Corners](#enums)       |        |
| `weight?`    | [Weight](#enums)        |        |
| `guide?`     | boolean                 |        |
| `font?`      | [Font](#font)           |        |
| `textColor?` | string                  |        |
| `align?`     | [Align](#enums)         |        |
| `valign?`    | [VerticalAlign](#enums) |        |

### Style3D

A 3D look: a material over a colour.

| Field        | Type              |
| ------------ | ----------------- |
| `color?`     | string            |
| `fill?`      | [Fill](#enums)    |
| `stroke?`    | [Stroke](#enums)  |
| `corners?`   | [Corners](#enums) |
| `opacity?`   | number            |
| `metalness?` | number            |
| `roughness?` | number            |
| `emissive?`  | number            |

### NamedStyle2D

A model's named 2D style. Extends [Style2D](#style2d).

| Field   | Type   |
| ------- | ------ |
| `name?` | string |

### NamedStyle3D

A model's named 3D style. Extends [Style3D](#style3d).

| Field   | Type   |
| ------- | ------ |
| `name?` | string |

### StyleClass

A named look that nodes and links take their style from.

| Field    | Type                |
| -------- | ------------------- |
| `id`     | string              |
| `name`   | string              |
| `style?` | [Style2D](#style2d) |

### StyleCatalog

A reusable set of styles, as an ECHO object. ECHO type `org.dxos.type.scene.styleCatalog`, version 0.2.0.

| Field    | Type                                 |
| -------- | ------------------------------------ |
| `key`    | string                               |
| `name`   | string                               |
| `dim`    | `2d` `3d`                            |
| `styles` | map of [CatalogStyle](#catalogstyle) |
| `id`     | string                               |

### CatalogStyle

One style of a catalog: the 2D and 3D fields in one struct.

| Field        | Type                    | Notes  |
| ------------ | ----------------------- | ------ |
| `color?`     | string                  |        |
| `fill?`      | [Fill](#enums)          |        |
| `stroke?`    | [Stroke](#enums)        |        |
| `corners?`   | [Corners](#enums)       |        |
| `opacity?`   | number                  | 0 to 1 |
| `metalness?` | number                  |        |
| `roughness?` | number                  |        |
| `emissive?`  | number                  |        |
| `weight?`    | [Weight](#enums)        |        |
| `guide?`     | boolean                 |        |
| `font?`      | [Font](#font)           |        |
| `fontSize?`  | number                  |        |
| `textColor?` | string                  |        |
| `align?`     | [Align](#enums)         |        |
| `valign?`    | [VerticalAlign](#enums) |        |

## Theme

A theme fills the slots a style names: its colours and its typefaces.

### ThemeSlots

The colours and typefaces a theme defines, by name.

| Field     | Type                   |
| --------- | ---------------------- |
| `colors?` | map of [Color](#color) |
| `fonts?`  | map of string          |

### Font

A typeface slot of the theme: `body`, `mono`, or one the theme defines.

Type: string.

## Vocabulary

The geometry and the style values that every part of a drawing states in the same words.

### Color

A colour: a theme name (`blue`, `accent`), a name at a tone (`blue/2`), or a CSS literal (`#1e90ff`).

Type: string.

### Point

A point.

| Field | Type   |
| ----- | ------ |
| `x`   | number |
| `y`   | number |

### Size

A size.

| Field    | Type   |
| -------- | ------ |
| `width`  | number |
| `height` | number |

### Bounds

A rectangle by its top-left corner and size.

| Field    | Type   |
| -------- | ------ |
| `x`      | number |
| `y`      | number |
| `width`  | number |
| `height` | number |

## Diagram shapes

A diagram shape is a primitive of the diagram DSL, stored inside a `diagram` node.

### ShapeBase

The id and style fields every diagram shape shares.

| Field       | Type                    | Notes                                                         |
| ----------- | ----------------------- | ------------------------------------------------------------- |
| `id`        | string                  | Stable element id, unique within the object (e.g. "left-eye") |
| `color?`    | [Color](#color)         | Stroke/text color                                             |
| `fill?`     | [Fill](#enums)          | Interior fill of closed shapes                                |
| `stroke?`   | [Stroke](#enums)        | Line or outline                                               |
| `weight?`   | [Weight](#enums)        | Stroke weight / text size                                     |
| `align?`    | [Align](#enums)         | Where the shape's text sits across it                         |
| `valign?`   | [VerticalAlign](#enums) | Where the shape's text sits down it                           |
| `fontSize?` | number                  | Text size in scene units                                      |

### Shape.Box

A closed shape in a bounding box. Extends [ShapeBase](#shapebase).

| Field             | Type                    | Notes                                     |
| ----------------- | ----------------------- | ----------------------------------------- |
| `kind`            | [Shape.BoxKind](#enums) |                                           |
| `x`               | number                  | Left edge (object-local units)            |
| `y`               | number                  | Top edge (object-local units)             |
| `w`               | number                  |                                           |
| `h`               | number                  |                                           |
| `rotation?`       | number                  | Clockwise rotation in degrees             |
| `text?`           | string                  | Centered label                            |
| `corners?`        | [Corners](#enums)       | Rects only                                |
| `component?`      | string                  | A contributed element kind's name         |
| `data?`           | map of any              | A contributed kind's own fields           |
| `cols?`           | number or string        | Column tracks                             |
| `rows?`           | number or string        | Row tracks                                |
| `gap?`            | number                  | Space between two cells                   |
| `padding?`        | number                  | Space inside the grid's frame             |
| `autoCols?`       | number or string        | Size of each implicit column track        |
| `autoRows?`       | number or string        | Size of each implicit row track           |
| `justifyContent?` | [Shape.Place](#enums)   | Where the columns sit across the frame    |
| `alignContent?`   | [Shape.Place](#enums)   | Where the rows sit down the frame         |
| `layout?`         | [Shape.Layout](#enums)  | How the box places its children           |
| `packSeed?`       | number                  | A packing's seed                          |
| `packMin?`        | number                  | Smallest packed child                     |
| `packMax?`        | number                  | Largest packed child                      |
| `parent?`         | string                  | The grid that places this box             |
| `width?`          | number                  | Width the box keeps inside its grid cell  |
| `height?`         | number                  | Height the box keeps inside its grid cell |

### Shape.Circle

A circle. Extends [ShapeBase](#shapebase).

| Field   | Type     | Notes                         |
| ------- | -------- | ----------------------------- |
| `kind`  | `circle` |                               |
| `cx`    | number   | Center x (object-local units) |
| `cy`    | number   | Center y (object-local units) |
| `r`     | number   |                               |
| `text?` | string   |                               |

### Shape.Polyline

A straight segment or a polyline. Extends [ShapeBase](#shapebase).

| Field     | Type              | Notes                                                        |
| --------- | ----------------- | ------------------------------------------------------------ |
| `kind`    | `line`            |                                                              |
| `points`  | [Point](#point)[] | Two or more points (object-local units)                      |
| `closed?` | boolean           | Close the path back to the first point                       |
| `guide?`  | boolean           | A guide (lifeline, divider, outline) rather than a connector |

### Shape.Curve

A smooth curve through points. Extends [ShapeBase](#shapebase).

| Field    | Type              | Notes                                   |
| -------- | ----------------- | --------------------------------------- |
| `kind`   | `curve`           |                                         |
| `points` | [Point](#point)[] | Control points the curve passes through |

### Shape.Arc

A circular arc. Angles are in degrees. Extends [ShapeBase](#shapebase).

| Field        | Type   |
| ------------ | ------ |
| `kind`       | `arc`  |
| `cx`         | number |
| `cy`         | number |
| `r`          | number |
| `startAngle` | number |
| `endAngle`   | number |

### Shape.Text

Free-standing text. Extends [ShapeBase](#shapebase).

| Field  | Type   | Notes      |
| ------ | ------ | ---------- |
| `kind` | `text` |            |
| `x`    | number |            |
| `y`    | number |            |
| `w?`   | number | Wrap width |
| `text` | string |            |

### Shape.Arrow

A connector between two elements or points. Extends [ShapeBase](#shapebase).

| Field       | Type                      | Notes                                                     |
| ----------- | ------------------------- | --------------------------------------------------------- |
| `kind`      | `arrow`                   |                                                           |
| `from?`     | string                    | Source element ref, optionally `#port`                    |
| `to?`       | string                    | Target element ref, optionally `#port`                    |
| `start?`    | [Point](#point)           | Explicit start (used when `from` is omitted)              |
| `end?`      | [Point](#point)           | Explicit end (used when `to` is omitted)                  |
| `text?`     | string                    | Label at the arrow midpoint                               |
| `head?`     | [Shape.ArrowHead](#enums) | Marker at the target end (default arrow)                  |
| `tail?`     | [Shape.ArrowTail](#enums) | Marker at the source end (default none)                   |
| `route?`    | [Point](#point)[]         | The connector's route, ends included                      |
| `path?`     | [Shape.Path](#enums)      | How the connector runs between its ends (default `smart`) |
| `relation?` | [Shape.Relation](#enums)  | What the connector means                                  |

### Shape.Portal

A window onto another drawing. Extends [ShapeBase](#shapebase).

| Field   | Type     | Notes                            |
| ------- | -------- | -------------------------------- |
| `kind`  | `portal` |                                  |
| `x`     | number   | Left edge (object-local units)   |
| `y`     | number   | Top edge (object-local units)    |
| `w`     | number   |                                  |
| `h`     | number   |                                  |
| `ref`   | string   | The drawing shown inside the box |
| `text?` | string   | Title shown on the frame         |

### Shape.Element

Any diagram shape.

One of [Shape.Box](#shapebox), [Shape.Circle](#shapecircle), [Shape.Polyline](#shapepolyline), [Shape.Curve](#shapecurve), [Shape.Arc](#shapearc), [Shape.Text](#shapetext), [Shape.Arrow](#shapearrow), [Shape.Portal](#shapeportal).

## Enums

Each enum is a set of literal values.

| Name               | Values                                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `Scene.LayoutKind` | `view` `composite`                                                                                                 |
| `Scene.Placement`  | `right-of` `left-of` `above` `below` `aligned`                                                                     |
| `PartConstraint`   | `min` `max` `stretch` `center` `scale`                                                                             |
| `InstanceFit`      | `fit` `fill` `none`                                                                                                |
| `Scene.Dimension`  | `2d` `3d`                                                                                                          |
| `PortDirection`    | `in` `out` `any`                                                                                                   |
| `LinkPath`         | `line` `ortho` `curve` `spline` `smart`                                                                            |
| `Marker`           | `arrow` `circle` `diamond` `diamond-filled` `crowsfoot` `triangle`                                                 |
| `StyleHue`         | `neutral` `red` `orange` `amber` `green` `teal` `sky` `blue` `violet`                                              |
| `NodeTone`         | `0` `1` `2` `3`                                                                                                    |
| `TextTone`         | `1` `2` `3`                                                                                                        |
| `Side`             | `top` `right` `bottom` `left`                                                                                      |
| `Stroke`           | `none` `solid` `dashed` `dotted` `sketchy`                                                                         |
| `Fill`             | `none` `solid` `tint` `pattern` `glass`                                                                            |
| `Corners`          | `all` `top` `bottom` `none`                                                                                        |
| `Weight`           | `s` `m` `l` `xl`                                                                                                   |
| `Align`            | `left` `center` `right`                                                                                            |
| `VerticalAlign`    | `top` `middle` `bottom`                                                                                            |
| `Shape.BoxKind`    | `rect` `ellipse` `diamond` `triangle` `grid`                                                                       |
| `Shape.Layout`     | `tracks` `pack`                                                                                                    |
| `Shape.Place`      | `start` `center` `end`                                                                                             |
| `Shape.Path`       | `smart` `ortho` `line` `curve`                                                                                     |
| `Shape.ArrowHead`  | `arrow` `triangle` `crowsfoot` `none`                                                                              |
| `Shape.ArrowTail`  | `none` `circle` `arrow`                                                                                            |
| `Shape.Relation`   | `association` `dependency` `inheritance` `implementation` `composition` `aggregation` `one-to-many` `many-to-many` |

## Other kinds

These element kinds have no schema in `@dxos/scene`. An element of one carries the base fields, and the package
named draws it and defines any fields of its own.

| Kind       | Dimension | Package                 |
| ---------- | --------- | ----------------------- |
| `link`     | 2D and 3D | `@dxos/react-ui-canvas` |
| `label`    | 2D and 3D | `@dxos/react-ui-canvas` |
| `group`    | 2D and 3D | `@dxos/react-ui-canvas` |
| `card`     | 2D        | `@dxos/react-ui-canvas` |
| `icon`     | 2D        | `@dxos/react-ui-canvas` |
| `solid`    | 2D and 3D | `@dxos/react-ui-canvas` |
| `image`    | 2D        | `@dxos/plugin-canvas`   |
| `graph`    | 2D        | `@dxos/plugin-canvas`   |
| `cube`     | 3D        | `@dxos/react-ui-canvas` |
| `sphere`   | 3D        | `@dxos/react-ui-canvas` |
| `cylinder` | 3D        | `@dxos/react-ui-canvas` |
| `cone`     | 3D        | `@dxos/react-ui-canvas` |
| `pyramid`  | 3D        | `@dxos/react-ui-canvas` |
| `mesh`     | 3D        | `@dxos/react-ui-canvas` |
