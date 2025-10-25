//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';

import { Capabilities, type PluginContext, chain, contributes, createIntent } from '@dxos/app-framework';
import { SpaceAction } from '@dxos/plugin-space/types';

import { WnfsAction } from '../types';

export default (context: PluginContext) => {
  return contributes(Capabilities.FileUploader, (space, file) => {
    const { dispatch } = context.getCapability(Capabilities.IntentDispatcher);
    const program = Effect.gen(function* () {
      const fileInfo = yield* dispatch(createIntent(WnfsAction.Upload, { space, file }));
      yield* dispatch(
        Function.pipe(createIntent(WnfsAction.Create, fileInfo), chain(SpaceAction.AddObject, { target: space })),
      );

      return fileInfo;
    });

    return Effect.runPromise(program);
  });
};
