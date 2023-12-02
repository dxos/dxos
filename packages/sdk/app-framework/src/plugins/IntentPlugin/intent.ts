//
// Copyright 2023 DXOS.org
//

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
   * Any data needed to perform the desired action.
   */
  data?: any;
};

/**
 * Trigger one or more intents to be sent.
 * If multiple intents are specified, the result of each will be merged with the data to the next.
 *
 * @returns The result of the last intent.
 */
export type DispatchIntent = (intent: Intent | Intent[]) => Promise<any>;
