//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Type } from '@dxos/echo';
import * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';

import { Language, Vocabulary } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributeAll(SpaceCapabilities.CreateObjectEntry, [
      {
        id: Type.getTypename(Language.Language),
        createObject: (props, options) =>
          Effect.gen(function* () {
            const object = Language.make(props);
            return yield* Operation.invoke(
              SpaceOperation.AddObject,
              { object, target: options.target },
              { spaceId: options.db.spaceId },
            );
          }),
      },
      {
        id: Type.getTypename(Vocabulary.Vocabulary),
        inputSchema: Vocabulary.CreateVocabularySchema,
        createObject: (props, options) =>
          Effect.gen(function* () {
            const object = Vocabulary.make(props);
            return yield* Operation.invoke(
              SpaceOperation.AddObject,
              { object, target: options.target },
              { spaceId: options.db.spaceId },
            );
          }),
      },
    ]);
  }),
);
