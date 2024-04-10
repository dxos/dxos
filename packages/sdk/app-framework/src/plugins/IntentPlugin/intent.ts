//
// Copyright 2023 DXOS.org
//

import type { MaybePromise } from '@dxos/util';

import type { Plugin } from '../PluginHost';

export type IntentData<T extends Record<string, any> = Record<string, any>> = T & {
  /**
   * The data from the result of the previous intent.
   */
  result?: any;
};

/**
 * An intent is an abstract description of an operation to be performed.
 * Intents allow actions to be performed across plugins.
 */
export type Intent = {
  /**
   * Plugin ID.
   * If specified, the intent will be sent explicitly to the plugin.
   * Otherwise, the intent will be sent to all plugins, in order and the first to resolve a non-null value will be used.
   */
  plugin?: string;

  /**
   * The action to perform.
   */
  action: string;

  /**
   * Whether or not the intent is being undone.
   */
  undo?: boolean;

  /**
   * Any data needed to perform the desired action.
   */
  // TODO(burdon): Typed intents.
  data?: IntentData;
};

export type IntentResult = {
  /**
   * The output of the action that was performed.
   *
   * If the intent is apart of a chain of intents, the data will be passed to the next intent.
   */
  data?: any;

  /**
   * If provided, the action will be undoable.
   */
  undoable?: {
    /**
     * Message to display to the user when indicating that the action can be undone.
     */
    message: string;

    /**
     * Will be merged with the original intent data when firing the undo intent.
     */
    data?: IntentData;
  };

  /**
   * An error that occurred while performing the action.
   *
   * If the intent is apart of a chain of intents and an error occurs, the chain will be aborted.
   */
  error?: Error;

  /**
   * Other intent chains to be triggered.
   */
  intents?: Intent[][];
};

/**
 * Trigger one or more intents to be sent.
 * If multiple intents are specified, the result of each will be merged with the data to the next.
 *
 * @returns The result of the last intent.
 */
// TODO(burdon): Generic/typed intents.
export type IntentDispatcher = (intent: Intent | Intent[]) => Promise<IntentResult | void>;

/**
 * Resolves an intent that was dispatched.
 * If the intent is not handled, nothing should be returned.
 *
 * @returns The result of the intent.
 */
export type IntentResolver = (intent: Intent, plugins: Plugin[]) => MaybePromise<IntentResult | void>;
