//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { AiService } from '@dxos/ai';
import * as Operation from '@dxos/compute/Operation';
import { Database, Ref } from '@dxos/echo';
import { DXN } from '@dxos/keys';

import * as CodeGraph from './CodeGraph.ts';

const NodeIds = Schema.Array(Schema.String).annotate({
  description:
    'Resource IRIs from the index (or `file:<path>` / `pkg:<name>` shorthand), e.g. `https://dxos.org/deus/package/@dxos/echo`.',
});

/** What a mutation did, and the size of the graph after it. */
const Summary = Schema.Struct({
  addedNodes: Schema.Number,
  addedEdges: Schema.Number,
  removedNodes: Schema.Number,
  nodes: Schema.Number,
  edges: Schema.Number,
});
export type Summary = Schema.Schema.Type<typeof Summary>;

export const Query = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.codeGraph.query'),
    name: 'Query Code Index',
    description:
      'Runs a SPARQL SELECT over the code index and returns the rows; nothing is drawn. Missing `deus:` prefixes are added for you.',
    icon: 'ph--magnifying-glass--regular',
  },
  input: Schema.Struct({
    sparql: Schema.String.annotate({ description: 'A SPARQL SELECT.' }),
    limit: Schema.optional(Schema.Number).annotate({ description: 'Row cap (default 200, at most 2000).' }),
  }),
  output: Schema.Struct({
    vars: Schema.Array(Schema.String),
    rows: Schema.Array(Schema.Record(Schema.String, Schema.String)),
    truncated: Schema.optional(Schema.Boolean),
  }),
});

export const Inspect = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.codeGraph.inspect'),
    name: 'Inspect Code Resource',
    description:
      'Returns one resource’s facts from the code index. `target` is an IRI, a file path or its tail, a package name, a symbol name, or an ECHO typename.',
    icon: 'ph--info--regular',
  },
  input: Schema.Struct({
    target: Schema.String,
    limit: Schema.optional(Schema.Number),
  }),
  output: Schema.Struct({
    iri: Schema.optional(Schema.String),
    outgoing: Schema.Array(Schema.Struct({ predicate: Schema.String, object: Schema.String })),
    incomingCounts: Schema.Array(Schema.Struct({ predicate: Schema.String, count: Schema.Number })),
    candidates: Schema.Array(Schema.Unknown),
    hint: Schema.optional(Schema.String),
  }),
});

export const Read = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.codeGraph.read'),
    name: 'Read Code Graph',
    description: 'Returns the boxes and arrows currently on a code graph, and its layout.',
    icon: 'ph--eye--regular',
  },
  input: Schema.Struct({
    graph: Ref.Ref(CodeGraph.CodeGraph).annotate({ description: 'The code graph to read.' }),
  }),
  output: Schema.Struct({
    layout: CodeGraph.Layout,
    nodes: Schema.Array(Schema.Struct({ id: Schema.String, label: Schema.String, kind: CodeGraph.NodeKind })),
    edges: Schema.Array(CodeGraph.Edge),
  }),
  services: [Database.Service],
});

export const AddNodes = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.codeGraph.addNodes'),
    name: 'Add Code Nodes',
    description:
      'Adds boxes for the given resources, and an arrow for every `deus:imports` or `deus:usesPackage` fact between any two boxes now on the graph.',
    icon: 'ph--plus--regular',
  },
  input: Schema.Struct({
    graph: Ref.Ref(CodeGraph.CodeGraph).annotate({ description: 'The code graph to change.' }),
    nodes: NodeIds,
    connect: Schema.optional(Schema.Boolean).annotate({
      description: 'Draw the arrows between the boxes (default true).',
    }),
  }),
  output: Summary,
  services: [Database.Service],
});

export const AddFromQuery = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.codeGraph.addFromQuery'),
    name: 'Add From Query',
    description: [
      'Runs a SPARQL SELECT and draws its rows.',
      'A row with `?from` and `?to` IRIs becomes an arrow (and both boxes); `?predicate` or `?edgeKind` names the arrow.',
      'A row with `?node` (or a single IRI column) becomes a box. `?label`, `?fromLabel`, `?toLabel` and `?group` override labels and package frames.',
    ].join(' '),
    icon: 'ph--tree-structure--regular',
  },
  input: Schema.Struct({
    graph: Ref.Ref(CodeGraph.CodeGraph).annotate({ description: 'The code graph to change.' }),
    sparql: Schema.String,
    limit: Schema.optional(Schema.Number).annotate({ description: 'Row cap (default 200).' }),
  }),
  output: Schema.Struct({ ...Summary.fields, rows: Schema.Number }),
  services: [Database.Service],
});

export const AddNeighbors = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.codeGraph.addNeighbors'),
    name: 'Add Code Neighbors',
    description:
      'Adds the neighbours of the given boxes along one predicate: what they point to (`out`), what points at them (`in`), or both.',
    icon: 'ph--arrows-out-simple--regular',
  },
  input: Schema.Struct({
    graph: Ref.Ref(CodeGraph.CodeGraph).annotate({ description: 'The code graph to change.' }),
    nodes: NodeIds,
    direction: Schema.optional(Schema.Literals(['out', 'in', 'both'])).annotate({ description: 'Default `out`.' }),
    predicate: Schema.optional(Schema.String).annotate({
      description:
        'A `deus:` predicate local name; default `usesPackage` for packages and `imports` otherwise. Others: `declares`, `inPackage`, `reexports`, `declaresDep`.',
    }),
    limit: Schema.optional(Schema.Number).annotate({ description: 'Neighbours per box (default 25).' }),
  }),
  output: Summary,
  services: [Database.Service],
});

export const Remove = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.codeGraph.remove'),
    name: 'Remove Code Nodes',
    description: 'Removes the given boxes and their arrows; with `all` it clears the graph.',
    icon: 'ph--minus--regular',
  },
  input: Schema.Struct({
    graph: Ref.Ref(CodeGraph.CodeGraph).annotate({ description: 'The code graph to change.' }),
    nodes: Schema.optional(NodeIds),
    all: Schema.optional(Schema.Boolean),
  }),
  output: Summary,
  services: [Database.Service],
});

export const SetLayout = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.codeGraph.setLayout'),
    name: 'Set Code Graph Layout',
    description: [
      'Chooses how the canvas places the boxes:',
      '`illustrator` (the semantic engine: boxes on a grid, arrows routed through the gutters),',
      '`force` (a force-directed layout snapped to slots), `rank` (rows by dependency rank, fewest crossings),',
      'or `diagram` (the illustrator’s full drawing, read-only).',
      'With `grouped`, the illustrator layout and drawing frame each package’s boxes together.',
    ].join(' '),
    icon: 'ph--layout--regular',
  },
  input: Schema.Struct({
    graph: Ref.Ref(CodeGraph.CodeGraph).annotate({ description: 'The code graph to change.' }),
    layout: CodeGraph.Layout,
    resetPositions: Schema.optional(Schema.Boolean).annotate({
      description: 'Forget where the user dragged boxes, so the layout places every box.',
    }),
    grouped: Schema.optional(Schema.Boolean).annotate({
      description: 'Frame boxes by package (illustrator and diagram layouts); unchanged when omitted.',
    }),
  }),
  output: Schema.Void,
  services: [Database.Service],
});

export const RunCommand = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.codeGraph.runCommand'),
    name: 'Run Code Graph Command',
    description: [
      'Carries out one short command on a code graph ("clear the graph", "show me the ECHO package exports")',
      'with its own fast model, apart from the chat assistant. The model may only add SPARQL results or remove boxes',
      'by a text filter; a decision model ends the loop once the command is done.',
    ].join(' '),
    icon: 'ph--terminal--regular',
  },
  input: Schema.Struct({
    graph: Ref.Ref(CodeGraph.CodeGraph).annotate({ description: 'The code graph to change.' }),
    command: Schema.String.annotate({ description: 'What the user typed or said.' }),
  }),
  output: Schema.Struct({
    message: Schema.String,
    stop: Schema.Literals(['done', 'judge', 'limit', 'error']),
    turns: Schema.Number,
    actions: Schema.Array(
      Schema.Struct({
        type: Schema.Literals(['add', 'remove']),
        detail: Schema.String,
        error: Schema.optional(Schema.String),
      }),
    ),
    addedNodes: Schema.Number,
    removedNodes: Schema.Number,
    /** What did not fit on the graph, summarised. */
    trailer: Schema.optional(Schema.String),
    elapsedMs: Schema.Number,
    /** Every model call, action and judgement, timed, for the verbose view. */
    trace: Schema.Array(
      Schema.Struct({
        kind: Schema.Literals(['ground', 'model', 'add', 'remove', 'judge']),
        turn: Schema.Number,
        ms: Schema.Number,
        label: Schema.String,
        detail: Schema.optional(Schema.String),
        error: Schema.optional(Schema.String),
      }),
    ),
  }),
  services: [Database.Service, AiService.AiService],
});
