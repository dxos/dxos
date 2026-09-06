//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import * as Layer from 'effect/Layer';
import type * as LanguageModel from 'effect/unstable/ai/LanguageModel';

import * as Store from '../Store.ts';
import * as Agent from './Agent.ts';
import * as Log from './Log.ts';
import * as Models from './Models.ts';
import * as Sandbox from './Sandbox.ts';

/**
 * One layer for everything the chat surface needs: the code index to query, the project log to
 * append to, the sandbox that runs the agent's code, and the model driving it. The CLI and the
 * webserver build the same stack, so a session behaves identically whichever one opened it.
 */

export type Services = Store.Store | Log.Log | Sandbox.Sandbox | Agent.Agent | LanguageModel.LanguageModel;

export const layer = (options: {
  readonly storeDir: string;
  readonly model: Models.Selection;
}): Layer.Layer<Services, Store.StoreError | Log.LogError | Models.ModelError> => {
  const stores = Layer.merge(Store.layer(options.storeDir), Log.layer(options.storeDir));
  const models = Models.layer(options.model);
  const sandbox = Sandbox.layer.pipe(Layer.provide(stores));
  return Layer.mergeAll(
    stores,
    models,
    sandbox,
    Agent.layer.pipe(Layer.provide(Layer.mergeAll(stores, sandbox, models))),
  );
};
