//
// Copyright 2024 DXOS.org
//

import { AIServiceClientImpl } from '@dxos/assistant';
import { ComputeGraphModel, DEFAULT_INPUT, DEFAULT_OUTPUT, EdgeGpt } from '@dxos/conductor';
import { ObjectId } from '@dxos/echo-schema';
import { EdgeClient, EdgeHttpClient, createStubEdgeIdentity } from '@dxos/edge-client';
import { createEdgeId } from '@dxos/graph';
import { DXN, SpaceId } from '@dxos/keys';
import { type Dimension, type Point } from '@dxos/react-ui-canvas';

import { createComputeNode, isValidComputeNode, StateMachine, type Services } from './graph';
import { mapEdge } from './hooks';
import {
  createAnd,
  createAppend,
  createAudio,
  createBeacon,
  createChat,
  createConstant,
  createDatabase,
  createGpt,
  createGptRealtime,
  createIf,
  createIfElse,
  createJson,
  createJsonTransform,
  createList,
  createNot,
  createOr,
  createRandom,
  createScope,
  createSwitch,
  createTextToImage,
  createView,
  type ComputeShape,
} from './shapes';
import { pointMultiply, pointsToRect, rectToPoints } from '../layout';
import { createNote } from '../shapes';
import { type Connection, type Shape } from '../types';
import { CanvasGraphModel } from '../types';

export const foo = () => {};

const createLayout = (rect: Point & Partial<Dimension>, snap = 32): { center: Point; size?: Dimension } => {
  const [center, size] = rectToPoints({ width: 0, height: 0, ...rect });
  const { x, y, width, height } = pointsToRect([pointMultiply(center, snap), pointMultiply(size, snap)]);
  if (width && height) {
    return { center: { x, y }, size: width && height ? { width, height } : undefined };
  } else {
    return { center: { x, y } };
  }
};

export const createBasicTest = () => {
  const model = CanvasGraphModel.create<ComputeShape>();
  model.builder.call(({ model }) => {
    const a = model.createNode(createSwitch(createLayout({ x: -4, y: 0 })));
    const b = model.createNode(createBeacon(createLayout({ x: 4, y: 0 })));
    const c = model.createNode(createBeacon(createLayout({ x: 4, y: 4 })));
    const d = model.createNode(createNot(createLayout({ x: 0, y: 4 })));
    model.createEdge({ source: a.id, target: b.id });
    model.createEdge({ source: d.id, target: c.id });
  });

  return model;
};

export const createTransformTest = () => {
  const model = CanvasGraphModel.create<ComputeShape>();
  model.builder.call(({ model }) => {
    const a = model.createNode(createRandom(createLayout({ x: -8, y: -2 })));
    const b = model.createNode(createConstant({ value: '$[?(@ > 0.5)]', ...createLayout({ x: -8, y: 2 }) }));
    const c = model.createNode(createJsonTransform(createLayout({ x: 0, y: 0 })));
    const d = model.createNode(createBeacon(createLayout({ x: 8, y: 0 })));
    model.createNode(
      createNote({ id: ObjectId.random(), text: 'Random number generator', ...createLayout({ x: 0, y: -6 }) }),
    );
    model.createEdge({ source: a.id, target: c.id });
    model.createEdge({ source: b.id, target: c.id, input: 'expression' });
    model.createEdge({ source: c.id, target: d.id });
  });

  return model;
};

export const createLogicCircuit = () => {
  const model = CanvasGraphModel.create<ComputeShape>();
  model.builder.call(({ model }) => {
    const a1 = model.createNode(createSwitch(createLayout({ x: -4, y: -4 })));
    const a2 = model.createNode(createSwitch(createLayout({ x: -4, y: 0 })));
    const a3 = model.createNode(createSwitch(createLayout({ x: -4, y: 4 })));
    const b1 = model.createNode(createAnd(createLayout({ x: 0, y: -2 })));
    const c1 = model.createNode(createOr(createLayout({ x: 4, y: 0 })));
    const d1 = model.createNode(createBeacon(createLayout({ x: 8, y: 0 })));

    model.createEdge({ source: a1.id, target: b1.id, input: 'a' });
    model.createEdge({ source: a2.id, target: b1.id, input: 'b' });
    model.createEdge({ source: b1.id, target: c1.id, input: 'a' });
    model.createEdge({ source: a3.id, target: c1.id, input: 'b' });
    model.createEdge({ source: c1.id, target: d1.id });
  });

  return model;
};

/**
 * Creates a circuit with control flow nodes (if/else) to demonstrate conditional routing of values.
 * @returns A CanvasGraphModel containing switches, constants, if/else nodes, and beacons wired together.
 */
export const createControlCircuit = () => {
  const model = CanvasGraphModel.create<ComputeShape>();
  model.builder.call((builder) => {
    const model = builder.model;

    const s = model.createNode(createSwitch(createLayout({ x: -9, y: -1 })));
    const c1 = model.createNode(createConstant({ value: 'hello', ...createLayout({ x: -10, y: -10 }) }));
    const c2 = model.createNode(createConstant({ value: 'world', ...createLayout({ x: -10, y: -5 }) }));
    const c3 = model.createNode(createConstant({ value: true, ...createLayout({ x: -10, y: 3 }) }));
    const if1 = model.createNode(createIf(createLayout({ x: 0, y: 1 })));
    const if2 = model.createNode(createIfElse(createLayout({ x: 0, y: -8 })));
    const b1 = model.createNode(createBeacon(createLayout({ x: 9, y: -1 })));
    const b2 = model.createNode(createBeacon(createLayout({ x: 9, y: 3 })));
    const j = model.createNode(createJson(createLayout({ x: 12, y: -8 })));

    builder
      .createEdge({ source: s.id, target: if1.id, input: 'condition' })
      .createEdge({ source: s.id, target: if2.id, input: 'condition' })
      .createEdge({ source: c1.id, target: if2.id, input: 'true' })
      .createEdge({ source: c2.id, target: if2.id, input: 'false' })
      .createEdge({ source: c3.id, target: if1.id, input: 'value' })
      .createEdge({ source: if1.id, target: b1.id, output: 'true' })
      .createEdge({ source: if1.id, target: b2.id, output: 'false' })
      .createEdge({ source: if2.id, target: j.id });
  });

  return model;
};

type TestOptions = {
  db?: boolean;
  cot?: boolean;
  artifact?: boolean;
  history?: boolean;
  textToImage?: boolean;
  viewText?: boolean;
};

export const createTest3 = (options: TestOptions = {}) => {
  const { db, cot, artifact, history, textToImage, viewText } = options;

  const nodes: Shape[] = [
    createChat({ id: 'chat', ...createLayout({ x: -18, y: 0 }) }),
    ...(artifact
      ? [
          createConstant({
            id: 'systemPrompt',
            ...createLayout({ x: -18, y: -11, width: 8, height: 8 }),
            value: ARTIFACTS_SYSTEM_PROMPT,
          }),
          createView({ id: 'artifact', ...createLayout({ x: 19, y: -10, width: 10, height: 10 }) }),
        ]
      : []),
    createGpt({ id: 'gpt', ...createLayout({ x: 0, y: -8 }) }),
    ...(history
      ? [
          createConstant({
            id: 'history',
            ...createLayout({ x: -18, y: 9, width: 8, height: 5 }),
            value: new DXN(DXN.kind.QUEUE, ['data', SpaceId.random(), ObjectId.random()]).toString(),
          }),
        ]
      : []),
    ...(history
      ? [createList({ id: 'thread', text: 'History', ...createLayout({ x: -7, y: 9, width: 10, height: 10 }) })]
      : []),
    ...(history ? [createAppend({ id: 'append', ...createLayout({ x: 19, y: 12 }) })] : []),
    ...(viewText ? [createView({ id: 'text', ...createLayout({ x: 19, y: 2, width: 10, height: 10 }) })] : []),
    ...(db ? [createDatabase({ id: 'db', ...createLayout({ x: -10, y: 4 }) })] : []),
    ...(textToImage ? [createTextToImage({ id: 'text-to-image', ...createLayout({ x: -10, y: -14 }) })] : []),
    ...(cot ? [createList({ id: 'cot', ...createLayout({ x: 0, y: -10, width: 8, height: 10 }) })] : []),
    ...(history ? [createJson({ id: 'history-json', ...createLayout({ x: 7, y: 9, width: 10, height: 10 }) })] : []),
  ];

  const edges: Omit<Connection, 'id'>[] = [
    { source: 'chat', target: 'gpt', input: 'prompt', output: DEFAULT_OUTPUT },
    ...(artifact ? [{ source: 'systemPrompt', target: 'gpt', output: DEFAULT_OUTPUT, input: 'systemPrompt' }] : []),
    ...(viewText ? [{ source: 'gpt', target: 'text', output: 'text', input: DEFAULT_INPUT }] : []),
    ...(history ? [{ source: 'history', target: 'thread', output: DEFAULT_OUTPUT, input: DEFAULT_INPUT }] : []),
    ...(history ? [{ source: 'thread', target: 'gpt', output: 'items', input: 'history' }] : []),
    ...(history ? [{ source: 'thread', target: 'history-json', output: 'id', input: DEFAULT_INPUT }] : []),
    ...(history ? [{ source: 'history-json', target: 'append', output: DEFAULT_OUTPUT, input: 'id' }] : []),
    ...(history ? [{ source: 'gpt', target: 'append', output: 'messages', input: 'items' }] : []),
    ...(db ? [{ source: 'db', target: 'gpt', input: 'tools', output: DEFAULT_OUTPUT }] : []),
    ...(textToImage ? [{ source: 'text-to-image', target: 'gpt', input: 'tools', output: DEFAULT_OUTPUT }] : []),
    ...(cot ? [{ source: 'gpt', target: 'cot', output: 'cot', input: DEFAULT_INPUT }] : []),
    ...(artifact ? [{ source: 'gpt', target: 'artifact', output: 'artifact', input: DEFAULT_INPUT }] : []),
  ];

  return CanvasGraphModel.create<ComputeShape>({
    nodes: nodes.map((data) => data),
    edges: edges.map(({ source, target, ...rest }) => ({
      id: createEdgeId({ source, target }),
      source,
      target,
      ...rest,
    })),
  });
};

export const createTest4 = () => {
  const model = CanvasGraphModel.create<ComputeShape>();
  model.builder.call(({ model }) => {
    const a = model.createNode(createAudio(createLayout({ x: -4, y: -4 })));
    const b = model.createNode(createScope(createLayout({ x: 4, y: -4 })));
    model.createEdge({ source: a.id, target: b.id });
  });

  return model;
};

export const createGPTRealtime = () => {
  return CanvasGraphModel.create<ComputeShape>({
    nodes: [createGptRealtime(createLayout({ x: 0, y: 0 }))],
  });
};

// TODO(burdon): Reconcile with useGraphMonitor.
export const createMachine = (graph?: CanvasGraphModel<ComputeShape>, services?: Partial<Services>) => {
  const machine = new StateMachine(ComputeGraphModel.create());
  machine.setServices(services ?? {});

  // TODO(burdon): Factor out mapping (reconcile with Editor.stories).
  if (graph) {
    for (const shape of graph.nodes) {
      if (isValidComputeNode(shape.type)) {
        const node = createComputeNode(shape);
        machine.addNode(node);
        shape.node = node.id;
      }
    }

    for (const edge of graph.edges) {
      machine.addEdge(mapEdge(graph, edge));
    }
  }

  return { machine, graph };
};

export type ServiceEndpoints = {
  edge: string;
  ai: string;
};

/**
 * pnpm -w nx dev edge --port 8787
 * pnpm -w nx dev ai-service --port 8788
 */
// eslint-disable-next-line unused-imports/no-unused-vars
const localServiceEndpoints = {
  edge: 'http://localhost:8787',
  ai: 'http://localhost:8788',
};

// eslint-disable-next-line unused-imports/no-unused-vars
const remoteServiceEndpoints = {
  edge: 'https://edge.dxos.workers.dev',
  ai: 'https://ai-service.dxos.workers.dev',
};

export const createServices = (services: ServiceEndpoints = localServiceEndpoints) => {
  return {
    gpt: new EdgeGpt(new AIServiceClientImpl({ endpoint: services.ai })),
    edgeClient: new EdgeClient(createStubEdgeIdentity(), { socketEndpoint: services.edge }),
    edgeHttpClient: new EdgeHttpClient(services.edge),
  };
};

const ARTIFACTS_SYSTEM_PROMPT = `
You are an advanced AI assistant capable of creating and managing artifacts from available data and tools. 

Your task is to process user input and decide whether to create artifacts or handle the content normally. 

Follow these guidelines carefully:

1. User Input:
Read the users message.

2. Artifact Creation:
- Determine if the content should be an artifact. Prefer artifacts for tables, lists, images, and other structured data.
- If you decide to create an artifact, use <artifact> tags to enclose the content.
- Artifacts must be presented in their entirety without separating content blocks or calling external tools.

3. Image Handling:
- When presenting an image, you must use an artifact.
- Nest the <image> tag inside the <artifact> tag.
- Image tags are always self-closing and must contain an id attribute.
(Example: <artifact><image id="unique_identifier" prompt="..." /></artifact>)

4. Artifact Rules:
- Ensure that artifact tags are always balanced (i.e., each opening tag has a corresponding closing tag).
- Artifacts cannot be nested within other artifacts.

5. Decision Process:
Before responding, use <cot> tags to explain your reasoning about whether to create an artifact and how to structure your response. Include the following steps:
a) Analyze the structure and type of the content in the user's message.
b) Identify any elements that could benefit from being presented as an artifact (e.g., tables, lists, images, structured data).
c) Evaluate the potential benefits of creating an artifact vs. normal processing for each identified element.
d) Make a final decision on whether to create an artifact and explain your reasoning.
e) If creating an artifact, outline how you will structure it within the response.

6. Output Format:
Your response should follow this structure:
<cot>
[Your detailed decision-making process following steps a-e]
</cot>

[Your response, using <artifact> tags if necessary]

Remember to adhere to all the rules and guidelines provided. If you're unsure about creating an artifact, err on the side of normal processing.
`.trim();
