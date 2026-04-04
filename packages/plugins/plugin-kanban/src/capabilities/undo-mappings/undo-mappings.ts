// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { Capabilities, Capability, UndoMapping } from '@dxos/app-framework';

import { meta } from '../../meta';
import { KanbanOperation } from '../../operations';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.UndoMapping, [
      UndoMapping.make({
        operation: KanbanOperation.DeleteCardField,
        inverse: KanbanOperation.RestoreCardField,
        deriveContext: (input, output) => ({
          view: input.view,
          field: output.field,
          props: output.props,
          index: output.index,
        }),
        message: ['card-field-deleted.label', { ns: meta.id }],
      }),
      UndoMapping.make({
        operation: KanbanOperation.DeleteCard,
        inverse: KanbanOperation.RestoreCard,
        deriveContext: (_input, output) => ({
          card: output.card,
        }),
        message: ['card-deleted.label', { ns: meta.id }],
      }),
    ]),
  ),
);
