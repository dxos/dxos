//
// Copyright 2026 DXOS.org
//

import { type Sandbox, SandboxError } from '@earendil-works/djs';

import { type BindingsContext, loadEffectDocs, makeEffectPrint } from '@dxos/agent-code-mode';
import * as EffectEx from '@dxos/effect/EffectEx';

import { type Bridge, type BridgeCounters, decode } from './Bridge.ts';
import {
  type EvaluationInit,
  type EvaluationResult,
  GUEST_GLOBAL,
  type OperationRecord,
  type Row,
  isRecord,
} from './protocol.ts';
import { rewriteTopLevel } from './rewrite.ts';
import * as Snapshot from './Snapshot.ts';

/** What one evaluation produced: the program's value as a host value, or what went wrong. */
export type SessionResult =
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly message: string };

/** What crossed the bridge, from both sides. */
export type SessionStats = {
  readonly host: BridgeCounters;
  readonly guest: Readonly<Record<string, number>>;
};

/**
 * One VM bound to one database for the life of a conversation.
 *
 * Each program runs as the body of an `Effect.gen` generator. Its top-level declarations bind
 * session globals (see {@link rewriteTopLevel}), so the next program reads them, live objects
 * included; the guest database keeps those objects current with the host before every program.
 */
export class Session {
  readonly #sandbox: Sandbox;
  readonly #bridge: Bridge;
  readonly #bundleHash: string;
  readonly #names: Set<string>;
  #running = false;

  constructor({
    sandbox,
    bridge,
    bundleHash,
    names,
  }: {
    sandbox: Sandbox;
    bridge: Bridge;
    bundleHash: string;
    names: readonly string[];
  }) {
    this.#sandbox = sandbox;
    this.#bridge = bridge;
    this.#bundleHash = bundleHash;
    this.#names = new Set(names);
  }

  /** Names the session's programs have declared. */
  get names(): readonly string[] {
    return [...this.#names];
  }

  /** Bytes of the VM's heap. */
  get heapSize(): number {
    return this.#sandbox.heapSize;
  }

  /** Runs one Effect-dialect program against `context`, whose database is the session's. */
  async evaluate(program: string, context: BindingsContext): Promise<SessionResult> {
    if (this.#running) {
      return { ok: false, message: 'Another evaluation is running in this session.' };
    }
    this.#running = true;
    this.#bridge.bind({ ...context, printValues: makeEffectPrint(context) });
    try {
      const { code, names } = rewriteTopLevel(program);
      const init: EvaluationInit = {
        operations: context.operations.map(({ name, description, definition }): OperationRecord => ({
          key: String(definition?.meta.key ?? name),
          name,
          description,
          backed: definition !== undefined,
        })),
        docs: await EffectEx.runPromise(loadEffectDocs(context)),
      };
      // Each new name exists before the program runs, so its assignment binds the global rather
      // than failing in strict mode; one the session already has keeps its value until reassigned.
      const declare = names.map(
        (name) => `if (!(${JSON.stringify(name)} in globalThis)) globalThis[${JSON.stringify(name)}] = undefined;`,
      );
      const body = [...declare, `return await ${GUEST_GLOBAL}.evaluate(function* () {`, code, '}, __dxInit);'].join(
        '\n',
      );
      names.forEach((name) => this.#names.add(name));

      const result = await this.#sandbox.runAsync(body, { __dxInit: init });
      if (!isEvaluationResult(result)) {
        return { ok: false, message: 'The sandbox returned no result.' };
      }
      return result.ok ? { ok: true, value: await decode(result.value, this.#bridge.db) } : result;
    } catch (error) {
      return { ok: false, message: describeSandboxError(error) };
    } finally {
      this.#bridge.bind(undefined);
      this.#running = false;
    }
  }

  /**
   * Places rows the host already holds — a working-set export, or rows from an earlier query — in the
   * guest's working set without a bridge call.
   */
  async seed(rows: readonly Row[], context: BindingsContext): Promise<void> {
    this.#bridge.bind({ ...context, printValues: makeEffectPrint(context) });
    try {
      await this.#sandbox.runAsync(`await ${GUEST_GLOBAL}.seed(__dxRows);`, { __dxRows: rows });
    } finally {
      this.#bridge.bind(undefined);
    }
  }

  /** The session as bytes, for {@link Engine.restore}. Pending writes reach the host first. */
  async snapshot(context: BindingsContext): Promise<Uint8Array> {
    if (this.#running) {
      throw new Error('A session is snapshotted between evaluations.');
    }
    this.#bridge.bind({ ...context, printValues: makeEffectPrint(context) });
    try {
      await this.#sandbox.runAsync(`${GUEST_GLOBAL}.flush();`);
    } finally {
      this.#bridge.bind(undefined);
    }
    return Snapshot.encode({
      header: { bundle: this.#bundleHash, names: this.names },
      image: this.#sandbox.image(),
    });
  }

  /** What crossed the bridge so far. */
  stats(): SessionStats {
    const guest = this.#sandbox.run(`return ${GUEST_GLOBAL}.stats();`);
    return {
      host: { ...this.#bridge.counters },
      guest: isRecord(guest)
        ? Object.fromEntries(
            Object.entries(guest).flatMap(([key, value]) => (typeof value === 'number' ? [[key, value]] : [])),
          )
        : {},
    };
  }

  dispose(): void {
    this.#sandbox.dispose();
  }
}

const isEvaluationResult = (value: unknown): value is EvaluationResult =>
  isRecord(value) && (value.ok === true || (value.ok === false && typeof value.message === 'string'));

/** A failure of the VM itself, in the words the model is shown. */
const describeSandboxError = (error: unknown): string => {
  if (error instanceof SandboxError) {
    switch (error.kind) {
      case 'fuel':
        return `Evaluation did not finish within its budget and was stopped (${error.message}).`;
      case 'memory':
        return `Evaluation ran out of memory (${error.message}).`;
      default:
        return error.message;
    }
  }
  return error instanceof Error ? error.message : String(error);
};
