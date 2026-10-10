//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as Scope from 'effect/Scope';

import * as ShellService from '@dxos/compute/ShellService';

import * as NodeShell from './node-shell.ts';

const isRunning = (pid: number | undefined): boolean => {
  if (pid === undefined) {
    return false;
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

describe('NodeShell', () => {
  // Real processes: the live clock, since `TestClock` would never let them exit.
  it.live(
    'runs a bash script and collects its output',
    Effect.fn(function* ({ expect }) {
      const result = yield* ShellService.exec({
        script: 'echo "$GREETING"; echo oops >&2; exit 3',
        env: { GREETING: 'hi' },
      });
      expect(result).toEqual({ exitCode: 3, stdout: 'hi\n', stderr: 'oops\n' });
    }, Effect.provide(NodeShell.layer)),
  );

  it.live(
    'streams a child over its standard streams',
    Effect.fn(
      function* ({ expect }) {
        const child = yield* ShellService.spawn({ command: 'cat' });
        const writer = child.stdin.getWriter();
        yield* Effect.promise(() => writer.write(new TextEncoder().encode('echo')));
        yield* Effect.promise(() => writer.close());
        const output = yield* Effect.promise(() => new Response(child.stdout).text());
        expect(output).toBe('echo');
        expect(yield* child.exited).toBe(0);
      },
      Effect.scoped,
      Effect.provide(NodeShell.layer),
    ),
  );

  it.live(
    'fails to start a command that does not exist',
    Effect.fn(function* ({ expect }) {
      const exit = yield* ShellService.spawn({ command: 'dx-no-such-command' }).pipe(Effect.scoped, Effect.exit);
      expect(Exit.isFailure(exit)).toBe(true);
    }, Effect.provide(NodeShell.layer)),
  );

  it.live(
    'kills every child still running when the service is torn down',
    Effect.fn(function* ({ expect }) {
      const serviceScope = yield* Scope.make();
      const context = yield* Layer.buildWithScope(NodeShell.layer, serviceScope);
      // Spawned into a scope that outlives the service, as a caller that forgot its child would.
      const callerScope = yield* Scope.make();
      const child = yield* ShellService.spawn({ command: 'sleep', args: ['60'] }).pipe(
        Scope.provide(callerScope),
        Effect.provide(context),
      );
      expect(isRunning(child.pid)).toBe(true);

      yield* Scope.close(serviceScope, Exit.void);
      expect(yield* child.exited).toBeNull();
      expect(isRunning(child.pid)).toBe(false);
      yield* Scope.close(callerScope, Exit.void);
    }),
  );
});
