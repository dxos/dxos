//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterAll, beforeAll, describe, test } from 'vitest';

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import { EffectEx } from '@dxos/effect';

import { ComputerOperationHandlerSet } from '#operations';
import { ComputerSkill } from '#skills';
import { ComputerOperation } from '#types';

import { type Host, startHost } from '../vite-plugin/testing';

/**
 * Covers the wiring the app depends on: the skill's tool ids resolving to these definitions, the
 * lazy handler modules loading, and each handler returning something its own output schema accepts.
 * The harness itself is tested in `vite-plugin/*.test.ts`.
 */
describe('computer operations', () => {
  let root: string;
  let host: Host;
  let realFetch: typeof globalThis.fetch;

  beforeAll(async () => {
    root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'dx-computer-ops-')));
    host = await startHost({ root });

    // The client posts to a same-origin path, which is what the browser gives it and node does not;
    // this supplies the origin the page would have.
    realFetch = globalThis.fetch;
    const patched: typeof globalThis.fetch = (input, init) =>
      realFetch(typeof input === 'string' && input.startsWith('/') ? host.path : input, init);
    globalThis.fetch = patched;
  });

  afterAll(async () => {
    globalThis.fetch = realFetch;
    await host.close();
    fs.rmSync(root, { recursive: true, force: true });
  });

  test('the skill exposes exactly the harness tools', ({ expect }) => {
    expect([...ComputerSkill.make().tools]).to.deep.eq([
      Operation.toolName(ComputerOperation.Bash),
      Operation.toolName(ComputerOperation.Edits),
    ]);
  });

  test('bash returns a successful run', async ({ expect }) => {
    const result = await invoke(ComputerOperation.Bash, { script: 'echo hi' });
    expect(result.success).to.be.true;
    expect(result.exitCode).to.eq(0);
    expect(result.stdout).to.eq('hi\n');
    expect(result.cwd).to.eq(root);
  });

  test('bash reports a killed script as exit code -1', async ({ expect }) => {
    const result = await invoke(ComputerOperation.Bash, { script: 'sleep 30', timeout: 250 });
    expect(result.success).to.be.false;
    expect(result.exitCode).to.eq(-1);
    expect(result.timedOut).to.be.true;
  });

  test('edits applies a batch', async ({ expect }) => {
    fs.writeFileSync(path.join(root, 'a.ts'), 'const value = 1;\n');

    const result = await invoke(ComputerOperation.Edits, {
      edits: [{ path: 'a.ts', oldString: 'value = 1', newString: 'value = 2' }],
    });
    expect(result.applied).to.be.true;
    expect(result.files).to.deep.eq([{ path: 'a.ts', replacements: 1 }]);
    expect(fs.readFileSync(path.join(root, 'a.ts'), 'utf8')).to.eq('const value = 2;\n');
  });

  test('edits reports a failed match as a result the model can act on', async ({ expect }) => {
    const result = await invoke(ComputerOperation.Edits, {
      edits: [{ path: 'ghost.ts', oldString: 'a', newString: 'b' }],
    });
    expect(result.applied).to.be.false;
    expect(result.error).to.be.a('string');
  });

  /**
   * Loads the handler through the set the plugin contributes and validates the result against the
   * definition's output schema — the shape the model actually receives, which the handler's own types
   * do not pin down (an extra or missing optional field passes typecheck and fails at the tool call).
   */
  // `never` services: these handlers ask for none, which is what lets the suite run them without a
  // resolver — an operation that grew a service dependency would fail here rather than at runtime.
  const invoke = <I, O>(definition: Operation.Definition<I, O, never>, input: I): Promise<O> =>
    EffectEx.runPromise(
      Effect.gen(function* () {
        const { handler } = yield* OperationHandlerSet.getHandler(ComputerOperationHandlerSet, definition);
        const output = yield* handler(input);
        return yield* Schema.decodeUnknownEffect(definition.output)(output);
      }),
    );
});
