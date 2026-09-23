//
// Copyright 2026 DXOS.org
//

import type * as Context from 'effect/Context';
import type * as Effect from 'effect/Effect';

import type * as Operation from '@dxos/compute/Operation';
import type { Database } from '@dxos/echo';
import { trim } from '@dxos/util';

/**
 * An operation the sandbox exposes, projected from a skill-bound tool.
 */
export type SandboxOperation = {
  /** Name it is bound under, i.e. the tool name derived from the operation key. */
  readonly name: string;
  readonly description?: string;
  /** JSON schema of the operation's input, rendered into the model's API reference. */
  readonly parameters: unknown;
  /**
   * The operation itself, for a dialect that hands the model the real thing to call
   * (`Operation.invoke(definition, input)`). Absent for a tool that is not operation-backed — a
   * provider-defined or MCP tool — which such a dialect cannot express.
   */
  readonly definition?: Operation.Definition.Any;
  /** Runs the operation through the tool path, raising whatever error the tool reported. */
  readonly invoke: (input: unknown) => Effect.Effect<unknown>;
};

/** A type the workspace has registered, as the model is told about it. */
export type SandboxType = {
  readonly typename: string;
  /** Field names, so the model never has to introspect a schema to find out what it may write. */
  readonly fields: readonly string[];
};

/** What a dialect is handed to build its bindings: the ECHO runtime, the skills' operations, and the turn's printer. */
export type BindingsContext = {
  /**
   * Services the sandbox's code runs against: the database it reads and writes, and the operation
   * service `Operation.invoke` resolves a handler through.
   */
  readonly runtime: Context.Context<Database.Service | Operation.Service>;
  readonly operations: readonly SandboxOperation[];
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
  readonly instructions: (context: InstructionsContext) => string;

  /** Wraps the model's code into the body the sandbox evaluates. */
  readonly wrap: (code: string) => string;

  /** Names bound in the code's scope, built per evaluation. */
  readonly bindings: (context: BindingsContext) => Record<string, unknown>;
}

/** What a dialect is handed to write its instructions: the operations and the types the model may name. */
export type InstructionsContext = {
  readonly operations: readonly SandboxOperation[];
  readonly types: readonly SandboxType[];
};

/** The types section of the API reference, shared by the dialects. */
export const renderTypes = (types: readonly SandboxType[]): string =>
  types.length === 0
    ? '### Types\n\nNo types are registered.'
    : trim`
      ### Types

      Every registered type and its fields. This is the whole schema — do not introspect it further.

      ${types.map(({ typename, fields }) => `- \`${typename}\` — ${fields.join(', ')}`).join('\n')}
    `;

/** One operation's line in the API reference, `call` rendering the dialect's own call syntax. */
export const renderOperation = (operation: SandboxOperation, call: (name: string) => string): string => trim`
  - \`${call(operation.name)}\` — ${operation.description ?? 'No description.'}
    input: ${JSON.stringify(operation.parameters)}
`;

/** Shown in place of the operations section when the conversation binds no skills. */
export const NO_OPERATIONS = '### Operations\n\nNo operations are bound to this conversation.';
