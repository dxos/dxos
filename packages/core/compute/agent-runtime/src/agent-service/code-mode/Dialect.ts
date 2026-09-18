//
// Copyright 2026 DXOS.org
//

import type * as Context from 'effect/Context';
import type * as Effect from 'effect/Effect';

import type { Database } from '@dxos/echo';
import { trim } from '@dxos/util';

/**
 * An operation the sandbox exposes, projected from a skill-bound tool.
 */
export type Operation = {
  /** Name it is bound under, i.e. the tool name derived from the operation key. */
  readonly name: string;
  readonly description?: string;
  /** JSON schema of the operation's input, rendered into the model's API reference. */
  readonly parameters: unknown;
  /** Runs the operation, raising whatever error the tool reported. */
  readonly invoke: (input: unknown) => Effect.Effect<unknown>;
};

export type BindingsContext = {
  /** Services the sandbox's ECHO access runs against. */
  readonly runtime: Context.Context<Database.Service>;
  readonly operations: readonly Operation[];
  /** Appends a line to this call's output — the only channel back to the model. */
  readonly print: (...values: unknown[]) => void;
};

/**
 * What the model writes, and what it writes it against.
 *
 * The dialect owns the three things that have to agree: the names in scope, the prose telling the
 * model about them, and how its code is wrapped into the async function body the `Sandbox`
 * evaluates. Swapping it changes the language the agent programs in without touching the turn loop.
 */
export interface Dialect {
  /** Identifies the dialect in traces and options. */
  readonly name: string;

  /** The API reference rendered into the system prompt, ahead of the skills' own instructions. */
  readonly instructions: (operations: readonly Operation[]) => string;

  /** Wraps the model's code into the body the sandbox evaluates. */
  readonly wrap: (code: string) => string;

  /** Names bound in the code's scope, built per evaluation. */
  readonly bindings: (context: BindingsContext) => Record<string, unknown>;
}

/** One operation's line in the API reference, `call` rendering the dialect's own call syntax. */
export const renderOperation = (operation: Operation, call: (name: string) => string): string => trim`
  - \`${call(operation.name)}\` — ${operation.description ?? 'No description.'}
    input: ${JSON.stringify(operation.parameters)}
`;

/** Shown in place of the operations section when the conversation binds no skills. */
export const NO_OPERATIONS = '### Operations\n\nNo operations are bound to this conversation.';
