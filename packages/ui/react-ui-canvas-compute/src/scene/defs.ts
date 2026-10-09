//
// Copyright 2026 DXOS.org
//

//
// The compute shapes as scene-engine node definitions (MIGRATION.md M3): each `ShapeDef` becomes a
// `NodeDef` whose schema is the shape's with the engine's `z`, whose view renders the shape component
// unchanged, and whose ports come from the shape's anchors. The palette groups mirror the editor's.
//

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import * as TriggerEvent from '@dxos/compute/TriggerEvent';
import { type ShapeDef } from '@dxos/react-ui-canvas-editor';
import {
  type CreateProps,
  type NodeBase,
  type NodeDef,
  type NodeRegistry,
  type Size,
  defaultNodeRegistry,
} from '@dxos/react-ui-canvas/scene';

import {
  AndShape,
  AppendShape,
  AudioShape,
  BeaconShape,
  ChatShape,
  type ComputeShape,
  ConstantShape,
  DatabaseShape,
  FeedShape,
  FunctionShape,
  GptRealtimeShape,
  GptShape,
  IfElseShape,
  IfShape,
  JsonShape,
  JsonTransformShape,
  NotShape,
  OrShape,
  RandomShape,
  ReducerShape,
  ScopeShape,
  SurfaceShape,
  SwitchShape,
  TemplateShape,
  TextShape,
  TextToImageShape,
  ThreadShape,
  TriggerShapeSchema,
  andShape,
  appendShape,
  audioShape,
  beaconShape,
  chatShape,
  constantShape,
  databaseShape,
  feedShape,
  functionShape,
  getHeight,
  gptRealtimeShape,
  gptShape,
  ifElseShape,
  ifShape,
  jsonShape,
  jsonTransformShape,
  notShape,
  orShape,
  randomShape,
  reducerShape,
  scopeShape,
  surfaceShape,
  switchShape,
  templateShape,
  textShape,
  textToImageShape,
  threadShape,
  triggerShape,
} from '../shapes/index.ts';
import { computeNodeView } from './NodeView.tsx';
import { anchorsToPorts } from './ports.ts';

/** The shape's schema with the engine's z-order key, so it is a node schema. */
const withZ = <Fields extends Schema.Struct.Fields>(shape: Schema.Struct<Fields>) =>
  shape.mapFields(Struct.assign({ z: Schema.String }));

type Entry = { group: string; def: NodeDef };

/** `schema` is the shape's with `z` (`withZ`), applied at the call site so each stays a concrete struct. */
const entry = <S extends ComputeShape>(
  group: string,
  shape: ShapeDef<S>,
  schema: Schema.Codec<S & { z: string }, unknown, never, never>,
  defaultSize: Size = shape.createShape({ id: 'default', center: { x: 0, y: 0 } }).size,
): Entry => ({
  group,
  def: {
    type: shape.type,
    name: shape.name,
    icon: shape.icon,
    group,
    schema,
    component: computeNodeView(schema, shape.component),
    create: ({ id, z, center, size }: CreateProps): NodeBase => ({ ...shape.createShape({ id, center }), z, size }),
    defaultSize,
    ports: (node) => (isShapeOf(schema, node) ? anchorsToPorts(shape.getAnchors?.(node) ?? {}, node.size) : []),
    resizable: shape.resizable,
    openable: shape.openable,
  },
});

const isShapeOf = <S extends ComputeShape>(
  schema: Schema.Codec<S, unknown, never, never>,
  node: NodeBase,
): node is NodeBase & S => Schema.is(schema)(node);

/** Palette order, as the editor's `computeShapes`. */
const entries: Entry[] = [
  entry('Inputs', constantShape, withZ(ConstantShape)),
  entry('Inputs', templateShape, withZ(TemplateShape)),
  entry('Inputs', chatShape, withZ(ChatShape)),
  entry('Inputs', switchShape, withZ(SwitchShape)),
  entry('Inputs', audioShape, withZ(AudioShape)),
  // A trigger's `createShape` makes an ECHO object, so its default size is stated rather than sampled.
  entry('Inputs', triggerShape, withZ(TriggerShapeSchema), { width: 192, height: getHeight(TriggerEvent.EmailEvent) }),
  entry('Inputs', randomShape, withZ(RandomShape)),
  entry('Transform', gptShape, withZ(GptShape)),
  entry('Transform', gptRealtimeShape, withZ(GptRealtimeShape)),
  entry('Transform', functionShape, withZ(FunctionShape)),
  entry('Transform', databaseShape, withZ(DatabaseShape)),
  entry('Transform', textToImageShape, withZ(TextToImageShape)),
  entry('Transform', appendShape, withZ(AppendShape)),
  entry('Operations', ifShape, withZ(IfShape)),
  entry('Operations', ifElseShape, withZ(IfElseShape)),
  entry('Operations', andShape, withZ(AndShape)),
  entry('Operations', orShape, withZ(OrShape)),
  entry('Operations', notShape, withZ(NotShape)),
  entry('Operations', reducerShape, withZ(ReducerShape)),
  entry('Operations', jsonTransformShape, withZ(JsonTransformShape)),
  entry('Outputs', jsonShape, withZ(JsonShape)),
  entry('Outputs', feedShape, withZ(FeedShape)),
  entry('Outputs', threadShape, withZ(ThreadShape)),
  entry('Outputs', textShape, withZ(TextShape)),
  entry('Outputs', surfaceShape, withZ(SurfaceShape)),
  entry('Outputs', beaconShape, withZ(BeaconShape)),
  entry('Outputs', scopeShape, withZ(ScopeShape)),
];

export const computeNodeDefs: NodeDef[] = entries.map(({ def }) => def);

/** The compute types plus the engine's note under a `Misc` group. */
export const computeNodeRegistry: NodeRegistry = {
  ...Object.fromEntries(computeNodeDefs.map((def) => [def.type, def])),
  note: { ...defaultNodeRegistry.note, group: 'Misc' },
};
