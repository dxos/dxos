//
// Copyright 2024 DXOS.org
//

import { ObjectId } from '@dxos/echo-schema';
import { DXN, SpaceId } from '@dxos/keys';
import { type Dimension, type Point } from '@dxos/react-ui-canvas';

import { ARTIFACTS_SYSTEM_PROMPT } from './prompts';
import { pointMultiply, pointsToRect, rectToPoints } from '../../layout';
import { createNote } from '../../shapes';
import { CanvasGraphModel } from '../../types';
import { StateMachine, type Services } from '../graph';
import { createComputeGraph } from '../hooks';
import {
  type ComputeShape,
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
  createNot,
  createOr,
  createQueue,
  createRandom,
  createScope,
  createSwitch,
  createSurface,
  createTextToImage,
  createText,
} from '../shapes';

export const createMachine = (graph: CanvasGraphModel<ComputeShape>, services?: Partial<Services>) => {
  const computeGraph = createComputeGraph(graph);
  const machine = new StateMachine(computeGraph);
  machine.setServices(services ?? {});
  return { machine, graph };
};

//
// Circuits
//

export const createBasicCircuit = () => {
  const model = CanvasGraphModel.create<ComputeShape>();
  model.builder.call(({ model }) => {
    const a = model.createNode(createSwitch(position({ x: -4, y: 0 })));
    const b = model.createNode(createBeacon(position({ x: 4, y: 0 })));
    const c = model.createNode(createBeacon(position({ x: 4, y: 4 })));
    const d = model.createNode(createNot(position({ x: 0, y: 4 })));

    model.createEdge({ source: a.id, target: b.id });
    model.createEdge({ source: d.id, target: c.id });
  });

  return model;
};

export const createTransformCircuit = () => {
  const model = CanvasGraphModel.create<ComputeShape>();
  model.builder.call(({ model }) => {
    const a = model.createNode(createRandom(position({ x: -8, y: -3 })));
    const b = model.createNode(createConstant({ value: '$[?(@ > 0.5)]', ...position({ x: -8, y: 2 }) }));
    const c = model.createNode(createJsonTransform(position({ x: 0, y: 0 })));
    const d = model.createNode(createBeacon(position({ x: 8, y: 0 })));

    model.builder
      // TODO(burdon): Make id optional.
      .createNode(createNote({ id: ObjectId.random(), text: 'Random number generator', ...position({ x: 0, y: -6 }) }))
      .createEdge({ source: a.id, target: c.id })
      .createEdge({ source: b.id, target: c.id, input: 'expression' })
      .createEdge({ source: c.id, target: d.id });
  });

  return model;
};

export const createLogicCircuit = () => {
  const model = CanvasGraphModel.create<ComputeShape>();
  model.builder.call(({ model }) => {
    const a1 = model.createNode(createSwitch(position({ x: -4, y: -4 })));
    const a2 = model.createNode(createSwitch(position({ x: -4, y: 0 })));
    const a3 = model.createNode(createSwitch(position({ x: -4, y: 4 })));
    const b1 = model.createNode(createAnd(position({ x: 0, y: -2 })));
    const c1 = model.createNode(createOr(position({ x: 4, y: 0 })));
    const d1 = model.createNode(createBeacon(position({ x: 8, y: 0 })));

    model.builder
      .createEdge({ source: a1.id, target: b1.id, input: 'a' })
      .createEdge({ source: a2.id, target: b1.id, input: 'b' })
      .createEdge({ source: b1.id, target: c1.id, input: 'a' })
      .createEdge({ source: a3.id, target: c1.id, input: 'b' })
      .createEdge({ source: c1.id, target: d1.id });
  });

  return model;
};

export const createControlCircuit = () => {
  const model = CanvasGraphModel.create<ComputeShape>();
  model.builder.call((builder) => {
    const model = builder.model;

    const s = model.createNode(createSwitch(position({ x: -9, y: -1 })));
    const c1 = model.createNode(createConstant({ value: 'hello', ...position({ x: -10, y: -10 }) }));
    const c2 = model.createNode(createConstant({ value: 'world', ...position({ x: -10, y: -5 }) }));
    const c3 = model.createNode(createConstant({ value: true, ...position({ x: -10, y: 3 }) }));
    const if1 = model.createNode(createIf(position({ x: 0, y: 1 })));
    const if2 = model.createNode(createIfElse(position({ x: 0, y: -8 })));
    const b1 = model.createNode(createBeacon(position({ x: 9, y: -1 })));
    const b2 = model.createNode(createBeacon(position({ x: 9, y: 3 })));
    const j = model.createNode(createJson(position({ x: 12, y: -8 })));

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

export const createGptCircuit = (options: {
  db?: boolean;
  cot?: boolean;
  image?: boolean;
  history?: boolean;
  artifact?: boolean;
}) => {
  const model = CanvasGraphModel.create<ComputeShape>();
  model.builder.call((builder) => {
    const gpt = model.createNode(createGpt(position({ x: 0, y: -14 })));
    const chat = model.createNode(createChat(position({ x: -18, y: -2 })));
    const text = model.createNode(createText(position({ x: 19, y: 3, width: 10, height: 10 })));
    builder
      .createEdge({ source: chat.id, target: gpt.id, input: 'prompt' })
      .createEdge({ source: gpt.id, target: text.id, output: 'text' });

    if (options.history) {
      const queue = model.createNode(
        createConstant({
          value: new DXN(DXN.kind.QUEUE, ['data', SpaceId.random(), ObjectId.random()]).toString(),
          ...position({ x: -18, y: 5, width: 8, height: 6 }),
        }),
      );

      const thread = model.createNode(createQueue(position({ x: -3, y: 3, width: 14, height: 10 })));
      const append = model.createNode(createAppend(position({ x: 10, y: 6 })));

      builder
        .createEdge({ source: queue.id, target: thread.id })
        .createEdge({ source: queue.id, target: append.id, input: 'id' })
        .createEdge({ source: gpt.id, target: append.id, output: 'messages', input: 'items' });
    }

    if (options.artifact) {
      const prompt = model.createNode(
        // TODO(burdon): Change to template.
        // createTemplate({ text: ARTIFACTS_SYSTEM_PROMPT }),
        createConstant({
          value: ARTIFACTS_SYSTEM_PROMPT,
          ...position({ x: -18, y: -12, width: 8, height: 10 }),
        }),
      );
      const artifact = model.createNode(createSurface(position({ x: 17, y: -10, width: 14, height: 14 })));

      builder
        .createEdge({ source: prompt.id, target: gpt.id, input: 'systemPrompt' })
        .createEdge({ source: gpt.id, target: artifact.id, output: 'artifact' });
    }

    if (options.cot) {
      const cot = model.createNode(createText(position({ x: 0, y: -10, width: 8, height: 10 })));
      builder.createEdge({ source: gpt.id, target: cot.id, output: 'cot' });
    }

    if (options.db) {
      const database = model.createNode(createDatabase(position({ x: -10, y: 4 })));
      builder.createEdge({ source: database.id, target: gpt.id, input: 'tools' });
    }

    if (options.image) {
      const tool = model.createNode(createTextToImage(position({ x: -8, y: -16 })));
      builder.createEdge({ source: tool.id, target: gpt.id, input: 'tools' });
    }
  });

  return model;
};

export const createGPTRealtimeCircuit = () => {
  return CanvasGraphModel.create<ComputeShape>({
    nodes: [createGptRealtime(position({ x: 0, y: 0 }))],
  });
};

export const createAudioCircuit = () => {
  const model = CanvasGraphModel.create<ComputeShape>();
  model.builder.call(({ model }) => {
    const a = model.createNode(createAudio(position({ x: -4, y: -4 })));
    const b = model.createNode(createScope(position({ x: 4, y: -4 })));
    model.createEdge({ source: a.id, target: b.id });
  });

  return model;
};

//
// Utils
//

const position = (rect: Point & Partial<Dimension>, snap = 32): { center: Point; size?: Dimension } => {
  const [center, size] = rectToPoints({ width: 0, height: 0, ...rect });
  const { x, y, width, height } = pointsToRect([pointMultiply(center, snap), pointMultiply(size, snap)]);
  if (width && height) {
    return { center: { x, y }, size: width && height ? { width, height } : undefined };
  } else {
    return { center: { x, y } };
  }
};