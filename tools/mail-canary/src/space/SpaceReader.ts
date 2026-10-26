//
// Copyright 2026 DXOS.org
//

import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { execFile } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { type SpaceSnapshot } from '../checks/index.ts';
import { readSpaceProgram } from './read-space.ts';

/** A failed `dx` invocation or an unreadable answer from it. */
export class DxError extends Data.TaggedError('DxError')<{ readonly message: string }> {}

/** The monorepo's CLI launcher; it runs `src/bin.ts` under bun against the built workspace. */
const DX_BIN = fileURLToPath(new URL('../../../../packages/devtools/cli/bin/dx', import.meta.url));

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

export type SpaceReaderOptions = {
  readonly spaceId: string;
  /** Becomes `HOME` for every `dx` call, so the profile lives in a throwaway directory. */
  readonly home: string;
  readonly profile?: string;
};

/**
 * Reads the canary space through the `dx` CLI. Every call runs with `HOME` pointed at `home`, so the
 * profile (config under `~/.config/dx`, storage under `~/.local/share/dx`) never touches the runner's.
 */
export class SpaceReader {
  readonly spaceId: string;
  readonly #home: string;
  readonly #profile: string;
  /** Values never to print, such as the recovery phrase in a failed login's command line. */
  readonly #secrets: string[] = [];

  constructor({ spaceId, home, profile = 'mail-canary' }: SpaceReaderOptions) {
    this.spaceId = spaceId;
    this.#home = home;
    this.#profile = profile;
  }

  /**
   * Creates a preview profile and signs in to the canary identity with its recovery phrase. Each sign-in
   * admits this runner as a new device of the identity.
   */
  login(recoveryPhrase: string): Effect.Effect<void, DxError> {
    return Effect.gen({ self: this }, function* () {
      this.#secrets.push(recoveryPhrase);
      yield* this.#run(['profile', 'create', '--template', 'preview', '--name', this.#profile], { useProfile: false });
      yield* this.#run(['account', 'login', '--method', 'recovery-code', recoveryPhrase]);
    });
  }

  /** The space's sync runs since `since`, its newest mailbox messages and its sync trigger, via `dx eval`. */
  snapshot({
    since,
    maxMessages = 1_000,
  }: {
    since: number;
    maxMessages?: number;
  }): Effect.Effect<SpaceSnapshot, DxError> {
    return Effect.gen({ self: this }, function* () {
      const file = join(tmpdir(), `mail-canary-read-space-${process.pid}.js`);
      yield* Effect.tryPromise({
        try: () => writeFile(file, readSpaceProgram({ since, maxMessages })),
        catch: (cause) => new DxError({ message: `cannot write the eval program: ${String(cause)}` }),
      });
      const stdout = yield* this.#run([
        '--json',
        'eval',
        '--space-id',
        this.spaceId,
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
          message: `space ${this.spaceId} has ${snapshot.mailboxFound ? 'no Execution Trace feed' : 'no mailbox'}`,
        });
      }
      return snapshot;
    });
  }

  /** `useProfile: false` for `profile create`, which fails if DX_PROFILE has already bootstrapped a bare profile. */
  #run(args: readonly string[], { useProfile = true } = {}): Effect.Effect<string, DxError> {
    return Effect.tryPromise({
      try: async () => {
        const { stdout } = await execFileAsync(DX_BIN, args, {
          env: { ...process.env, HOME: this.#home, ...(useProfile ? { DX_PROFILE: this.#profile } : {}) },
          maxBuffer: 256 * 1024 * 1024,
        });
        return stdout;
      },
      catch: (cause) => new DxError({ message: this.#redact(`dx ${args[0] ?? ''} failed: ${String(cause)}`) }),
    });
  }

  #redact(text: string): string {
    return this.#secrets.reduce((result, secret) => result.replaceAll(secret, '<redacted>'), text);
  }
}

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
