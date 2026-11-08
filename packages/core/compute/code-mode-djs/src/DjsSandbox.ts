//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Sandbox } from '@dxos/agent-code-mode';
import { Database } from '@dxos/echo';

import { type Engine } from './Engine.ts';
import { type Session } from './Session.ts';

export type DjsSandbox = Sandbox.Sandbox & {
  /** The session the sandbox keeps for a database, opening it on first use. */
  readonly session: (db: Database.Database) => Promise<Session>;
  /** Ends every session. */
  readonly dispose: () => void;
};

/**
 * {@link Sandbox.Sandbox} over djs: one session per database, kept across evaluations, so a
 * conversation's programs share their variables. Pair it with `DjsEffectDialect`.
 *
 * A timeout is not observed: djs bounds an evaluation by its fuel budget instead, which stops a
 * runaway program deterministically and leaves the session usable.
 */
export const make = ({ engine }: { engine: Engine }): DjsSandbox => {
  const sessions = new Map<Database.Database, Promise<Session>>();
  const session = (db: Database.Database): Promise<Session> => {
    let opened = sessions.get(db);
    if (!opened) {
      opened = engine.open(db);
      sessions.set(db, opened);
    }
    return opened;
  };

  return {
    session,
    dispose: () => {
      for (const opened of sessions.values()) {
        void opened.then((session) => session.dispose());
      }
      sessions.clear();
    },
    evaluate: ({ code, context }) =>
      Effect.tryPromise({
        try: async () => {
          const { db } = Context.get(context.runtime, Database.Service);
          return (await session(db)).evaluate(code, context);
        },
        catch: (error) =>
          new Sandbox.EvaluationError({ message: error instanceof Error ? error.message : String(error) }),
      }).pipe(
        Effect.flatMap((result) =>
          result.ok
            ? Effect.succeed(result.value)
            : Effect.fail(new Sandbox.EvaluationError({ message: result.message })),
        ),
      ),
  };
};

/** Installs a djs sandbox as the ambient one. */
export const layer = (options: { engine: Engine }): Layer.Layer<Sandbox.Service> =>
  Layer.succeed(Sandbox.Service, make(options));
