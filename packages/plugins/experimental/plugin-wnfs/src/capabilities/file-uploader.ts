//
// Copyright 2025 DXOS.org
//

import { Effect, pipe } from 'effect';

import { Capabilities, chain, contributes, createIntent, type PluginsContext } from '@dxos/app-framework';
import { SpaceAction } from '@dxos/plugin-space/types';

import { WnfsAction } from '../types/types';

export default (context: PluginsContext) => {
  return contributes(Capabilities.FileUploader, (file, space) => {
    const { dispatch } = context.requestCapability(Capabilities.IntentDispatcher);

    const program = Effect.gen(function* () {
      // TODO(wittjosiah): Dispatch effect should return Option of data.
      const { data: fileInfo } = yield* dispatch(createIntent(WnfsAction.Upload, { file, space }));
      yield* dispatch(pipe(createIntent(WnfsAction.Create, fileInfo), chain(SpaceAction.AddObject, { target: space })));
      return fileInfo;
    });

    return Effect.runPromise(program);
  });
};
