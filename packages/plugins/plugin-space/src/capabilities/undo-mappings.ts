//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as UndoMapping from '@dxos/app-framework/UndoMapping';
import { Entity } from '@dxos/echo';

import { meta } from '#meta';

import { SpaceOperationConfig } from '../operations/helpers';
import * as SpaceOperation from '../types/SpaceOperation';

type UndoMappingsOptions = {
  createInvitationUrl: (invitationCode: string) => string;
  observability?: boolean;
};

export default Capability.makeModule(
  Effect.fnUntraced(function* ({ createInvitationUrl, observability }: UndoMappingsOptions) {
    return [
      Capability.contribute(Capabilities.UndoMapping, [
        UndoMapping.make({
          operation: SpaceOperation.DeleteField,
          inverse: SpaceOperation.RestoreField,
          deriveContext: (input, output) => ({
            view: input.view,
            field: output.field,
            props: output.props,
            index: output.index,
          }),
          message: ['field-deleted.label', { ns: meta.profile.key }],
        }),
        UndoMapping.make({
          operation: SpaceOperation.RemoveObjects,
          inverse: SpaceOperation.RestoreObjects,
          deriveContext: (_input, output) => ({
            objects: output.objects,
            parentCollection: output.parentCollection,
            indices: output.indices,
            wasActive: output.wasActive,
          }),
          message: (input, _output) => {
            const ns = Entity.getTypename(input.objects[0]);
            return ns && input.objects.length === 1
              ? ['object-deleted.label', { ns: [ns, meta.profile.key] }]
              : ['objects-deleted.label', { ns: meta.profile.key }];
          },
        }),
      ]),
      Capability.contribute(SpaceOperationConfig, {
        createInvitationUrl,
        observability: observability ?? false,
      }),
    ];
  }),
);
