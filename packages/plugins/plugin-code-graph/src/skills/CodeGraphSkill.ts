//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';
import { trim } from '@dxos/util';

import { CodeGraph, CodeGraphOperation } from '#types';

export const key = CodeGraph.SKILL_KEY;

const operations = [
  SpaceOperation.AddObject,
  CodeGraphOperation.Read,
  CodeGraphOperation.Query,
  CodeGraphOperation.Inspect,
  CodeGraphOperation.AddFromQuery,
  CodeGraphOperation.AddNodes,
  CodeGraphOperation.AddNeighbors,
  CodeGraphOperation.Remove,
  CodeGraphOperation.SetLayout,
];

const tool = Operation.toolName;

export const make = (): Skill.Skill =>
  Skill.make({
    key,
    name: 'Code Graph',
    tools: Skill.toolDefinitions({ operations }),
    instructions: Template.make({
      source: trim`
        {{! Code Graph }}

        You can show the codebase on a code graph: a canvas whose boxes are resources in the code index
        (packages, files, symbols) and whose arrows are facts between them (imports, package dependencies,
        declarations). The index is an RDF graph you query with SPARQL.

        ## The index

        Prefixes (missing \`deus:\` prefixes are added for you):
        - \`deus:\` = <https://dxos.org/vocab/deus#> — classes and predicates.
        - Files are <https://dxos.org/deus/file/REPO_PATH>; a symbol is the file IRI plus \`#name\`.
        - Packages are <https://dxos.org/deus/package/NAME>, e.g. <https://dxos.org/deus/package/@dxos/echo>.

        Classes: \`deus:File\`, \`deus:Package\`, \`deus:Symbol\`, and derived ones such as \`deus:Plugin\`,
        \`deus:Schema\`, \`deus:Capability\`.
        Predicates: files have \`deus:path\`, \`deus:inPackage\`, \`deus:imports\`, \`deus:declares\`,
        \`deus:reexports\`; packages have \`deus:name\`, \`deus:packagePath\`, \`deus:declaresDep\` (from
        package.json) and \`deus:usesPackage\` (from actual imports); symbols have \`deus:name\`, \`deus:kind\`,
        \`deus:exported\`. When unsure of a term, ${tool(CodeGraphOperation.Inspect)} a resource you know and
        read its predicates.

        Examples:
        \`\`\`sparql
        # The @dxos packages plugin-markdown depends on.
        SELECT ?from ?to WHERE {
          BIND(<https://dxos.org/deus/package/@dxos/plugin-markdown> AS ?from)
          ?from deus:usesPackage ?to . ?to deus:name ?name . FILTER(STRSTARTS(?name, "@dxos/"))
        }
        # Imports between the files of one package.
        SELECT ?from ?to WHERE {
          ?from deus:inPackage <https://dxos.org/deus/package/@dxos/echo> ; deus:imports ?to .
          ?to deus:inPackage <https://dxos.org/deus/package/@dxos/echo> .
        }
        \`\`\`

        ## Drawing

        1. If no code graph is in context, create one with ${tool(SpaceOperation.AddObject)}:
           \`{ "object": { "@type": "${CodeGraph.TYPENAME}", "name": "…", "nodes": [], "edges": [] } }\`.
        2. Before changing an existing graph, call ${tool(CodeGraphOperation.Read)}.
        3. Fill it with ${tool(CodeGraphOperation.AddFromQuery)}: SELECT \`?from ?to\` for arrows, or \`?node\`
           for lone boxes. Check a query with ${tool(CodeGraphOperation.Query)} first when you are unsure of it.
           ${tool(CodeGraphOperation.AddNodes)} adds known resources and connects them;
           ${tool(CodeGraphOperation.AddNeighbors)} grows the graph from boxes along a predicate.
        4. Keep graphs readable: aim for 5–40 boxes. Prefer package-level graphs for an overview and file-level
           graphs inside one package. Remove noise with ${tool(CodeGraphOperation.Remove)}.
        5. Pick the layout with ${tool(CodeGraphOperation.SetLayout)}: \`illustrator\` for a tidy architecture
           view (frames per package, routed arrows; best under ~30 boxes), \`force\` for clusters in larger
           graphs, \`rank\` for layered dependency order, \`diagram\` for the illustrator's full drawing.
      `,
    }),
    agentCanEnable: true,
  });
