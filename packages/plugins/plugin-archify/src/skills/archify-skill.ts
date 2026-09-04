//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { trim } from '@dxos/util';

import { DiagramOperation } from '#types';

const SKILL_KEY = 'org.dxos.skill.archify';

const operations = [DiagramOperation.Create, DiagramOperation.Read, DiagramOperation.Verify, DiagramOperation.Write];

const make = () =>
  Skill.make({
    key: SKILL_KEY,
    name: 'Archify',
    tools: Skill.toolDefinitions({ operations }),
    instructions: Template.make({
      source: trim`
        {{! Archify }}

        You turn a system description — or a codebase you have just read — into an architecture
        diagram, by authoring a typed JSON document and letting the validator check your layout.

        ## The model

        A diagram is one IR document:

        - "components": the boxes. Each has an "id" (a stable slug), a "type" from
          frontend | backend | database | cloud | security | messagebus | external, a "label", and
          usually a "sublabel" (the concrete thing: "FastAPI :8000", "primary :5432"). "tag" is a
          small stamp above the box for a protocol or guarantee.
        - "connections": directed relationships. "variant" is the vocabulary — "default" for plain
          flow, "emphasis" for the primary path, "security" for auth/trust, "dashed" for async.
        - "boundaries": a labelled frame around a set of component ids ("wraps") — a region, a VPC,
          a security group. Frames are derived from their members, so you never size them.
        - "meta.views": up to five guided views, each focusing a handful of ids, so a reader can
          step through the diagram one story at a time.
        - "cards": short prose panels beside the diagram, grouped by a colour dot.

        ## Layout is yours

        There is no auto-layout, and that is deliberate: you know which component is the subject and
        which is supporting, and a generic layered pass does not. Place every component either with
        "pos": [x, y] (absolute, y grows DOWN) or with "row"/"col" under "layout": { "mode": "grid" }.

        - Read left-to-right along the primary request path, top-to-bottom for depth. Keep 60-80px
          of gap between boxes; the default box is 120x60.
        - Set "fromSide"/"toSide" when the automatic choice would route a line across the diagram,
          and add "via" waypoints when a connection has to go around something.
        - Move a label with "labelDy" (or pin it with "labelAt") rather than moving the component.

        ## Workflow

        1. Draft the IR. Start from the primary path — the sequence a request actually takes — then
           hang the secondary paths off it.
        2. Call ${Operation.toolName(DiagramOperation.Verify)} on the draft. Every finding names a
           rule "code", the "subject" it is about, and "supportedFixes" — the exact IR fields you may
           change to clear it. Fix the named field and re-validate; do not restructure the diagram
           to dodge a finding.
        3. ${Operation.toolName(DiagramOperation.Create)} a new diagram, or
           ${Operation.toolName(DiagramOperation.Write)} to replace an existing one. A write with an
           error-level finding is REJECTED and the diagram on screen is left alone — so validate
           first rather than discovering it at the write.
        4. ${Operation.toolName(DiagramOperation.Read)} before editing an existing diagram: it
           returns the stored IR plus its current report, so your edit builds on what is really there.

        Warnings ("label/clearance", "graph/orphan") do not block a write, but they are the
        difference between a diagram that renders and one worth reading — clear them too.
      `,
    }),
  });

const skill: Skill.Definition = {
  key: SKILL_KEY,
  make,
};

export default skill;
