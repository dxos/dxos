//
// Copyright 2024 DXOS.org
//

import { ComputeGraphModel } from '@dxos/conductor';
import { ObjectId } from '@dxos/echo-schema';
import { type GraphEdge, GraphModel, type GraphNode, createEdgeId } from '@dxos/graph';
import { failedInvariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type Dimension, type Point } from '@dxos/react-ui-canvas';

import { createComputeNode, DEFAULT_INPUT, DEFAULT_OUTPUT, StateMachine, type Services } from './graph';
import {
  createAnd,
  createAppend,
  createBeacon,
  createChat,
  createConstant,
  createDatabase,
  createGpt,
  createJson,
  createList,
  createOr,
  createSwitch,
  createText,
  createTextToImage,
  createView,
} from './shapes';
import { type ComputeShape } from './shapes';
import { pointMultiply, pointsToRect, rectToPoints } from '../layout';
import { createCanvasGraphModel, type Connection, type Shape } from '../types';

// TODO(burdon): LayoutBuilder.
const layout = (rect: Point & Partial<Dimension>, snap = 32): { center: Point; size?: Dimension } => {
  const [center, size] = rectToPoints({ width: 0, height: 0, ...rect });
  const { x, y, width, height } = pointsToRect([pointMultiply(center, snap), pointMultiply(size, snap)]);
  if (width && height) {
    return { center: { x, y }, size: width && height ? { width, height } : undefined };
  } else {
    return { center: { x, y } };
  }
};

// TODO(burdon): GraphBuilder.
export const createTest1 = () => {
  const nodes: ComputeShape[] = [
    createSwitch({ id: 'a1', center: { x: -256, y: -256 } }),
    createSwitch({ id: 'a2', center: { x: -256, y: -92 } }),
    createSwitch({ id: 'a3', center: { x: -256, y: 92 } }),
    createAnd({ id: 'b1', center: { x: 0, y: -192 } }),
    createOr({ id: 'c1', center: { x: 256, y: 0 } }),
    createBeacon({ id: 'd1', center: { x: 512, y: 0 } }),
  ];

  const edges: Omit<GraphEdge<Partial<Connection>>, 'id'>[] = [
    { source: 'a1', target: 'b1', data: { input: 'a' } },
    { source: 'a2', target: 'b1', data: { input: 'b' } },
    { source: 'b1', target: 'c1', data: { input: 'a' } },
    { source: 'a3', target: 'c1', data: { input: 'b' } },
    { source: 'c1', target: 'd1', data: {} },
  ];

  return new GraphModel<GraphNode<ComputeShape>, GraphEdge<Connection>>({
    nodes: nodes.map((data) => ({ id: data.id, data })),
    edges: edges.map(({ source, target, data: { output = DEFAULT_OUTPUT, input = DEFAULT_INPUT } }) => ({
      id: createEdgeId({ source: `${source}/${output}`, target: `${target}/${input}` }),
      source,
      target,
      data: { output, input },
    })),
  });
};

export const createTest2 = () => {
  const nodes: Shape[] = [
    // createTimer({ id: 'a', center: { x: -256, y: 0 } }),
    // createFunction({ id: 'b', center: { x: 0, y: 0 } }),
    createAnd({ id: 'c', center: { x: 0, y: -256 } }),
    createBeacon({ id: 'd', center: { x: 256, y: -256 } }),
    createSwitch({ id: 'e', center: { x: -256, y: -256 } }),
  ];

  const edges = [
    { source: 'a', target: 'b', data: { input: 'input' } },
    { source: 'e', target: 'c', data: { input: 'a' } },
    { source: 'b', target: 'c', data: { input: 'b', output: 'result' } },
    { source: 'c', target: 'd' },
  ];

  return createCanvasGraphModel({
    nodes: nodes.map((data) => ({ id: data.id, data })),
    edges: edges.map(({ source, target, data }) => ({
      id: createEdgeId({ source, target }),
      source,
      target,
      data,
    })),
  });
};

export const createTest3 = ({
  cot = false,
  history = false,
  artifact = false,
  db = false,
  textToImage = false,
  viewText = false,
}: {
  db?: boolean;
  cot?: boolean;
  artifact?: boolean;
  history?: boolean;
  textToImage?: boolean;
  viewText?: boolean;
} = {}) => {
  const nodes: Shape[] = [
    createChat({ id: 'chat', ...layout({ x: -12, y: 0 }) }),
    ...(artifact
      ? [
          createConstant({
            id: 'systemPrompt',
            ...layout({ x: -12, y: -10, width: 8, height: 4 }),
            value: ARTIFACTS_SYSTEM_PROMPT,
          }),
          createView({ id: 'artifact', ...layout({ x: 26, y: -10, width: 12, height: 12 }) }),
        ]
      : []),
    createGpt({ id: 'gpt', ...layout({ x: 0, y: 0 }) }),
    ...(history
      ? [
          createConstant({
            id: 'history',
            ...layout({ x: -18, y: 14, width: 8, height: 4 }),
            value: ObjectId.random(),
          }),
        ]
      : []),
    ...(history
      ? [createList({ id: 'thread', text: 'History', ...layout({ x: -6, y: 14, width: 8, height: 12 }) })]
      : []),
    ...(history ? [createAppend({ id: 'append', ...layout({ x: 20, y: 14 }) })] : []),
    ...(viewText ? [createView({ id: 'text', ...layout({ x: 16, y: 0, width: 12, height: 12 }) })] : []),
    ...(db ? [createDatabase({ id: 'db', ...layout({ x: -10, y: 4 }) })] : []),
    ...(textToImage ? [createTextToImage({ id: 'text-to-image', ...layout({ x: -10, y: 5 }) })] : []),
    ...(cot ? [createList({ id: 'cot', ...layout({ x: 0, y: -10, width: 8, height: 12 }) })] : []),
    ...(history ? [createJson({ id: 'history-json', ...layout({ x: 8, y: 14, width: 12, height: 12 }) })] : []),
  ];

  const edges: Omit<GraphEdge<Connection>, 'id'>[] = [
    { source: 'chat', target: 'gpt', data: { input: 'prompt', output: DEFAULT_OUTPUT } },
    ...(artifact
      ? [{ source: 'systemPrompt', target: 'gpt', data: { output: DEFAULT_OUTPUT, input: 'systemPrompt' } }]
      : []),
    // { source: 'gpt', target: 'c', data: { output: 'result', input: DEFAULT_INPUT } },
    // { source: 'gpt', target: 'd', data: { output: 'tokens', input: DEFAULT_INPUT } },
    ...(viewText ? [{ source: 'gpt', target: 'text', data: { output: 'text', input: DEFAULT_INPUT } }] : []),
    ...(history
      ? [{ source: 'history', target: 'thread', data: { output: DEFAULT_OUTPUT, input: DEFAULT_INPUT } }]
      : []),
    ...(history ? [{ source: 'thread', target: 'gpt', data: { output: 'items', input: 'history' } }] : []),
    ...(history ? [{ source: 'thread', target: 'history-json', data: { output: 'id', input: DEFAULT_INPUT } }] : []),
    ...(history ? [{ source: 'history-json', target: 'append', data: { output: DEFAULT_OUTPUT, input: 'id' } }] : []),
    ...(history ? [{ source: 'gpt', target: 'append', data: { output: 'messages', input: 'items' } }] : []),
    ...(db ? [{ source: 'db', target: 'gpt', data: { input: 'tools', output: DEFAULT_OUTPUT } }] : []),
    ...(textToImage
      ? [{ source: 'text-to-image', target: 'gpt', data: { input: 'tools', output: DEFAULT_OUTPUT } }]
      : []),
    ...(cot ? [{ source: 'gpt', target: 'cot', data: { output: 'cot', input: DEFAULT_INPUT } }] : []),
    ...(artifact ? [{ source: 'gpt', target: 'artifact', data: { output: 'artifact', input: DEFAULT_INPUT } }] : []),
  ];

  return new GraphModel<GraphNode<ComputeShape>, GraphEdge<Connection>>({
    nodes: nodes.map((data) => ({ id: data.id, data })),
    edges: edges.map(({ source, target, data }) => ({
      id: createEdgeId({ source, target }),
      source,
      target,
      data,
    })),
  });
};

// TODO(burdon): Break-apart state machine and graph.
export const createMachine = (
  graph?: GraphModel<GraphNode<ComputeShape>, GraphEdge<Connection>>,
  services?: Partial<Services>,
) => {
  const machine = new StateMachine(ComputeGraphModel.create());
  machine.setServices(services ?? {});

  // TODO(burdon): Factor out mapping (reconcile with Editor.stories).
  if (graph) {
    for (const shape of graph.nodes) {
      log('create', { shape });
      const node = createComputeNode(shape);
      machine.addNode(node);
      shape.data.node = node.id;
    }

    for (const edge of graph.edges) {
      const data = (edge.data ?? {}) as Connection;
      const { output, input } = data;

      const source = graph.getNode(edge.source);
      const target = graph.getNode(edge.target);

      const sourceId = source.data.node ?? failedInvariant();
      const targetId = target.data.node ?? failedInvariant();

      machine.addEdge({
        id: ObjectId.random(),
        source: sourceId,
        target: targetId,
        data: { output, input },
      });
    }
  }

  return { machine, graph };
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
