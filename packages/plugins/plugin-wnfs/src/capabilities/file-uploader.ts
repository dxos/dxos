//
// Copyright 2025 DXOS.org
//

import { Effect, pipe } from 'effect';

import { Capabilities, chain, contributes, createIntent, type PluginContext } from '@dxos/app-framework';
import { SpaceAction } from '@dxos/plugin-space/types';

import { WnfsAction } from '../types';

export default (context: PluginContext) => {
  return contributes(Capabilities.FileUploader, (file, space) => {
    const { dispatch } = context.getCapability(Capabilities.IntentDispatcher);

    const program = Effect.gen(function* () {
      const fileInfo = yield* dispatch(createIntent(WnfsAction.Upload, { file, space }));
      yield* dispatch(pipe(createIntent(WnfsAction.Create, fileInfo), chain(SpaceAction.AddObject, { target: space })));
      return fileInfo;
    });

    return Effect.runPromise(program);
  });
};
