//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/compute/Operation';
import { DXN, Type } from '@dxos/echo';
import * as Presentation from '@dxos/plugin-presenter/Presentation';
import * as Variant from '@dxos/plugin-studio/Variant';

const TakeInput = Schema.Struct({
  slide: Type.getSchema(Presentation.Slide).annotate({ description: 'The slide the take voices.' }),
  take: Type.getSchema(Variant.Variant).annotate({ description: 'The take.' }),
});

export const DeleteTakeOutput = Schema.Struct({
  slide: Type.getSchema(Presentation.Slide),
  take: Type.getSchema(Variant.Variant),
  index: Schema.Number.annotate({ description: 'Where the take was among the takes of the slide.' }),
  main: Schema.Boolean.annotate({ description: 'Whether it was the main take of the slide.' }),
});

export type DeleteTakeOutput = Schema.Schema.Type<typeof DeleteTakeOutput>;

export const DeleteTake = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.recorder.deleteTake'),
    name: 'Delete Take',
    description: 'Deletes a recorded take of a slide; the newest remaining take becomes main if it was.',
    icon: 'ph--trash--regular',
  },
  input: TakeInput,
  output: DeleteTakeOutput,
}).pipe(Operation.mutation('destructive'));

export const RestoreTake = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.recorder.restoreTake'),
    name: 'Restore Take',
    icon: 'ph--clock-counter-clockwise--regular',
  },
  input: DeleteTakeOutput,
  output: Schema.Void,
});

export const SelectTake = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.recorder.selectTake'),
    name: 'Select Take',
    description:
      'Marks a take as the main take of its slide: the one used when the voice-over of the presentation is played or exported.',
    icon: 'ph--star--regular',
  },
  input: TakeInput,
  output: Schema.Void,
});
