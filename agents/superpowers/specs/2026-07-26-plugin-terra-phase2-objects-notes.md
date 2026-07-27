# plugin-terra Phase 2 — Objects (captured requirements)

Date: 2026-07-26
Status: Requirements captured — needs brainstorm → spec → plan before implementation.

> These are the user's raw requirements for Phase 2, recorded so they aren't lost
> while Phase 1 (the terrain plugin) is in flight. Not yet a design.

## Architectural framing

- **The globe/terrain is one reusable module** with multiple applications. Phase 1
  builds it (`src/engine/*`). Phase 2 is a **second module** layered on top.
- Phase 2 = **movable objects** + a **simple game engine** that updates every
  object's position each frame.

## Object taxonomy

Movable objects, by domain:

- **Sea:** boats
- **Air:** planes
- **Space:** satellites
- **Ground:** tanks
- **Rocket** (spans domains — launches from ground, through air, to space)

Create **2 of each type**.

## Object representation (low-poly, simplified primitives)

- Each object is built from simple primitives, e.g.
  **plane = cylinder + nose cone + 2× wing rectangles + tail**. Define one
  simplified form per type.

## Motion model

- Each object has a **2D velocity vector** (heading + speed in lat/lng space)
  **mapped into 3D** on the sphere surface (e.g. plane heading NW at a velocity).
- Some objects have a **departure (source)** and **destination (target)** as
  lat/lng/height.
- Some objects have an **orbit** (e.g. satellites).
- Objects with source+target **periodically plot a course with waypoints that
  avoid obstacles** (land, mountains) and track toward the target.

## Game engine

- A **simple game engine** updates each object's position on each frame.

## Related tracked items (fold into Phase 2 design)

- **Rocket** as an object type (above).
- **Explosions, exhaust, smoke, vapor trails** — rendered as spheres (particle-ish
  effects attached to objects).
- **Landing points for rockets** (from earlier backlog) — rocket source/target
  sites.
- **Boats and submarines** (earlier backlog) — submarines = underwater variant of
  the sea object.
- **Satellites** (earlier backlog) — orbit objects.
- **Light source (sun)** (earlier backlog) — may interact with object shading.

## Separate tracked item (own effort)

- **MCP server for the game world** — expose/control the world+objects via MCP.
