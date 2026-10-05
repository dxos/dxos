//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { trim } from '@dxos/util';

import { DrawingOperation } from '#types';

const SKILL_KEY = 'org.dxos.skill.uml';

const operations = [
  DrawingOperation.Create,
  DrawingOperation.Read,
  DrawingOperation.Generate,
  DrawingOperation.Draw,
  DrawingOperation.Edit,
  DrawingOperation.Score,
];

const make = () =>
  Skill.make({
    key: SKILL_KEY,
    name: 'UML',
    tools: Skill.toolDefinitions({ operations }),
    instructions: Template.make({
      source: trim`
        {{! UML }}

        You can create UML class diagrams from source code and render them on a shared canvas.
        The ${Operation.toolName(DrawingOperation.Generate)} tool compiles a mermaid classDiagram into positioned shapes automatically —
        you supply the model, the dialect owns the layout.

        ## Workflow

        1. Obtain the source code to analyze:
           - Code in documents or objects bound to this chat: read it directly.
           - A GitHub reference (URL, "owner/repo", or a file path within one): fetch the source
             with your available tools (e.g. fetch the raw file, or the repository tree and then
             the relevant files). Prefer the few files that define the core types over crawling
             an entire repository.
        2. Extract the class model — classes, interfaces, their attributes and methods, and the
           relationships between them: inheritance (extends), realization (implements),
           composition/aggregation (owned fields), association (references), and dependency
           (parameter/return types). Keep it to the essential types; a readable diagram has
           fewer than ~15 classes.
        3. Express the model as a mermaid classDiagram, e.g.:
           \`\`\`
           classDiagram
             direction TB
             class Animal {
               <<abstract>>
               +name: string
               +move() void
             }
             Animal <|-- Dog
             Serializable <|.. Dog
             Owner "1" o-- "*" Dog : owns
             Dog ..> Bone : chews
           \`\`\`
           Supported: class blocks with members, <<stereotypes>>, ~T~ generics, and the
           relation arrows <|-- (inheritance), <|.. / ..|> (realization), *-- (composition),
           o-- (aggregation), --> (association), ..> (dependency), with optional
           "cardinalities" and : labels.
        4. If no drawing exists in context, create one first; then call generate with the
           mermaid source. Generation replaces the managed diagram — layout is automatic.
        5. Read the \`diagnostics\` in the result. Every \`error\` (nodes overlapping, a connector
           drawn through a node, a label that does not fit) means the picture is wrong: shorten
           labels, drop or split nodes, or reduce edges, then generate again. \`warning\`s
           (crossings, bends) are quality hints — fewer is better, zero is not required.
        6. For manual touch-ups afterwards (moving a class, restyling an element), read the
           scene and apply targeted edit commands; each class is a world object whose id is the
           class name, with title/attributes/methods elements.

        ## Block diagrams

        The same tool compiles a mermaid \`flowchart\` (TB or LR) for architecture and data-flow
        diagrams: \`subgraph id [Label] … end\` groups, \`Id[Label]\` nodes, \`A --> B\` and
        \`A -->|label| B\` edges. Add \`%% ref <Id> <target>\` lines to say what a node depicts:
        an ECHO object reference opens when the node is activated; a URL or path is kept on the
        node for tooling. Keep to ~14 nodes and 3 groups; split a larger system into several
        drawings.

        Relation kinds draw with UML markers: \`B ..|> A\` (implements, dashed hollow triangle),
        \`A -.-> B\` (creates), \`A o--> B\` (owns or contains), \`A --{ B\` (has many) and
        \`B --|> A\` (extends); a plain \`-->\` is a dependency or call.

        ## Refining a diagram

        After each ${Operation.toolName(DrawingOperation.Generate)}, call
        ${Operation.toolName(DrawingOperation.Score)} and improve the diagram over several rounds
        (about five, or until the overall score stops rising). Each round, say in one line what the
        scores and diagnostics showed and what you are changing, then regenerate. Change only what is
        true of the code:

        - Label each box with a component name alone; put caveats ("no cap", limits) on edges.
        - Keep every box at one level of abstraction: services and modules, not their fields, caches,
          limits or data types.
        - Remove crossings, overlapping arrows and overlapping labels: reorder declarations, move a
          node to another group, switch TB/LR, or drop an edge that restates another.
        - Groups should hold what depends on each other; dependencies should run one way between them.
        - Keep the best-scoring version; if a change lowers the score, go back.

        ## Semantic diagrams

        ${Operation.toolName(DrawingOperation.Draw)} also takes SEMANTIC statements: you state the boxes, arrows and
        groups, plus only the placement or routing you care about, and the engine does the rest — boxes on
        a grid, arrows through the gutters with the fewest bends, ports spread along each side, labels
        beside their own arrow. Prefer this to coordinates for any boxes-and-arrows diagram, and to
        mermaid when you want a say in where things go. Write it directly; there is no intermediate step.

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
          \`head=arrow|triangle|crowsfoot|none\`, \`tail=circle\`, \`stroke=dashed|dotted\`, \`color=…\`.
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
          branch, give separate edges with the same source (or target) the same \`bus=<name>\`. A bus
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
        \`diagnostics\` as for generation and adjust relations to remove crossings.

        ## Drawing it yourself

        The same tool takes scene statements, in which you choose every coordinate. For a graph,
        prefer the semantic statements above, or ${Operation.toolName(DrawingOperation.Generate)}.
        Reach for coordinates when the picture is not a graph: a precise arrangement, a free-form illustration, a
        figure with circles, arcs or text you place yourself, or a fix to one object of a diagram
        that generation otherwise got right.

        A document is a sequence of statements, brace-delimited and whitespace-insensitive:

        \`\`\`
        object api @ 0,0 ref="dxn:echo:@:01ABC" {
          rect box 0,0 140x64 "API gateway" color=blue
          text note 0,72 "public" color=grey weight=s
        }

        object store @ 110,160 {
          ellipse disk 0,0 140x56 "Postgres" color=violet fill=pattern
        }

        object edges @ 0,0 {
          arrow api-store api/box -> store/disk "writes" head=crowsfoot
        }
        \`\`\`

        - \`object <id> [@ <x>,<y>] [scale=] [index=] [ref=] { … }\` places a group; \`@\` is its
          canvas origin and elements inside it are in object-local units. Omit \`@\` to leave an
          existing object where it is.
        - Elements are \`<kind> <id> <geometry> ["label"] <name=value>*\`: \`rect\`/\`ellipse\`/
          \`diamond\`/\`triangle\` take \`x,y WxH\`; \`circle\` takes \`cx,cy r\`; \`line\`/\`curve\`
          take two or more \`x,y\`; \`arc\` takes \`cx,cy r a0..a1\`; \`text\` takes \`x,y "string"\`;
          \`portal\` takes \`x,y WxH ref="<dxn>"\` and shows another drawing inside the frame.
        - An \`arrow\` is \`<end> -> <end>\`. An end is a **ref** (\`Object/element\`, optionally
          \`#port\`), a point (\`10,20\`), or \`_\` for none. Prefer refs: a bound end follows its
          target when the target moves, which a coordinate pair cannot.
        - Attributes are always \`name=value\`, never bare: \`color\`, \`fill\`, \`stroke\`,
          \`weight\` on anything; \`rotation\` and \`corners\` on the box kinds; \`w\` on \`text\`;
          \`closed=true\` on \`line\`; \`head\` and \`tail\` on \`arrow\`. Values are the schema's
          literals (\`head=triangle\`, \`stroke=dashed\`); free text and ids that are not bare words
          are quoted.
        - The other statements edit in place: \`elements <objectId> { … }\` adds or replaces
          elements, \`move <id> @ <x>,<y>\`, \`remove object <id>\`,
          \`remove elements <objectId> <elementId>…\`.

        Read \`problems\` in the result first — each carries a line and column, and a single
        \`error\` means nothing was applied at all. Then read \`diagnostics\` exactly as for
        generation.

        When asked for the diagram source rather than a canvas rendering (e.g. to embed in a
        markdown document), return a mermaid classDiagram in a fenced mermaid block — that is the
        portable form and needs no coordinates. If the DSL is what was asked for, by name or by
        asking for a \`diagram\` fenced block or positioned source, return the DSL instead.
      `,
    }),
  });

const skill: Skill.Definition = {
  key: SKILL_KEY,
  make,
};

export default skill;
