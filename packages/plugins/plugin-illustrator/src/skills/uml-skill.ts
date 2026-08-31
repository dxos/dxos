//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { trim } from '@dxos/util';

import { DrawingOperation } from '#types';

const SKILL_KEY = 'org.dxos.skill.uml';

const operations = [DrawingOperation.Create, DrawingOperation.Read, DrawingOperation.Generate, DrawingOperation.Edit];

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
        5. For manual touch-ups afterwards (moving a class, restyling an element), read the
           scene and apply targeted edit commands; each class is a world object whose id is the
           class name, with title/attributes/methods elements.

        When asked for the diagram source rather than a canvas rendering (e.g. to embed in a
        markdown document), return the same mermaid classDiagram in a fenced mermaid block.
      `,
    }),
  });

const skill: Skill.Definition = {
  key: SKILL_KEY,
  make,
};

export default skill;
