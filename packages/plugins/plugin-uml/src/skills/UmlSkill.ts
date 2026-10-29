//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import * as DrawingOperation from '@dxos/plugin-illustrator/DrawingOperation';
import * as DrawingSkill from '@dxos/plugin-illustrator/DrawingSkill';
import { trim } from '@dxos/util';

export const key = 'org.dxos.skill.uml';

const operations = [
  DrawingOperation.Create,
  DrawingOperation.Read,
  DrawingOperation.Generate,
  DrawingOperation.Draw,
  DrawingOperation.Edit,
  DrawingOperation.Score,
];

export const make = () =>
  Skill.make({
    key: key,
    name: 'UML',
    tools: Skill.toolDefinitions({ operations }),
    instructions: Template.make({
      source: trim`
        {{! UML }}

        You can create UML class diagrams from source code and render them on a shared canvas.
        The ${Operation.toolName(DrawingOperation.Draw)} tool lays out semantic diagram statements -
        you state the classes and how they relate, the engine owns the layout.

        ## Workflow

        1. Obtain the source code to analyze:
           - Code in documents or objects bound to this chat: read it directly.
           - A GitHub reference (URL, "owner/repo", or a file path within one): fetch the source
             with your available tools (e.g. fetch the raw file, or the repository tree and then
             the relevant files). Prefer the few files that define the core types over crawling
             an entire repository.
        2. Extract the class model - classes, interfaces, and the relationships between them:
           inheritance (extends), realization (implements), composition/aggregation (owned
           fields), association (references), and dependency (parameter/return types). Keep it to
           the essential types; a readable diagram has fewer than ~15 classes.
        3. Express the model as semantic statements, one \`node\` per class and one relationship
           word per edge, e.g.:
           \`\`\`
           node Animal "Animal" ref="src/animal.ts"
           node Dog
           node Serializable "«interface» Serializable"
           node Owner
           node Bone
           edge Dog extends Animal
           edge Dog implements Serializable
           edge Owner one-to-many Dog "owns"
           edge Dog depends-on Bone "chews"
           \`\`\`
        4. If no drawing exists in context, create one first; then call
           ${Operation.toolName(DrawingOperation.Draw)} with the statements. Layout is automatic.
        5. Read \`problems\` and \`diagnostics\` in the result. Every \`error\` (nodes overlapping, a
           connector drawn through a node, a label that does not fit) means the picture is wrong:
           shorten labels, drop or split nodes, or reduce edges, then draw again. \`warning\`s
           (crossings, bends) are quality hints - fewer is better, zero is not required.
        6. For manual touch-ups afterwards (moving a class, restyling an element), read the
           scene and apply targeted edit commands; each class is a world object whose id is the
           node id.

        ${Operation.toolName(DrawingOperation.Generate)} still compiles a mermaid classDiagram, which
        can show each class's attributes and methods. It is DEPRECATED: use it only when the user
        asks for members in the boxes, and say that the semantic statements cannot show them yet.

        ## Refining a diagram

        After each ${Operation.toolName(DrawingOperation.Draw)}, call
        ${Operation.toolName(DrawingOperation.Score)} and improve the diagram over several rounds
        (about five, or until the overall score stops rising). Each round, say in one line what the
        scores and diagnostics showed and what you are changing, then draw again. Change only what is
        true of the code:

        - Label each box with a component name alone; put caveats ("no cap", limits) on edges.
        - Keep every box at one level of abstraction: services and modules, not their fields, caches,
          limits or data types.
        - Remove crossings, overlapping arrows and overlapping labels: reorder declarations, move a
          node to another group, switch the flow, or drop an edge that restates another.
        - Groups should hold what depends on each other; dependencies should run one way between them.
        - Keep the best-scoring version; if a change lowers the score, go back.

        ${DrawingSkill.semanticDiagrams}

        ## Drawing it yourself

        The same tool takes scene statements, in which you choose every coordinate. For a graph,
        prefer the semantic statements above.
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

        - \`object <id> [@ <x>,<y>] [scale=] [index=] [ref=] { ... }\` places a group; \`@\` is its
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
        - The other statements edit in place: \`elements <objectId> { ... }\` adds or replaces
          elements, \`move <id> @ <x>,<y>\`, \`remove object <id>\`,
          \`remove elements <objectId> <elementId>...\`.

        Read \`problems\` in the result first - each carries a line and column, and a single
        \`error\` means nothing was applied at all. Then read \`diagnostics\` as above.

        When asked for the diagram source rather than a canvas rendering (e.g. to embed in a
        markdown document), return the semantic statements in a fenced \`diagram\` block: Composer
        and the spec viewer lay it out where it is embedded, and it needs no coordinates. Do not
        return mermaid; it is deprecated.
      `,
    }),
  });
