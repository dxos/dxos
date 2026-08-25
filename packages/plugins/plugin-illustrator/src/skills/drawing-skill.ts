//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { trim } from '@dxos/util';

import { DrawingOperation } from '#types';

const SKILL_KEY = 'org.dxos.skill.drawing';

const operations = [DrawingOperation.Create, DrawingOperation.Read, DrawingOperation.Edit];

const make = () =>
  Skill.make({
    key: SKILL_KEY,
    name: 'Drawing',
    tools: Skill.toolDefinitions({ operations }),
    instructions: Template.make({
      source: trim`
        {{! Drawing }}

        You can draw and edit diagrams on a shared canvas using a scene DSL.

        ## Model

        A drawing is a set of WORLD OBJECTS — semantic things like "face", "hat", "server" —
        each composed of graphical ELEMENTS (rect, ellipse, circle, diamond, triangle, line,
        curve, arc, text, arrow). You do the layout; there is no auto-layout.

        - Give objects and elements short, semantic ids ("face", "left-eye"). Ids are how you
          edit or delete things later — choose them as carefully as variable names.
        - Element coordinates are OBJECT-LOCAL units. Design each object in roughly a 100-unit
          box. The object's "origin" (canvas px) and "scale" (px per unit) place it on the
          canvas: canvas = origin + local * scale. Prefer scale 2-3 for a primary subject.
        - Screen coordinates: x grows right, y grows DOWN. Arc angles are degrees clockwise
          from the +x axis: startAngle 30, endAngle 150 bulges downward (a smile);
          210 to 330 bulges upward (a frown).
        - Circle is sugar for ellipse (reads back as ellipse); arc is sugar for curve.
        - Arrows can bind to elements: from/to is an element id in the same object, or
          "objectId/elementId" across objects. Bound arrows track their targets.
        - Styles: color (named palette), fill (none | solid | pattern),
          stroke (sketchy | solid | dashed | dotted), weight (s | m | l | xl).

        ## Workflow

        1. If no drawing exists in context, create one first.
        2. ALWAYS call ${Operation.toolName(DrawingOperation.Read)} before editing an existing drawing — it returns the scene as you
           (or the user) last left it, with origins derived from the live canvas, so it stays
           correct even after the user drags shapes around. Note "unmanaged" counts shapes the
           user drew by hand that are not part of the scene.
        3. Edit with commands, in one batch where possible:
           - upsert-object: create a new object, or redraw one wholesale.
           - upsert-elements: add or replace specific elements of an object — prefer this for
             incremental changes ("make the smile bigger" replaces only "smile").
           - remove-elements / remove-object: delete by id.
           - move-object: reposition an object (canvas px) without resending its elements.
        4. Compose scenes from multiple objects: "add a hat" means a NEW "hat" object placed
           relative to the existing object's origin and size (from read) — do not redraw the
           existing object.
      `,
    }),
  });

const skill: Skill.Definition = {
  key: SKILL_KEY,
  make,
};

export default skill;
