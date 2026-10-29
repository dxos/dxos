//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { trim } from '@dxos/util';

import { Drawing, DrawingOperation } from '#types';

export const key = Drawing.SKILL_KEY;

const operations = [
  DrawingOperation.Create,
  DrawingOperation.Read,
  DrawingOperation.Draw,
  DrawingOperation.Edit,
  DrawingOperation.Score,
];

/**
 * The semantic diagram language `draw` compiles: boxes, arrows and groups, with only the placement that matters,
 * laid out by the constraint engine. Shared with skills that draw through the same operation.
 */
export const semanticDiagrams = trim`
  ## Semantic diagrams

  ${Operation.toolName(DrawingOperation.Draw)} takes SEMANTIC statements: you state the boxes, arrows and
  groups, plus only the placement or routing you care about, and the engine does the rest — boxes on
  a grid, arrows through the gutters with the fewest bends, ports spread along each side, labels
  beside their own arrow. Prefer this to coordinates for any boxes-and-arrows diagram, and never
  write mermaid: it is deprecated. Write it directly; there is no intermediate step. \`diagram kind=\`
  picks what is drawn: \`structure\` (the default, below), \`sequence\` and \`dataflow\` (after it).

  \`\`\`
  diagram flow=down                     # optional: flow=down|up|right|left
  group req "Requesters" {
    node Trig "TriggerDispatcher" ref="packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts"
    node Agent "AgentService" right-of Trig
  }
  group local "Local runtime" below req {
    node PM "ProcessManager" below Agent
    node Invoker "ProcOpInvoker" right-of PM
    node Handle "ProcessHandle" below PM
    node Store "ProcessStore" left-of Handle
    node Def "Process def" right-of Handle
  }
  group remote "EDGE runtime" right-of local {
    node RPM "RemoteProcessMgr"
    node RHandle "RemoteProcHandle" right-of RPM
    node Queued "QueuedRemoteCtl" below RHandle
    node EdgeCtl "EdgeProcControl" left-of Queued
  }
  edge Agent -> PM "spawn local"
  edge Agent -> RPM:top "spawn on EDGE"
  edge Trig -> PM "spawn"
  edge PM owns Handle "no cap"
  edge PM -> Store "persist"
  edge PM -> Invoker
  edge Invoker -> PM "spawn child"
  edge Handle -> Def "run"
  edge Handle -> Store "delete on exit"
  edge RPM -> RHandle "make"
  edge RHandle -> Queued "control"
  edge Queued -> EdgeCtl "deliver"
  \`\`\`

  - \`node <id> ["label"] [placement…] [ref="…"] [shape=rect|ellipse|diamond|triangle] [color=…]
    [fill=…] [stroke=…]\` — one box; the label defaults to the id. Every box is the same size.
  - Placement relations: \`right-of X\` / \`left-of X\` (same row), \`below X\` / \`above X\` (same
    column), \`same-row X\`, \`same-col X\`. They are rules; prefix \`~\` (\`~below X\`) to make one
    a preference. The engine keeps related boxes adjacent when it can. X may be in another group.
  - Pins: \`@cell(c,r)\` puts the box in grid column c, row r (from 0); \`@ x,y\` pins its top-left
    exactly. Prefer relations — a pin leaves the engine nothing to optimise.
  - \`group <id> ["label"] [right-of|left-of|below|above <group>] [compact] [max-width=N] [gap=N]
    [color=…] { node… edge… }\` — a dashed frame. Members are laid out first as one compact unit and
    no other box enters the frame. A group relation places the whole frame beside the other; \`gap\`
    adds N pixels between the two frames. \`max-width=N\` caps the frame at N columns and \`compact\`
    keeps it near-square, so a group pulled sideways does not become a long strip. Groups do not
    nest; keep to three or fewer.
  - \`edge A -> B ["label"]\`: \`<->\` draws two arrows, \`--\` a line with no head. Optional
    \`head=arrow|triangle|crowsfoot|none\`, \`tail=circle|arrow\`, \`stroke=dashed|dotted\`, \`color=…\`.
  - Relationships: put a word in place of \`->\` to say what the edge MEANS; the markers follow
    from it, so never pick heads yourself. The LEFT end is always the child, the whole, the owner
    or the "one" side:
    \`Dog extends Animal\` (hollow triangle at Animal), \`Square implements Shape\` (dashed, hollow
    triangle), \`Order composes LineItem\` (filled diamond at Order: the parts die with it),
    \`Team owns Member\` (hollow diamond at Team), \`Customer one-to-many Order\` (bar at Customer,
    crow's foot at Order), \`Student many-to-many Course\` (crow's feet at both),
    \`App depends-on Log\` (dashed, open arrow). Plain \`->\` is an association. Use a word only
    when the meaning is clear; a label can still say more (\`edge PM owns Handle "no cap"\`).
  - Sides: \`A:right -> B:top\`, or a choice \`B:top|left\`. Leave sides off and the router picks the
    pair with the fewest bends (two stacked boxes with a third between them connect left to left
    down the free gutter, for instance). Name a side only to force a specific look. \`A:~left\` (also
    \`A:~left|top\`) makes it a preference: taken when it costs about a bend or less, dropped when it
    would force a detour.
  - Fans: \`edge A -> B, C\` is one arrow per target. Add \`bus\` (\`edge A -> B, C "label" bus\`) to
    draw one trunk that splits, labelled once; \`edge B, C -> A bus\` gathers many sources into one
    trunk with one arrowhead at A, and lines the sources up across the flow. To keep a label per
    branch, give separate edges with the same source (or target) the same \`bus=<name>\`.
    Same-label edges from one node bundle automatically: separate \`edge A -> B "content"\` and
    \`edge A -> C "content"\` share one port and one trunk labelled once, and same-label edges into
    one node gather the same way. Give edges one label only when they are one property. A bus
    the engine cannot draw as one trunk is drawn as separate edges with a warning.
  - Waypoints: \`via X,_\` makes the route run vertically at x=X, \`via _,Y\` horizontally at y=Y,
    \`via X,Y\` passes the point; several waypoints are visited in order. In grid units,
    \`via cell(1.5,_)\` is the gutter between columns 1 and 2 and \`via cell(_,1.5)\` the gutter
    between rows 1 and 2. Use them sparingly.
  - \`diagram\` (optional, once): \`flow=\` is the way arrows should read (default down);
    \`aspect=W:H\` leans the whole drawing toward that shape; \`grid=WxH\` (cell pitch) and
    \`box=WxH\` (box size) override the measured defaults — normally leave them. Every length
    (\`gap\`, \`grid\`, \`box\`, \`@ x,y\`, \`via X,_\`) is in pixels; only \`cell(…)\` and
    \`max-width\` count grid cells.
  - Ids are bare words (\`A-z 0-9 _ -\`) or quoted. Statement and clause words (\`node\`, \`edge\`,
    \`group\`, \`diagram\`, \`cell\`, \`via\`, \`bus\`, \`compact\`, the element kinds) must be quoted
    as ids.

  Precedence: pins, then hard relations, then soft (\`~\`) relations and preferred sides; a hard
  relation two pins contradict is dropped with a warning. A relation between nodes in different
  groups also moves their frames: \`below X\` puts the member in X's column, so its frame widens to
  reach it, leaving empty columns inside (reported as "Group … is stretched"). To place groups,
  relate the groups (\`group B below A\`), not their members.

  How to write one well: declare groups in reading order with their nodes inside; start with no
  hints at all and look at the result. Then add the smallest hint that fixes a defect you can see
  — a chain as each node \`below\` the previous, a hub with one neighbour per side, groups
  \`below\`/\`right-of\` each other. Every hint narrows the search, so a hint added "just in case"
  often makes the layout worse; remove one that does not visibly help. Label only the edges that
  say something, in a few words. Add sides or waypoints last, to fix one edge.

  The result has one object per node (id = node id, its shape is element \`box\`), one per group
  (\`frame\`, \`label\`), and an \`edges\` object of connectors named \`<from>-<to>-<n>\`. Scene
  statements may follow in the same document to decorate it: \`elements PM { text note 0,-30 "hot" }\`.
  \`problems\` reports unknown nodes and bad words as errors (nothing is applied), and relations or
  pins the engine had to relax as warnings (the drawing is applied without them). Then read
  \`diagnostics\`: every \`error\` (overlapping boxes, a connector through a box, a label that does
  not fit) must be fixed; \`warning\`s (crossings, bends) are quality hints. Adjust relations to
  remove crossings.

  ## Sequence diagrams

  For an interaction over time (a request through services, a protocol handshake), declare
  \`diagram kind=sequence\`. Participants are the nodes, as columns in the order you declare them;
  messages are the edges, as rows top to bottom in the order you write them. There is no placement
  to state, and placement hints, sides, waypoints and buses are ignored with a warning.

  \`\`\`
  diagram kind=sequence
  node User "User" role=actor
  node App "Composer"
  group cloud "EDGE" { node Router "Router"  node Db "Space DB" }
  edge User -> App "open space"
  edge App calls Router "query"
  edge Router calls Db "load"
  edge Db returns Router "docs"
  note Router "merges local state"
  edge Router returns App "objects"
  fragment loop "every 5s" {
    edge App sends Router "heartbeat"
  }
  fragment alt "cached" {
    edge App -> App "read cache"
  } else "miss" {
    edge App calls Router "fetch"
    edge Router returns App "rows"
  }
  \`\`\`

  - Messages: \`->\` is a plain message; \`calls\` is a synchronous call and opens an activation bar
    on its target; \`returns\` answers the innermost open call (dashed, open head) and closes its
    bar; \`sends\` is asynchronous (open head). \`edge A -> A\` loops back to the same lifeline.
  - \`role=actor\` draws a participant as a stick figure. A \`group\` frames adjacent participants.
  - \`note A "…"\` sits right of A, \`note A:left "…"\` left of it, \`note A, B "…"\` over both.
  - Fragments: \`fragment alt|opt|loop|par|break|critical ["guard"] { edge… note… fragment… }\`;
    \`alt\` and \`par\` take more sections with \`else ["guard"] { … }\`. Fragments nest.
  - The result has one object per participant (its head and lifeline) and one \`edges\` object with
    the messages, bars, notes and fragments.

  ## Data-flow diagrams

  For how data moves through a system, declare \`diagram kind=dataflow\`. Every node has a role:
  \`process\` (the default, drawn as a bubble) transforms data, \`store\` (a box with its id, D1, D2…,
  in a compartment) holds it, \`external\` (a shaded box) is outside the system. Label every edge
  with the data that flows. Groups make trust boundaries. Placement and routing work exactly as in a
  structure diagram.

  \`\`\`
  diagram kind=dataflow flow=right
  node Customer role=external
  node Place "Place order"
  node Orders role=store
  node Bill "Bill customer"
  edge Customer -> Place "order details"
  edge Place -> Orders "new order"
  edge Orders -> Bill "open orders"
  edge Bill -> Customer "invoice"
  \`\`\`

  The result warns where data moves without a process (an external or a store straight to another
  external or store), where a process takes data but gives none or gives data but takes none, and
  where a store is written but never read. Fix them unless the drawing is meant to show the gap.
`;

export const make = () =>
  Skill.make({
    key: key,
    name: 'Drawing',
    tools: Skill.toolDefinitions({ operations }),
    instructions: Template.make({
      source: trim`
        {{! Drawing }}

        You can draw and edit diagrams on a shared canvas.

        For any boxes-and-arrows diagram (architecture, data flow, a sequence of messages), state the boxes, arrows and
        groups and let the layout engine place them: call ${Operation.toolName(DrawingOperation.Draw)} with semantic statements (below).
        Never position the boxes of such a diagram by hand. Use coordinates (the scene model below) only for a
        picture that is not a graph, or to touch up one object the engine placed.

        ${semanticDiagrams}

        After each draw, read \`problems\` and \`diagnostics\`: fix every error and draw again. Then call
        ${Operation.toolName(DrawingOperation.Score)} and refine for a few rounds, keeping the best-scoring version.

        ## Model

        A drawing is a set of WORLD OBJECTS — semantic things like "face", "hat", "server" —
        each composed of graphical ELEMENTS (rect, ellipse, circle, diamond, triangle, line,
        curve, arc, text, arrow). In the scene model you choose every coordinate.

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
    // An agent asked to draw (e.g. a project task) must be able to turn this on without a human at the skill picker.
    agentCanEnable: true,
  });
