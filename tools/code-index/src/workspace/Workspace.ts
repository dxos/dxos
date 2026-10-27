//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import type * as LanguageModel from 'effect/ai/LanguageModel';
import * as Layer from 'effect/Layer';

import * as SystemOne from '../design/SystemOne.ts';
import * as Lock from '../mcp/Lock.ts';
import * as Store from '../Store.ts';
import * as Agent from './Agent.ts';
import * as Log from './Log.ts';
import * as Models from './Models.ts';
import * as Review from './Review.ts';
import * as Sandbox from './Sandbox.ts';
import * as Telemetry from './Telemetry.ts';
import * as Titles from './Titles.ts';

/**
 * One layer for everything the chat surface needs: the code index to query, the project log to
 * append to, the sandbox that runs the agent's code, and the model driving it. The CLI and the
 * webserver build the same stack, so a session behaves identically whichever one opened it.
 */

export type Services =
  | Store.Store
  | Log.Log
  | Sandbox.Sandbox
  | Agent.Agent
  | Titles.Titles
  | LanguageModel.LanguageModel;

export const layer = (options: {
  readonly storeDir: string;
  readonly model: Models.Selection;
}): Layer.Layer<Services, Store.StoreError | Log.LogError | Models.ModelError> => {
  // Another code-index process may hold the store; wait out a short-lived one, name a long-lived one.
  const store = Lock.layer(options.storeDir, () => Store.layer(options.storeDir));
  const stores = Layer.merge(store, Log.layer(options.storeDir));
  const models = Models.layer(options.model);
  // The small model, for side work that does not drive the chat; one instance, shared.
  const explorer = Models.layer(Models.explorer(options.model));
  // System One scores the sandbox's design questions when a key is present; the baseline otherwise.
  // The sandbox's design questions explore with the small model, not the one driving the chat.
  const sandbox = Sandbox.layer.pipe(
    Layer.provide(Layer.mergeAll(stores, SystemOne.available() ? SystemOne.layer : SystemOne.refusing, explorer)),
  );
  // Turns are reviewed only when the result can be reported; the small model judges them.
  const reporting = Telemetry.config();
  const reviewer = reporting
    ? Review.layer({ selection: options.model }).pipe(
        Layer.provide(Layer.mergeAll(stores, explorer, Telemetry.layer(reporting))),
      )
    : Layer.empty;
  return Layer.mergeAll(
    stores,
    models,
    sandbox,
    Agent.layer.pipe(Layer.provide(Layer.mergeAll(stores, sandbox, models, reviewer))),
    Titles.layer.pipe(Layer.provide(explorer)),
  );
};
