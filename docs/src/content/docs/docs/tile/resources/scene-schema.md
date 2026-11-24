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
| `center` | [Scene.Vec2](#scenevec2) |
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

| Field          | Type                                                                |
| -------------- | ------------------------------------------------------------------- |
| `id`           | string                                                              |
| `dim`          | `2d`                                                                |
| `name?`        | string                                                              |
| `model?`       | string                                                              |
| `elements`     | map of [Scene.Element2D](#sceneelement2d) and the kind's own fields |
| `styles?`      | map of [Style2D](#style2d)                                          |
| `layers?`      | map of [Layer](#layer)                                              |
| `kind?`        | [Scene.LayoutKind](#enums)                                          |
| `anonymous?`   | boolean                                                             |
| `arrange?`     | [Scene.Arrangement](#scenearrangement)                              |
| `props?`       | map of any                                                          |
| `grid?`        | [Scene.GridPitch](#scenegridpitch)                                  |
| `lattice?`     | [Scene.Lattice](#scenelattice)                                      |
| `constraints?` | [Scene.Constraint](#sceneconstraint)[]                              |

### Scene.LayoutRecord3D

A 3D layout as plain data. As [Scene.LayoutRecord2D](#scenelayoutrecord2d), without `grid`, `lattice`, `constraints`.

| Field      | Type                                                                |
| ---------- | ------------------------------------------------------------------- |
| `dim`      | `3d`                                                                |
| `elements` | map of [Scene.Element3D](#sceneelement3d) and the kind's own fields |
| `styles?`  | map of [Style3D](#style3d)                                          |

### Scene.Layout2D

A 2D layout as an ECHO object. ECHO type `org.dxos.type.scene.layout2d`, version 0.1.0. As [Scene.LayoutRecord2D](#scenelayoutrecord2d), without `dim`.

| Field    | Type              |
| -------- | ----------------- |
| `key`    | string            |
| `model?` | ref to any object |

### Scene.Layout3D

A 3D layout as an ECHO object. ECHO type `org.dxos.type.scene.layout3d`, version 0.1.0. As [Scene.LayoutRecord3D](#scenelayoutrecord3d), without `dim`.

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

| Field      | Type                                    |
| ---------- | --------------------------------------- |
| `subject`  | string                                  |
| `relation` | `east` `west` `north` `south` `aligned` |
| `object`   | string                                  |

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

A 2D model as an ECHO object. ECHO type `org.dxos.type.scene.model2d`, version 0.1.0. As [Scene.ModelRecord2D](#scenemodelrecord2d), without `dim`.

| Field       | Type                                                |
| ----------- | --------------------------------------------------- |
| `key`       | string                                              |
| `objects`   | map of [Scene.StoredObject2D](#scenestoredobject2d) |
| `catalogs?` | ref to [StyleCatalog](#stylecatalog)[]              |

### Scene.Model3D

A 3D model as an ECHO object. ECHO type `org.dxos.type.scene.model3d`, version 0.1.0. As [Scene.ModelRecord3D](#scenemodelrecord3d), without `dim`.

| Field       | Type                                                |
| ----------- | --------------------------------------------------- |
| `key`       | string                                              |
| `objects`   | map of [Scene.StoredObject3D](#scenestoredobject3d) |
| `catalogs?` | ref to [StyleCatalog](#stylecatalog)[]              |

### Scene.Object2D

A reusable 2D object, with no position.

| Field         | Type                       |
| ------------- | -------------------------- |
| `id`          | string                     |
| `type`        | string                     |
| `style?`      | string                     |
| `props?`      | map of any                 |
| `lockAspect?` | boolean                    |
| `size?`       | [Scene.Size2](#scenesize2) |
| `overrides?`  | [Style2D](#style2d)        |
| `parts?`      | string                     |

### Scene.Object3D

A reusable 3D object, with no position.

| Field         | Type                     |
| ------------- | ------------------------ |
| `id`          | string                   |
| `type`        | string                   |
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
| `type?`      | string                                 |
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

| Field        | Type                        |
| ------------ | --------------------------- |
| `center?`    | [Scene.Vec2](#scenevec2)    |
| `size?`      | [Scene.Size2](#scenesize2)  |
| `rotation?`  | number                      |
| `scale?`     | [Scene.Vec2](#scenevec2)    |
| `fit?`       | [Scene.InstanceFit](#enums) |
| `overrides?` | [Style2D](#style2d)         |

### Scene.Element3D

A 3D element. Extends [Scene.BaseElement](#scenebaseelement).

| Field        | Type                        |
| ------------ | --------------------------- |
| `center?`    | [Scene.Vec3](#scenevec3)    |
| `scale?`     | [Scene.Vec3](#scenevec3)    |
| `rotation?`  | [Scene.Vec3](#scenevec3)    |
| `fit?`       | [Scene.InstanceFit](#enums) |
| `overrides?` | [Style3D](#style3d)         |

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

### Scene.Vec2

A 2D vector.

| Field | Type   |
| ----- | ------ |
| `x`   | number |
| `y`   | number |

### Scene.Vec3

A 3D vector.

| Field | Type   |
| ----- | ------ |
| `x`   | number |
| `y`   | number |
| `z`   | number |

### Scene.Size2

A 2D size.

| Field    | Type   |
| -------- | ------ |
| `width`  | number |
| `height` | number |

## Nodes

A node is the typed form of a 2D element that is not a link, one schema per kind.

### NodeBase

The fields every node kind shares.

| Field           | Type                                | Notes       |
| --------------- | ----------------------------------- | ----------- |
| `type`          | string                              |             |
| `id`            | string                              |             |
| `z`             | string                              |             |
| `locked?`       | boolean                             |             |
| `center`        | [Point](#point)                     |             |
| `size`          | [Size](#size)                       |             |
| `rotation?`     | number                              | -360 to 360 |
| `ports?`        | [Port](#port)[]                     |             |
| `portsPerSide?` | number                              |             |
| `layer?`        | string                              |             |
| `class?`        | string                              |             |
| `style?`        | [NodeStyle](#nodestyle)             |             |
| `exposed?`      | boolean                             |             |
| `bind?`         | string                              |             |
| `optional?`     | boolean                             |             |
| `hidden?`       | boolean                             |             |
| `grow?`         | string                              |             |
| `follows?`      | string                              |             |
| `composite?`    | string                              |             |
| `overrides?`    | map of map of unknown               |             |
| `parent?`       | string                              |             |
| `extent?`       | { width?: number, height?: number } |             |
| `constrain?`    | [PartLayout](#partlayout)           |             |

### BaseNode

A node whose kind is not known here: a box with a label. Extends [NodeBase](#nodebase).

| Field    | Type   |
| -------- | ------ |
| `label?` | string |

### RectNode

A rectangle. Extends [NodeBase](#nodebase).

| Field      | Type                |
| ---------- | ------------------- |
| `type`     | `rect`              |
| `label?`   | string              |
| `padding?` | [Padding](#padding) |

### EllipseNode

An ellipse inscribed in the frame. Extends [NodeBase](#nodebase).

| Field      | Type                |
| ---------- | ------------------- |
| `type`     | `ellipse`           |
| `label?`   | string              |
| `padding?` | [Padding](#padding) |

### CloudNode

A cloud filling the frame. Extends [NodeBase](#nodebase).

| Field      | Type                        |
| ---------- | --------------------------- |
| `type`     | `cloud`                     |
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
| `type`     | `polygon`                       |
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
| `type`     | `shape`             |
| `label?`   | string              |
| `padding?` | [Padding](#padding) |
| `recipe`   | string              |
| `params?`  | map of number       |

### PolylineNode

A line through points, in the 0 to 1 space of its frame. Extends [NodeBase](#nodebase).

| Field      | Type                              |
| ---------- | --------------------------------- |
| `type`     | `polyline`                        |
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
| `type`     | `hull`              |            |
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
| `type`     | `note`              |
| `padding?` | [Padding](#padding) |
| `text`     | string              |

### ViewNode

A window onto a child view. Extends [NodeBase](#nodebase).

| Field    | Type                  |
| -------- | --------------------- |
| `type`   | `view`                |
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

| Field        | Type                |
| ------------ | ------------------- |
| `type`       | `instance`          |
| `composite`  | string              |
| `fit?`       | `fit` `fill` `none` |
| `frame?`     | [Bounds](#bounds)   |
| `hull?`      | `perimeter` `box`   |
| `hullInset?` | number              |

### PathNode

A vector shape from SVG path data. Extends [NodeBase](#nodebase).

| Field     | Type              |
| --------- | ----------------- |
| `type`    | `path`            |
| `d`       | string            |
| `viewBox` | [Bounds](#bounds) |
| `fill?`   | string            |

### GeneratorNode

A node whose content a generator computes. Extends [NodeBase](#nodebase).

| Field       | Type           |
| ----------- | -------------- |
| `type`      | `generator`    |
| `generator` | string         |
| `params?`   | map of unknown |
| `seed?`     | number         |

### DiagramNode

A shape of a laid-out diagram. Extends [NodeBase](#nodebase).

| Field      | Type                              |
| ---------- | --------------------------------- |
| `type`     | `diagram`                         |
| `label?`   | string                            |
| `element`  | [DiagramShape](#diagramshape)     |
| `heading?` | [DiagramHeading](#diagramheading) |

### DiagramHeading

Where a diagram shape's heading sits.

| Field     | Type                   |
| --------- | ---------------------- |
| `id`      | string                 |
| `x`       | number                 |
| `y`       | number                 |
| `w?`      | number                 |
| `color?`  | [Shape.Color](#enums)  |
| `weight?` | [Shape.Weight](#enums) |

### DiagramShape

The diagram shapes a diagram node can hold.

One of [Shape.Box](#shapebox), [Shape.Circle](#shapecircle), [Shape.Text](#shapetext), [Shape.Portal](#shapeportal).

### BuiltinNode

Any node kind this package defines.

One of [RectNode](#rectnode), [EllipseNode](#ellipsenode), [CloudNode](#cloudnode), [PolygonNode](#polygonnode), [ShapeNode](#shapenode), [PolylineNode](#polylinenode), [HullNode](#hullnode), [NoteNode](#notenode), [ViewNode](#viewnode), [InstanceNode](#instancenode), [PathNode](#pathnode), [GeneratorNode](#generatornode), [DiagramNode](#diagramnode).

### Port

An attachment point on a node's frame.

| Field      | Type                    |
| ---------- | ----------------------- |
| `id`       | string                  |
| `side`     | [Side](#enums)          |
| `offset`   | number                  |
| `accepts?` | [PortDirection](#enums) |

### Padding

Space between a shape's frame and its text.

| Field | Type   |
| ----- | ------ |
| `x?`  | number |
| `y?`  | number |

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

## Links

A link is the typed form of a 2D element that joins two ends.

### LinkBase

The fields every link kind shares.

| Field        | Type                                  |
| ------------ | ------------------------------------- |
| `type`       | string                                |
| `id`         | string                                |
| `z`          | string                                |
| `locked?`    | boolean                               |
| `source`     | [Endpoint](#endpoint)                 |
| `target`     | [Endpoint](#endpoint)                 |
| `ends?`      | [LinkEnds](#linkends)                 |
| `text?`      | string                                |
| `layer?`     | string                                |
| `class?`     | string                                |
| `style?`     | [LineStyle](#linestyle)               |
| `connector?` | [DiagramConnector](#diagramconnector) |
| `constrain?` | [PartLayout](#partlayout)             |

### LineLink

A straight link. Extends [LinkBase](#linkbase).

| Field  | Type   |
| ------ | ------ |
| `type` | `line` |

### OrthoLink

A link of horizontal and vertical segments. Extends [LinkBase](#linkbase).

| Field  | Type    |
| ------ | ------- |
| `type` | `ortho` |

### CurveLink

A cubic curve that leaves each port along its normal. Extends [LinkBase](#linkbase).

| Field  | Type    |
| ------ | ------- |
| `type` | `curve` |

### SplineLink

A smooth curve through control points. Extends [LinkBase](#linkbase).

| Field    | Type              |
| -------- | ----------------- |
| `type`   | `spline`          |
| `points` | [Point](#point)[] |

### SmartLink

A link that is routed between its ends. Extends [LinkBase](#linkbase).

| Field  | Type    |
| ------ | ------- |
| `type` | `smart` |

### Link

Any link kind.

One of [LineLink](#linelink), [OrthoLink](#ortholink), [CurveLink](#curvelink), [SplineLink](#splinelink), [SmartLink](#smartlink).

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

### LinkEnds

The markers at the two ends of a link.

| Field    | Type             |
| -------- | ---------------- |
| `start?` | [Marker](#enums) |
| `end?`   | [Marker](#enums) |

### DiagramConnector

A link drawn as a diagram connector.

| Field       | Type                              |
| ----------- | --------------------------------- |
| `relation?` | [Shape.Relation](#enums)          |
| `head?`     | [Shape.ArrowHead](#enums)         |
| `tail?`     | [Shape.ArrowTail](#enums)         |
| `stroke?`   | [Shape.Stroke](#enums)            |
| `color?`    | [Shape.Color](#enums)             |
| `route?`    | [Point](#point)[]                 |
| `caption?`  | [DiagramCaption](#diagramcaption) |

### DiagramCaption

Where a diagram connector's caption sits.

| Field     | Type                   |
| --------- | ---------------------- |
| `x`       | number                 |
| `y`       | number                 |
| `w?`      | number                 |
| `color?`  | [Shape.Color](#enums)  |
| `weight?` | [Shape.Weight](#enums) |

## Styles

A style is the look an element takes, by name or as its own overrides.

### LineStyle

A link's style.

| Field        | Type                      |
| ------------ | ------------------------- |
| `hue?`       | string                    |
| `lineStyle?` | `solid` `dashed` `dotted` |
| `fontSize?`  | number                    |

### NodeStyle

A node's style. Extends [LineStyle](#linestyle).

| Field              | Type                    | Notes  |
| ------------------ | ----------------------- | ------ |
| `tone?`            | [NodeTone](#enums)      |        |
| `opacity?`         | number                  | 0 to 1 |
| `rounded?`         | boolean                 |        |
| `fill?`            | boolean                 |        |
| `border?`          | boolean                 |        |
| `guide?`           | boolean                 |        |
| `fontFamily?`      | `default` `monospace`   |        |
| `textHue?`         | [StyleHue](#enums)      |        |
| `textTone?`        | [TextTone](#enums)      |        |
| `alignHorizontal?` | `left` `center` `right` |        |
| `alignVertical?`   | `top` `middle` `bottom` |        |

### Style2D

A 2D look: the node style and the diagram vocabulary. Extends [NodeStyle](#nodestyle).

| Field        | Type                                |
| ------------ | ----------------------------------- |
| `lineStyle?` | `solid` `dashed` `dotted` `sketchy` |
| `pattern?`   | boolean                             |
| `weight?`    | `s` `m` `l` `xl`                    |

### Style3D

A 3D look: a material over a hue and a tone.

| Field        | Type                          |
| ------------ | ----------------------------- |
| `hue?`       | string                        |
| `tone?`      | `0` `1` `2` `3`               |
| `surface?`   | `solid` `tint` `glass` `none` |
| `border?`    | boolean                       |
| `rounded?`   | boolean                       |
| `opacity?`   | number                        |
| `metalness?` | number                        |
| `roughness?` | number                        |
| `emissive?`  | number                        |

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

| Field    | Type                    |
| -------- | ----------------------- |
| `id`     | string                  |
| `name`   | string                  |
| `style?` | [NodeStyle](#nodestyle) |

### StyleCatalog

A reusable set of styles, as an ECHO object. ECHO type `org.dxos.type.scene.styleCatalog`, version 0.1.0.

| Field    | Type                                 |
| -------- | ------------------------------------ |
| `key`    | string                               |
| `name`   | string                               |
| `dim`    | `2d` `3d`                            |
| `styles` | map of [CatalogStyle](#catalogstyle) |
| `id`     | string                               |

### CatalogStyle

One style of a catalog: the 2D and 3D fields in one struct.

| Field              | Type                                | Notes  |
| ------------------ | ----------------------------------- | ------ |
| `hue?`             | string                              |        |
| `tone?`            | [NodeTone](#enums)                  |        |
| `surface?`         | `solid` `tint` `glass` `none`       |        |
| `border?`          | boolean                             |        |
| `rounded?`         | boolean                             |        |
| `opacity?`         | number                              | 0 to 1 |
| `metalness?`       | number                              |        |
| `roughness?`       | number                              |        |
| `emissive?`        | number                              |        |
| `lineStyle?`       | `solid` `dashed` `dotted` `sketchy` |        |
| `fill?`            | boolean                             |        |
| `guide?`           | boolean                             |        |
| `fontFamily?`      | `default` `monospace`               |        |
| `fontSize?`        | number                              |        |
| `textHue?`         | [StyleHue](#enums)                  |        |
| `textTone?`        | [TextTone](#enums)                  |        |
| `alignHorizontal?` | `left` `center` `right`             |        |
| `alignVertical?`   | `top` `middle` `bottom`             |        |
| `pattern?`         | boolean                             |        |
| `weight?`          | `s` `m` `l` `xl`                    |        |

## Diagram shapes

A diagram shape is a primitive of the diagram DSL, stored inside a `diagram` node.

### ShapeBase

The id and style fields every diagram shape shares.

| Field       | Type                          | Notes                                                         |
| ----------- | ----------------------------- | ------------------------------------------------------------- |
| `id`        | string                        | Stable element id, unique within the object (e.g. "left-eye") |
| `color?`    | [Shape.Color](#enums)         | Stroke/text color                                             |
| `fill?`     | [Shape.Fill](#enums)          | Interior fill of closed shapes                                |
| `stroke?`   | [Shape.Stroke](#enums)        | Stroke rendering                                              |
| `weight?`   | [Shape.Weight](#enums)        | Stroke weight / text size                                     |
| `border?`   | boolean                       | Whether a closed shape draws its outline                      |
| `align?`    | [Shape.Align](#enums)         | Where the shape's text sits across it                         |
| `valign?`   | [Shape.VerticalAlign](#enums) | Where the shape's text sits down it                           |
| `fontSize?` | number                        | Text size in scene units                                      |

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
| `corners?`        | [Shape.Corners](#enums) | Rects only                                |
| `type?`           | string                  | A contributed element kind's name         |
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

| Field     | Type                         | Notes                                                        |
| --------- | ---------------------------- | ------------------------------------------------------------ |
| `kind`    | `line`                       |                                                              |
| `points`  | [Shape.Point](#shapepoint)[] | Two or more points (object-local units)                      |
| `closed?` | boolean                      | Close the path back to the first point                       |
| `guide?`  | boolean                      | A guide (lifeline, divider, outline) rather than a connector |

### Shape.Curve

A smooth curve through points. Extends [ShapeBase](#shapebase).

| Field    | Type                         | Notes                                   |
| -------- | ---------------------------- | --------------------------------------- |
| `kind`   | `curve`                      |                                         |
| `points` | [Shape.Point](#shapepoint)[] | Control points the curve passes through |

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

| Field       | Type                         | Notes                                                     |
| ----------- | ---------------------------- | --------------------------------------------------------- |
| `kind`      | `arrow`                      |                                                           |
| `from?`     | string                       | Source element ref, optionally `#port`                    |
| `to?`       | string                       | Target element ref, optionally `#port`                    |
| `start?`    | [Shape.Point](#shapepoint)   | Explicit start (used when `from` is omitted)              |
| `end?`      | [Shape.Point](#shapepoint)   | Explicit end (used when `to` is omitted)                  |
| `text?`     | string                       | Label at the arrow midpoint                               |
| `head?`     | [Shape.ArrowHead](#enums)    | Marker at the target end (default arrow)                  |
| `tail?`     | [Shape.ArrowTail](#enums)    | Marker at the source end (default none)                   |
| `route?`    | [Shape.Point](#shapepoint)[] | The connector's route, ends included                      |
| `path?`     | [Shape.Path](#enums)         | How the connector runs between its ends (default `smart`) |
| `relation?` | [Shape.Relation](#enums)     | What the connector means                                  |

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

### Shape.Point

A point.

| Field | Type   |
| ----- | ------ |
| `x`   | number |
| `y`   | number |

## Enums

Each enum is a set of literal values.

| Name                  | Values                                                                                                                       |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `Scene.LayoutKind`    | `view` `composite`                                                                                                           |
| `PartConstraint`      | `min` `max` `stretch` `center` `scale`                                                                                       |
| `Scene.InstanceFit`   | `none` `frame`                                                                                                               |
| `Scene.Dimension`     | `2d` `3d`                                                                                                                    |
| `Side`                | `n` `e` `s` `w`                                                                                                              |
| `PortDirection`       | `in` `out` `any`                                                                                                             |
| `Marker`              | `arrow` `circle` `diamond` `diamond-filled` `many` `triangle`                                                                |
| `StyleHue`            | `neutral` `red` `orange` `amber` `green` `teal` `sky` `blue` `violet`                                                        |
| `NodeTone`            | `0` `1` `2` `3`                                                                                                              |
| `TextTone`            | `1` `2` `3`                                                                                                                  |
| `Shape.BoxKind`       | `rect` `ellipse` `diamond` `triangle` `grid`                                                                                 |
| `Shape.Corners`       | `top` `bottom` `none`                                                                                                        |
| `Shape.Color`         | `black` `grey` `light-violet` `violet` `blue` `light-blue` `yellow` `orange` `green` `light-green` `light-red` `red` `white` |
| `Shape.Fill`          | `none` `solid` `pattern` `tint`                                                                                              |
| `Shape.Stroke`        | `sketchy` `solid` `dashed` `dotted`                                                                                          |
| `Shape.Weight`        | `s` `m` `l` `xl`                                                                                                             |
| `Shape.Align`         | `left` `center` `right`                                                                                                      |
| `Shape.VerticalAlign` | `top` `middle` `bottom`                                                                                                      |
| `Shape.Layout`        | `tracks` `pack`                                                                                                              |
| `Shape.Place`         | `start` `center` `end`                                                                                                       |
| `Shape.Path`          | `smart` `ortho` `line` `curve`                                                                                               |
| `Shape.ArrowHead`     | `arrow` `triangle` `crowsfoot` `none`                                                                                        |
| `Shape.ArrowTail`     | `none` `circle` `arrow`                                                                                                      |
| `Shape.Relation`      | `association` `dependency` `inheritance` `implementation` `composition` `aggregation` `one-to-many` `many-to-many`           |

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
