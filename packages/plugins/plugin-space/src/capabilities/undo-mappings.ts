//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability, UndoMapping } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';

import { meta } from '../meta';
import { SpaceOperation } from '../operations';
import { SpaceOperationConfig } from '../operations/helpers';

type UndoMappingsOptions = {
  createInvitationUrl: (invitationCode: string) => string;
  observability?: boolean;
};

export default Capability.makeModule(
  Effect.fnUntraced(function* ({ createInvitationUrl, observability }: UndoMappingsOptions) {
    return [
      Capability.contributes(Capabilities.UndoMapping, [
        UndoMapping.make({
          operation: SpaceOperation.DeleteField,
          inverse: SpaceOperation.RestoreField,
          deriveContext: (input, output) => ({
            view: input.view,
            field: output.field,
            props: output.props,
            index: output.index,
          }),
          message: ['field-deleted.label', { ns: meta.id }],
        }),
        UndoMapping.make({
          operation: SpaceOperation.RemoveObjects,
          inverse: SpaceOperation.RestoreObjects,
          deriveContext: (_input, output) => ({
            objects: output.objects,
            parentCollection: output.parentCollection,
            indices: output.indices,
            nestedObjectsList: output.nestedObjectsList,
            wasActive: output.wasActive,
          }),
          message: (input, _output) => {
            const ns = Obj.getTypename(input.objects[0]);
            return ns && input.objects.length === 1
              ? ['object-deleted.label', { ns }]
              : ['objects-deleted.label', { ns: meta.id }];
          },
        }),
      ]),
      Capability.contributes(SpaceOperationConfig, {
        createInvitationUrl,
        observability: observability ?? false,
      }),
    ];
  }),
);
