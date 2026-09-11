//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import { type ShapeDef, createAnchorMap } from '@dxos/react-ui-canvas-editor';

import { AudioComponent } from './Audio.tsx';
import { ComputeShape, type CreateShapeProps, createAnchorId, createShape } from './defs.ts';

// Kept out of `Audio.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on every edit.

export const AudioShape = ComputeShape.mapFields(
  Struct.assign({
    type: Schema.Literal('audio'),
  }),
);

export type AudioShape = Schema.Schema.Type<typeof AudioShape>;

export type CreateAudioProps = CreateShapeProps<AudioShape>;

export const createAudio = (props: CreateAudioProps) =>
  createShape<AudioShape>({ type: 'audio', size: { width: 64, height: 64 }, ...props });

export const audioShape: ShapeDef<AudioShape> = {
  type: 'audio',
  name: 'Audio',
  icon: 'ph--microphone--regular',
  component: AudioComponent,
  createShape: createAudio,
  getAnchors: (shape) => createAnchorMap(shape, { [createAnchorId('output')]: { x: 1, y: 0 } }),
};
