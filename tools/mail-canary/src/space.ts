//
// Copyright 2026 DXOS.org
//

import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { execFile } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { type SpaceSnapshot } from './checks.ts';
import { type SpaceReader } from './nightly.ts';
import { readSpaceProgram } from './read-space.ts';

/** A failed `dx` invocation or an unreadable answer from it. */
export class DxError extends Data.TaggedError('DxError')<{ readonly message: string }> {}

/** The monorepo's CLI launcher; it runs `src/bin.ts` under bun against the built workspace. */
const DX_BIN = fileURLToPath(new URL('../../../packages/devtools/cli/bin/dx', import.meta.url));

const execFileAsync = promisify(execFile);

const SyncEvent = Schema.Struct({
  pid: Schema.String,
  type: Schema.Literals(['start', 'end']),
  timestamp: Schema.Number,
  outcome: Schema.optional(Schema.Literals(['success', 'failure'])),
  error: Schema.optional(Schema.String),
  errorCode: Schema.optional(Schema.String),
});

const Snapshot = Schema.Struct({
  events: Schema.Array(SyncEvent),
  messages: Schema.Array(
    Schema.Struct({
      gmailId: Schema.String,
      subject: Schema.optional(Schema.String),
      sender: Schema.optional(Schema.String),
    }),
  ),
  triggers: Schema.Array(Schema.Struct({ id: Schema.String, enabled: Schema.Boolean })),
  mailboxFound: Schema.Boolean,
  traceFeedFound: Schema.Boolean,
});

const EvalResult = Schema.Struct({ ok: Schema.Boolean, output: Schema.String });

export type DxOptions = {
  /** Becomes `HOME` for every `dx` call, so the profile lives in a throwaway directory. */
  readonly home: string;
  readonly profile?: string;
  readonly bin?: string;
};

/**
 * The `dx` calls the nightly run makes. Every call runs with `HOME` pointed at `home`, so the
 * profile (config under `~/.config/dx`, storage under `~/.local/share/dx`) never touches the runner's.
 */
export const makeDx = ({ home, profile = 'mail-canary', bin = DX_BIN }: DxOptions) => {
  const secrets: string[] = [];
  const redact = (text: string) => secrets.reduce((result, secret) => result.replaceAll(secret, '<redacted>'), text);

  const run = (args: readonly string[]): Effect.Effect<string, DxError> =>
    Effect.tryPromise({
      try: async () => {
        const { stdout } = await execFileAsync(bin, args, {
          env: { ...process.env, HOME: home, DX_PROFILE: profile },
          maxBuffer: 256 * 1024 * 1024,
        });
        return stdout;
      },
      catch: (cause) => new DxError({ message: redact(`dx ${args[0] ?? ''} failed: ${String(cause)}`) }),
    });

  /**
   * Creates a preview profile and signs in to the canary identity with its recovery phrase. Each sign-in
   * admits this runner as a new device of the identity.
   */
  const login = (recoveryPhrase: string): Effect.Effect<void, DxError> =>
    Effect.gen(function* () {
      secrets.push(recoveryPhrase);
      yield* run(['profile', 'create', '--template', 'preview', '--name', profile]);
      yield* run(['account', 'login', '--method', 'recovery-code', recoveryPhrase]);
    });

  /** Reads the space's sync runs, mailbox messages and sync trigger through `dx eval`. */
  const snapshot = (
    spaceId: string,
    { since, maxMessages = 1_000 }: { since: number; maxMessages?: number },
  ): Effect.Effect<SpaceSnapshot, DxError> =>
    Effect.gen(function* () {
      const file = join(home, 'read-space.js');
      yield* Effect.tryPromise({
        try: () => writeFile(file, readSpaceProgram({ since, maxMessages, pageSize: 50 })),
        catch: (cause) => new DxError({ message: `cannot write the eval program: ${String(cause)}` }),
      });
      const stdout = yield* run([
        '--json',
        'eval',
        '--space-id',
        spaceId,
        '--max-output',
        String(64 * 1024 * 1024),
        '--file',
        file,
      ]);
      const result = yield* decodeJson(EvalResult, stdout.slice(stdout.indexOf('{')));
      if (!result.ok) {
        return yield* new DxError({ message: `the eval program failed: ${result.output}` });
      }
      const snapshot = yield* decodeJson(Snapshot, result.output);
      if (!snapshot.mailboxFound || !snapshot.traceFeedFound) {
        return yield* new DxError({
          message: `space ${spaceId} has ${snapshot.mailboxFound ? 'no Execution Trace feed' : 'no mailbox'}`,
        });
      }
      return snapshot;
    });

  return { run, login, snapshot };
};

/** A `SpaceReader` for one space, over an already signed-in `dx` profile. */
export const spaceReader = (dx: ReturnType<typeof makeDx>, spaceId: string): SpaceReader<DxError> => ({
  snapshot: ({ since }) => dx.snapshot(spaceId, { since }),
});

const decodeJson = <S extends Schema.Top>(schema: S, text: string) =>
  Effect.try({
    try: (): unknown => JSON.parse(text),
    catch: (cause) => new DxError({ message: `dx printed something other than JSON: ${String(cause)}` }),
  }).pipe(
    Effect.flatMap((value) =>
      Schema.decodeUnknownEffect(schema)(value).pipe(
        Effect.mapError((error) => new DxError({ message: `unexpected dx output: ${error.message}` })),
      ),
    ),
  );
