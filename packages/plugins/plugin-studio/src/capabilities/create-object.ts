//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Type } from '@dxos/echo';
import * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';

import { Lightbox, MediaArtifact } from '#types';

import { KINDS } from '../constants.ts';

/** The create dialog's form: the medium decides which generation providers the artifact can use. */
const ArtifactForm = Schema.Struct({
  name: Schema.optional(Schema.String.annotate({ title: 'Name' })),
  kind: Schema.Literals(KINDS).annotate({ title: 'Type' }),
});

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return [
      Capability.contributeAll(SpaceCapabilities.CreateObjectEntry, [
        {
          id: Type.getTypename(MediaArtifact.MediaArtifact),
          inputSchema: ArtifactForm,
          createObject: (props, options) =>
            Effect.gen(function* () {
              const object = MediaArtifact.make({ name: props?.name, kind: props?.kind });
              return yield* Operation.invoke(
                SpaceOperation.AddObject,
                {
                  object,
                  target: options.target,
                },
                { spaceId: options.db.spaceId },
              );
            }),
        },
        {
          id: Type.getTypename(Lightbox.Lightbox),
          createObject: (_props, options) =>
            Effect.gen(function* () {
              const object = Lightbox.make();
              return yield* Operation.invoke(
                SpaceOperation.AddObject,
                {
                  object,
                  target: options.target,
                },
                { spaceId: options.db.spaceId },
              );
            }),
        },
      ]),
    ];
  }),
);
