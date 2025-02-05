//
// Copyright 2025 DXOS.org
//

import { type ComputeGraphModel, EmailTriggerOutput, NODE_INPUT } from '@dxos/conductor';
import { AST, ObjectId, S, toJsonSchema } from '@dxos/echo-schema';
import { FunctionTrigger, TriggerKind } from '@dxos/functions/types';
import { invariant } from '@dxos/invariant';
import { DXN, SpaceId } from '@dxos/keys';
import { create, makeRef } from '@dxos/live-object';
import { Filter, type Space } from '@dxos/react-client/echo';
import {
  type ComputeShape,
  createAppend,
  createChat,
  createComputeGraph,
  createConstant,
  createGpt,
  createQueue,
  createTemplate,
  createText,
  createTrigger,
} from '@dxos/react-ui-canvas-compute';
import {
  CanvasBoardType,
  CanvasGraphModel,
  pointMultiply,
  pointsToRect,
  rectToPoints,
} from '@dxos/react-ui-canvas-editor';
import { TableType } from '@dxos/react-ui-table';
import { range } from '@dxos/util';

import { type ObjectGenerator } from './ObjectGenerator';

export enum PresetName {
  EMAIL_TABLE = 'email-table',
  GPT_QUEUE = 'webhook-gpt-queue',
  CHAT_GPT = 'chat-gpt-text',
  EMAIL_WITH_SUMMARY = 'email-gptSummary-table',
}

export const presets = {
  schemas: [CanvasBoardType, FunctionTrigger],
  types: Object.values(PresetName).map((name) => ({ typename: name })),
  items: [
    [
      PresetName.GPT_QUEUE,
      async (space, n, cb) => {
        const objects = range(n, () => {
          const canvasModel = CanvasGraphModel.create<ComputeShape>();

          let functionTrigger: FunctionTrigger | undefined;
          canvasModel.builder.call((builder) => {
            const gpt = canvasModel.createNode(createGpt(position({ x: 0, y: -14 })));
            const triggerShape = createTrigger({ triggerKind: TriggerKind.Webhook, ...position({ x: -18, y: -2 }) });
            const trigger = canvasModel.createNode(triggerShape);
            const text = canvasModel.createNode(createText(position({ x: 19, y: 3, width: 10, height: 10 })));
            const queueId = canvasModel.createNode(
              createConstant({
                value: new DXN(DXN.kind.QUEUE, ['data', SpaceId.random(), ObjectId.random()]).toString(),
                ...position({ x: -18, y: 5, width: 8, height: 6 }),
              }),
            );
            const queue = canvasModel.createNode(createQueue(position({ x: -3, y: 3, width: 14, height: 10 })));
            const append = canvasModel.createNode(createAppend(position({ x: 10, y: 6 })));

            builder
              .createEdge({ source: trigger.id, target: gpt.id, input: 'prompt', output: 'body' })
              .createEdge({ source: gpt.id, target: text.id, output: 'text' })
              .createEdge({ source: queueId.id, target: queue.id })
              .createEdge({ source: queueId.id, target: append.id, input: 'id' })
              .createEdge({ source: gpt.id, target: append.id, output: 'messages', input: 'items' });

            functionTrigger = triggerShape.functionTrigger!.target!;
          });

          const computeModel = createComputeGraph(canvasModel);

          attachTrigger(functionTrigger, computeModel);

          return addToSpace(space, canvasModel, computeModel);
        });
        cb?.(objects);
        return objects;
      },
    ],

    [
      PresetName.EMAIL_TABLE,
      async (space, n, cb) => {
        const objects = range(n, () => {
          const canvasModel = CanvasGraphModel.create<ComputeShape>();

          const results = space.db.query(Filter.schema(TableType)).runSync();
          const emailTable = results.find((r) => r.object?.view?.target?.query?.type?.endsWith('Email'));
          invariant(emailTable, 'Email table not found.');

          const template = canvasModel.createNode(
            createTemplate({
              valueType: 'object',
              ...rawPosition({ centerX: -80, centerY: -64, width: 320, height: 320 }),
            }),
          );
          const templateContent = ['{'];

          let functionTrigger: FunctionTrigger | undefined;
          canvasModel.builder.call((builder) => {
            const triggerShape = createTrigger({ triggerKind: TriggerKind.Email, ...position({ x: -18, y: -2 }) });
            const trigger = canvasModel.createNode(triggerShape);

            const tableId = canvasModel.createNode(
              createConstant({
                value: DXN.fromLocalObjectId(emailTable.id).toString(),
                ...position({ x: -18, y: 5, width: 8, height: 6 }),
              }),
            );

            const appendToTable = canvasModel.createNode(createAppend(position({ x: 10, y: 6 })));

            const properties = AST.getPropertySignatures(EmailTriggerOutput.ast);
            for (let i = 0; i < properties.length; i++) {
              const propName = properties[i].name.toString();
              builder.createEdge({ source: trigger.id, target: template.id, input: propName, output: propName });
              templateContent.push(`  "${propName}": "{{${propName}}}"` + (i === properties.length - 1 ? '' : ','));
            }
            templateContent.push('}');

            builder
              .createEdge({ source: tableId.id, target: appendToTable.id, input: 'id' })
              .createEdge({ source: template.id, target: appendToTable.id, input: 'items' });

            functionTrigger = triggerShape.functionTrigger!.target!;
          });

          const computeModel = createComputeGraph(canvasModel);

          const templateComputeNode = computeModel.nodes.find((n) => n.id === template.node);
          invariant(templateComputeNode, 'Template compute node was not created.');
          templateComputeNode.value = templateContent.join('\n');
          templateComputeNode.inputSchema = toJsonSchema(EmailTriggerOutput);

          attachTrigger(functionTrigger, computeModel);

          return addToSpace(space, canvasModel, computeModel);
        });
        cb?.(objects);
        return objects;
      },
    ],

    [
      PresetName.CHAT_GPT,
      async (space, n, cb) => {
        const objects = range(n, () => {
          const canvasModel = CanvasGraphModel.create<ComputeShape>();

          canvasModel.builder.call((builder) => {
            const gpt = canvasModel.createNode(createGpt(position({ x: 0, y: -14 })));
            const chat = canvasModel.createNode(createChat(position({ x: -18, y: -2 })));
            const text = canvasModel.createNode(createText(position({ x: 19, y: 3, width: 10, height: 10 })));
            const queueId = canvasModel.createNode(
              createConstant({
                value: new DXN(DXN.kind.QUEUE, ['data', SpaceId.random(), ObjectId.random()]).toString(),
                ...position({ x: -18, y: 5, width: 8, height: 6 }),
              }),
            );
            const queue = canvasModel.createNode(createQueue(position({ x: -3, y: 3, width: 14, height: 10 })));

            const append = canvasModel.createNode(createAppend(position({ x: 10, y: 6 })));

            builder
              .createEdge({ source: chat.id, target: gpt.id, input: 'prompt' })
              .createEdge({ source: gpt.id, target: text.id, output: 'text' })
              .createEdge({ source: queueId.id, target: queue.id })
              .createEdge({ source: queueId.id, target: append.id, input: 'id' })
              .createEdge({ source: gpt.id, target: append.id, output: 'messages', input: 'items' });
          });

          const computeModel = createComputeGraph(canvasModel);

          return addToSpace(space, canvasModel, computeModel);
        });
        cb?.(objects);
        return objects;
      },
    ],

    [
      PresetName.EMAIL_WITH_SUMMARY,
      async (space, n, cb) => {
        const objects = range(n, () => {
          const canvasModel = CanvasGraphModel.create<ComputeShape>();

          const results = space.db.query(Filter.schema(TableType)).runSync();
          const emailTable = results.find((r) => r.object?.view?.target?.query?.type?.endsWith('Email'));
          invariant(emailTable, 'Email table not found.');

          const template = canvasModel.createNode(
            createTemplate({
              valueType: 'object',
              ...rawPosition({ centerX: 416, centerY: -64, width: 320, height: 320 }),
            }),
          );
          const templateContent = ['{'];

          let functionTrigger: FunctionTrigger | undefined;
          canvasModel.builder.call((builder) => {
            const gpt = canvasModel.createNode(createGpt(position({ x: 0, y: -14 })));
            const systemPrompt = canvasModel.createNode(
              createConstant({
                value: "use one word to describe content category. don't write anything else",
                ...rawPosition({ centerX: -554, centerY: -432, width: 192, height: 128 }),
              }),
            );
            const triggerShape = createTrigger({ triggerKind: TriggerKind.Email, ...position({ x: -18, y: -2 }) });
            const trigger = canvasModel.createNode(triggerShape);

            const tableId = canvasModel.createNode(
              createConstant({
                value: DXN.fromLocalObjectId(emailTable.id).toString(),
                ...position({ x: -18, y: 5, width: 8, height: 6 }),
              }),
            );

            const appendToTable = canvasModel.createNode(
              createAppend(rawPosition({ centerX: 752, centerY: 240, width: 128, height: 122 })),
            );

            templateContent.push('  "category": "{{text}}",');
            builder.createEdge({ source: gpt.id, target: template.id, input: 'text', output: 'text' });

            const properties = AST.getPropertySignatures(EmailTriggerOutput.ast);
            for (let i = 0; i < properties.length; i++) {
              const propName = properties[i].name.toString();
              builder.createEdge({ source: trigger.id, target: template.id, input: propName, output: propName });
              templateContent.push(`  "${propName}": "{{${propName}}}"` + (i === properties.length - 1 ? '' : ','));
            }
            templateContent.push('}');

            builder
              .createEdge({ source: tableId.id, target: appendToTable.id, input: 'id' })
              .createEdge({ source: systemPrompt.id, target: gpt.id, input: 'systemPrompt' })
              .createEdge({ source: trigger.id, target: gpt.id, input: 'prompt', output: 'body' })
              .createEdge({ source: template.id, target: appendToTable.id, input: 'items' });

            functionTrigger = triggerShape.functionTrigger!.target!;
          });

          const computeModel = createComputeGraph(canvasModel);

          const templateComputeNode = computeModel.nodes.find((n) => n.id === template.node);
          invariant(templateComputeNode, 'Template compute node was not created.');
          templateComputeNode.value = templateContent.join('\n');
          const extendedSchema = S.extend(EmailTriggerOutput, S.Struct({ text: S.String }));
          templateComputeNode.inputSchema = toJsonSchema(extendedSchema);

          attachTrigger(functionTrigger, computeModel);

          return addToSpace(space, canvasModel, computeModel);
        });
        cb?.(objects);
        return objects;
      },
    ],
  ] as [PresetName, ObjectGenerator<any>][],
};

const addToSpace = (space: Space, canvas: CanvasGraphModel, compute: ComputeGraphModel) => {
  return space.db.add(
    create(CanvasBoardType, {
      computeGraph: makeRef(compute.root),
      layout: canvas.graph,
    }),
  );
};

const attachTrigger = (functionTrigger: FunctionTrigger | undefined, computeModel: ComputeGraphModel) => {
  invariant(functionTrigger);
  functionTrigger.function = DXN.fromLocalObjectId(computeModel.root.id).toString();
  functionTrigger.meta ??= {};
  const inputNode = computeModel.nodes.find((node) => node.type === NODE_INPUT)!;
  functionTrigger.meta.computeNodeId = inputNode.id;
};

const rawPosition = (args: { centerX: number; centerY: number; width: number; height: number }) => {
  return { center: { x: args.centerX, y: args.centerY }, size: { width: args.width, height: args.height } };
};

const position = (rect: { x: number; y: number; width?: number; height?: number }) => {
  const snap = 32;
  const [center, size] = rectToPoints({ width: 0, height: 0, ...rect });
  const { x, y, width, height } = pointsToRect([pointMultiply(center, snap), pointMultiply(size, snap)]);
  if (width && height) {
    return { center: { x, y }, size: width && height ? { width, height } : undefined };
  } else {
    return { center: { x, y } };
  }
};
