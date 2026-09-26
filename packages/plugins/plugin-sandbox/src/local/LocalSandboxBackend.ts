//
// Copyright 2026 DXOS.org
//

import { type ISandboxManager, type SandboxRuntimeConfig, createSandboxManager } from '@carderne/sandbox-runtime';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as Semaphore from 'effect/Semaphore';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, readdir, readFile, rm, stat, unlink, writeFile } from 'node:fs/promises';
import { constants, homedir, platform } from 'node:os';
import { dirname, isAbsolute, join, relative, sep } from 'node:path';

import { log } from '@dxos/log';

import { type CreateSandboxOptions, type SandboxBackend, SandboxError } from '../services/SandboxBackend.ts';
import { type ExecRequest, type ExecResult, type FileEntry, SandboxRecord } from '../services/SandboxClient.ts';
import { type ResourceLimits, limitsPrelude } from './limits.ts';
import { resolveSandboxPath } from './paths.ts';

export type LocalSandboxOptions = {
  /** Directory holding every sandbox; defaults to `$DX_SANDBOX_ROOT`, else `~/.local/state/dxos/sandboxes`. */
  root?: string;
  /** Limits applied to every command; see {@link DEFAULT_LIMITS}. */
  limits?: ResourceLimits;
  /** Hosts a command may reach (`*.example.com` wildcards allowed); everything else is refused. */
  allowedDomains?: readonly string[];
  /** Host paths hidden from commands, in addition to the user's home directory. */
  denyRead?: readonly string[];
  /** Host paths re-exposed beneath a denied one. */
  allowRead?: readonly string[];
  /** Bytes kept of each of stdout and stderr; the rest is dropped. */
  maxOutputBytes?: number;
};

export const DEFAULT_LIMITS: ResourceLimits = { cpuSeconds: 600, memoryMiB: 4096, fileSizeMiB: 1024 };

/** Package registries and source hosts, so a sandbox can install what it builds with. */
export const DEFAULT_ALLOWED_DOMAINS: readonly string[] = [
  'registry.npmjs.org',
  'pypi.org',
  'files.pythonhosted.org',
  'github.com',
  '*.github.com',
  '*.githubusercontent.com',
];

/** Same default as sandbox-service, so a command behaves alike on either backend. */
const DEFAULT_EXEC_TIMEOUT = 120_000;
const DEFAULT_EXPIRY = 3 * 60 * 60 * 1_000;
const DEFAULT_MAX_OUTPUT_BYTES = 1024 * 1024;
const LOCAL_BASE_IMAGE = 'local';

/**
 * Whether srt's seccomp unix-socket filter must be dropped. Its helper cannot map uids inside an
 * unprivileged nested container (a CI runner, a cloud dev box) and fails every command there;
 * probed once per process, since it is a property of the host.
 */
let skipSocketFilter: boolean | undefined;

type SandboxEntry = {
  readonly workspaceDir: string;
  readonly tmpDir: string;
  readonly manager: ISandboxManager;
  /** srt tears down per-command mount points on the manager, so one command runs at a time. */
  readonly semaphore: Semaphore.Semaphore;
};

/**
 * Runs sandboxes as processes on this machine, confined by the OS sandbox (bubblewrap on Linux,
 * Seatbelt on macOS) through `@carderne/sandbox-runtime`: writes only inside the sandbox's own
 * directory, the user's home unreadable, network limited to {@link DEFAULT_ALLOWED_DOMAINS}, and
 * per-command CPU, memory and file-size limits. Node and Bun only.
 *
 * A sandbox is `<root>/<sandboxId>/` holding its record and a `workspace/` that is the command's
 * working directory and `$HOME`; `/workspace/…` paths in file calls map onto it.
 */
export class LocalSandboxBackend implements SandboxBackend {
  readonly kind = 'local';

  readonly #root: string;
  readonly #options: LocalSandboxOptions;
  readonly #entries = new Map<string, SandboxEntry>();
  readonly #openLock = Semaphore.makeUnsafe(1);

  constructor(options: LocalSandboxOptions = {}) {
    this.#options = options;
    this.#root = options.root ?? process.env.DX_SANDBOX_ROOT ?? join(homedir(), '.local', 'state', 'dxos', 'sandboxes');
  }

  get root(): string {
    return this.#root;
  }

  create(
    spaceId: string,
    sandboxId: string,
    options: CreateSandboxOptions = {},
  ): Effect.Effect<SandboxRecord, SandboxError> {
    return this.#ensureRecord(spaceId, sandboxId, options);
  }

  exec(spaceId: string, sandboxId: string, request: ExecRequest): Effect.Effect<ExecResult, SandboxError> {
    return Effect.gen({ self: this }, function* () {
      const entry = yield* this.#open(spaceId, sandboxId);
      const cwd = request.cwd ? yield* this.#resolve(entry, request.cwd) : entry.workspaceDir;
      return yield* this.#run(entry, request, cwd).pipe(entry.semaphore.withPermits(1));
    });
  }

  readFileBytes(
    spaceId: string,
    sandboxId: string,
    path: string,
  ): Effect.Effect<{ bytes: Uint8Array; type: string }, SandboxError> {
    return Effect.gen({ self: this }, function* () {
      const entry = yield* this.#open(spaceId, sandboxId);
      const hostPath = yield* this.#resolve(entry, path);
      const bytes = new Uint8Array(yield* attempt(`read ${path}`, () => readFile(hostPath)));
      return { bytes, type: sniffMimeType(bytes) };
    });
  }

  writeFile(spaceId: string, sandboxId: string, path: string, content: Uint8Array): Effect.Effect<void, SandboxError> {
    return Effect.gen({ self: this }, function* () {
      const entry = yield* this.#open(spaceId, sandboxId);
      const hostPath = yield* this.#resolve(entry, path);
      yield* attempt(`write ${path}`, async () => {
        await mkdir(dirname(hostPath), { recursive: true });
        await writeFile(hostPath, content);
      });
    });
  }

  listFiles(spaceId: string, sandboxId: string, path: string): Effect.Effect<readonly FileEntry[], SandboxError> {
    return Effect.gen({ self: this }, function* () {
      const entry = yield* this.#open(spaceId, sandboxId);
      const hostPath = yield* this.#resolve(entry, path);
      return yield* attempt(`list ${path}`, async () => {
        const dirents = await readdir(hostPath, { withFileTypes: true });
        return Promise.all(
          dirents.map(async (dirent): Promise<FileEntry> => {
            if (dirent.isDirectory()) {
              return { name: dirent.name, type: 'directory' };
            }
            const { size } = await stat(join(hostPath, dirent.name));
            return { name: dirent.name, type: 'file', size };
          }),
        );
      });
    });
  }

  /** Stops the sandbox's proxies and deletes its directory. */
  destroy(spaceId: string, sandboxId: string): Effect.Effect<void, SandboxError> {
    return Effect.gen({ self: this }, function* () {
      yield* this.#readRecord(spaceId, sandboxId);
      yield* this.#close(sandboxId);
      yield* attempt('destroy sandbox', () => rm(this.#sandboxDir(sandboxId), { recursive: true, force: true }));
    });
  }

  /** Stops every sandbox's proxies, leaving their files in place. */
  close(): Effect.Effect<void, SandboxError> {
    return Effect.forEach([...this.#entries.keys()], (sandboxId) => this.#close(sandboxId), { discard: true });
  }

  #sandboxDir(sandboxId: string): string {
    // An id with a separator would name a directory outside the root.
    if (!/^[\w-]+$/.test(sandboxId)) {
      throw new Error(`Invalid sandbox id: ${sandboxId}`);
    }
    return join(this.#root, sandboxId);
  }

  #resolve(entry: SandboxEntry, path: string): Effect.Effect<string, SandboxError> {
    return Effect.try({
      try: () => resolveSandboxPath(entry.workspaceDir, path),
      catch: (cause) => new SandboxError({ message: errorMessage(cause), cause }),
    });
  }

  #readRecord(spaceId: string, sandboxId: string): Effect.Effect<SandboxRecord | undefined, SandboxError> {
    return attempt('read sandbox record', async () => {
      let text: string;
      try {
        text = await readFile(join(this.#sandboxDir(sandboxId), 'sandbox.json'), 'utf8');
      } catch (error) {
        if (isNotFound(error)) {
          return undefined;
        }
        throw error;
      }
      const record = Schema.decodeUnknownSync(SandboxRecord)(JSON.parse(text));
      // Ids are global but a sandbox belongs to one space, as on sandbox-service.
      if (record.spaceId !== spaceId) {
        throw new Error(`Sandbox ${sandboxId} belongs to another space.`);
      }
      return record;
    });
  }

  #ensureRecord(
    spaceId: string,
    sandboxId: string,
    options: CreateSandboxOptions = {},
  ): Effect.Effect<SandboxRecord, SandboxError> {
    return Effect.gen({ self: this }, function* () {
      const existing = yield* this.#readRecord(spaceId, sandboxId);
      if (existing) {
        return existing;
      }
      const createdAt = new Date();
      const record: SandboxRecord = {
        id: sandboxId,
        spaceId,
        name: options.name,
        baseImage: LOCAL_BASE_IMAGE,
        createdAt: createdAt.toISOString(),
        // Reported for parity with sandbox-service; local sandboxes persist until destroyed.
        expiresAt: new Date(createdAt.getTime() + (options.expiresIn ?? DEFAULT_EXPIRY)).toISOString(),
      };
      const dir = this.#sandboxDir(sandboxId);
      yield* attempt('create sandbox', async () => {
        await mkdir(join(dir, 'workspace'), { recursive: true });
        await mkdir(join(dir, 'tmp'), { recursive: true });
        await writeFile(join(dir, 'sandbox.json'), JSON.stringify(record, null, 2));
      });
      return record;
    });
  }

  /** The sandbox's live state, creating the sandbox on first use as sandbox-service does. */
  #open(spaceId: string, sandboxId: string): Effect.Effect<SandboxEntry, SandboxError> {
    return Effect.gen({ self: this }, function* () {
      yield* this.#ensureRecord(spaceId, sandboxId);
      const existing = this.#entries.get(sandboxId);
      if (existing) {
        return existing;
      }

      const dir = this.#sandboxDir(sandboxId);
      const workspaceDir = join(dir, 'workspace');
      const tmpDir = join(dir, 'tmp');
      const manager = yield* this.#initializeManager(workspaceDir, tmpDir);
      const entry: SandboxEntry = { workspaceDir, tmpDir, manager, semaphore: Semaphore.makeUnsafe(1) };
      this.#entries.set(sandboxId, entry);
      return entry;
    }).pipe(this.#openLock.withPermits(1));
  }

  #initializeManager(workspaceDir: string, tmpDir: string): Effect.Effect<ISandboxManager, SandboxError> {
    return Effect.gen({ self: this }, function* () {
      const home = homedir();
      const config = (socketFilterOff: boolean): SandboxRuntimeConfig => ({
        network: {
          allowedDomains: [...(this.#options.allowedDomains ?? DEFAULT_ALLOWED_DOMAINS)],
          deniedDomains: [],
          ...(socketFilterOff ? { allowAllUnixSockets: true } : {}),
        },
        filesystem: {
          // Every other sandbox, and the user's credentials, dotfiles and documents. The writable
          // directories are re-allowed by name rather than through `dir`: on Linux a read re-allow
          // is a read-only bind, and one over their parent would shadow their writable binds.
          denyRead: [home, this.#root, ...(this.#options.denyRead ?? [])],
          allowRead: [workspaceDir, tmpDir, ...toolchainDirs(home), ...(this.#options.allowRead ?? [])],
          allowWrite: [workspaceDir, tmpDir],
          denyWrite: [],
        },
      });

      const start = (socketFilterOff: boolean) =>
        attempt('start sandbox', async () => {
          const manager = createSandboxManager();
          if (!manager.isSupportedPlatform()) {
            throw new Error(`Local sandboxes are not supported on ${platform()}.`);
          }
          const { errors } = manager.checkDependencies();
          if (errors.length > 0) {
            throw new Error(`Local sandbox prerequisites missing: ${errors.join('; ')}`);
          }
          await manager.initialize(config(socketFilterOff));
          return manager;
        });

      if (skipSocketFilter !== undefined) {
        return yield* start(skipSocketFilter);
      }

      const manager = yield* start(false);
      const probe = yield* this.#spawn(
        manager,
        'true',
        { cwd: workspaceDir, env: baseEnv(workspaceDir, tmpDir) },
        30_000,
      );
      if (probe.exitCode === 0 || !probe.stderr.includes('apply-seccomp')) {
        skipSocketFilter = false;
        return manager;
      }

      log.warn('sandbox: seccomp unavailable on this host; unix sockets will not be filtered', {
        stderr: probe.stderr.trim(),
      });
      skipSocketFilter = true;
      yield* attempt('stop sandbox', () => manager.reset());
      return yield* start(true);
    });
  }

  #run(entry: SandboxEntry, request: ExecRequest, cwd: string): Effect.Effect<ExecResult, SandboxError> {
    return Effect.gen({ self: this }, function* () {
      // The command travels as a script file, so newlines, heredocs and quotes reach the shell intact.
      const script = join(entry.tmpDir, `.exec-${randomUUID()}.sh`);
      const body = [
        ...limitsPrelude(this.#options.limits ?? DEFAULT_LIMITS, platform()),
        `cd ${shellQuote(cwd)} || exit 1`,
        request.command,
        '',
      ].join('\n');
      yield* attempt('stage command', () => writeFile(script, body));

      return yield* this.#spawn(
        entry.manager,
        `bash ${shellQuote(script)}`,
        { cwd, env: { ...baseEnv(entry.workspaceDir, entry.tmpDir), ...request.env } },
        request.timeout ?? DEFAULT_EXEC_TIMEOUT,
      ).pipe(
        Effect.ensuring(
          Effect.promise(async () => {
            entry.manager.cleanupAfterCommand();
            await unlink(script).catch(() => {});
          }),
        ),
      );
    });
  }

  /** Runs `command` confined by `manager`, bounded by `timeout` ms of wall-clock time. */
  #spawn(
    manager: ISandboxManager,
    command: string,
    { cwd, env }: { cwd: string; env: Record<string, string> },
    timeout: number,
  ): Effect.Effect<ExecResult, SandboxError> {
    const maxOutputBytes = this.#options.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES;
    return Effect.gen(function* () {
      const wrapped = yield* attempt('wrap command', () => manager.wrapWithSandbox(command));
      return yield* Effect.callback<ExecResult, SandboxError>((resume) => {
        // Its own process group, so a timeout kills everything the command started, not just the shell.
        const child = spawn('bash', ['-c', wrapped], { cwd, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
        const stdout = new OutputBuffer(maxOutputBytes);
        const stderr = new OutputBuffer(maxOutputBytes);
        child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
        child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));

        let timedOut = false;
        const killGroup = () => {
          try {
            if (child.pid !== undefined) {
              process.kill(-child.pid, 'SIGKILL');
            }
          } catch {
            // Already gone.
          }
        };
        const timer = setTimeout(() => {
          timedOut = true;
          killGroup();
        }, timeout);

        child.on('error', (cause) => {
          clearTimeout(timer);
          resume(Effect.fail(new SandboxError({ message: `failed to start command: ${cause.message}`, cause })));
        });
        child.on('close', (code, signal) => {
          clearTimeout(timer);
          if (timedOut) {
            resume(
              Effect.succeed({
                stdout: stdout.text(),
                stderr: `${stderr.text()}\ncommand timed out after ${timeout}ms and was killed`,
                exitCode: -1,
                success: false,
              }),
            );
            return;
          }
          // A signal is reported the way a shell reports it, so a SIGXCPU from the CPU limit reads 152.
          const exitCode = code ?? 128 + (signal ? constants.signals[signal] : 0);
          resume(Effect.succeed({ stdout: stdout.text(), stderr: stderr.text(), exitCode, success: exitCode === 0 }));
        });

        return Effect.sync(() => {
          clearTimeout(timer);
          killGroup();
        });
      });
    });
  }

  #close(sandboxId: string): Effect.Effect<void, SandboxError> {
    return Effect.gen({ self: this }, function* () {
      const entry = this.#entries.get(sandboxId);
      if (!entry) {
        return;
      }
      this.#entries.delete(sandboxId);
      yield* attempt('stop sandbox', () => entry.manager.reset());
    });
  }
}

/** Collects a stream up to a byte budget, noting what was dropped. */
class OutputBuffer {
  readonly #chunks: Buffer[] = [];
  #size = 0;
  #dropped = 0;

  constructor(private readonly _limit: number) {}

  push(chunk: Buffer): void {
    const room = this._limit - this.#size;
    if (room <= 0) {
      this.#dropped += chunk.length;
      return;
    }
    const kept = chunk.length > room ? chunk.subarray(0, room) : chunk;
    this.#chunks.push(kept);
    this.#size += kept.length;
    this.#dropped += chunk.length - kept.length;
  }

  text(): string {
    const text = Buffer.concat(this.#chunks).toString('utf8');
    return this.#dropped > 0 ? `${text}\n[${this.#dropped} bytes of output truncated]` : text;
  }
}

/**
 * The whole environment a command starts with: the host's own is never inherited, since it
 * carries tokens and keys the sandbox exists to keep from the command.
 */
const baseEnv = (workspaceDir: string, tmpDir: string): Record<string, string> => ({
  PATH: process.env.PATH ?? '/usr/local/bin:/usr/bin:/bin',
  HOME: workspaceDir,
  TMPDIR: tmpDir,
  LANG: 'C.UTF-8',
  WORKSPACE: workspaceDir,
});

/**
 * Top-level directories under `home` that `PATH` runs tools from (`~/.bun`, `~/.proto`, `~/.cargo`):
 * hiding the home directory must not also hide the interpreters a command is expected to call.
 */
const toolchainDirs = (home: string): string[] => {
  const dirs = new Set<string>();
  for (const entry of (process.env.PATH ?? '').split(':')) {
    const offset = relative(home, entry);
    if (!entry || !isAbsolute(entry) || offset === '' || offset.startsWith('..') || isAbsolute(offset)) {
      continue;
    }
    dirs.add(join(home, offset.split(sep)[0]));
  }
  return [...dirs];
};

const MAGIC_TYPES: readonly { type: string; magic: readonly number[] }[] = [
  { type: 'image/png', magic: [0x89, 0x50, 0x4e, 0x47] },
  { type: 'image/jpeg', magic: [0xff, 0xd8, 0xff] },
  { type: 'image/gif', magic: [0x47, 0x49, 0x46, 0x38] },
  { type: 'application/pdf', magic: [0x25, 0x50, 0x44, 0x46] },
  { type: 'application/zip', magic: [0x50, 0x4b, 0x03, 0x04] },
];

/**
 * MIME type from the file's content, never its name: a `.png` holding something else must not be
 * served as one. Mirrors what sandbox-service reports: text when the bytes are valid UTF-8.
 */
export const sniffMimeType = (bytes: Uint8Array): string => {
  const match = MAGIC_TYPES.find(({ magic }) => magic.every((byte, index) => bytes[index] === byte));
  if (match) {
    return match.type;
  }
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 12) === 'WEBP') {
    return 'image/webp';
  }
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return 'text/plain';
  } catch {
    return 'application/octet-stream';
  }
};

const ascii = (bytes: Uint8Array, start: number, end: number): string =>
  String.fromCharCode(...bytes.subarray(start, end));

const shellQuote = (value: string): string => `'${value.replaceAll("'", `'\\''`)}'`;

const isNotFound = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';

const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));

const attempt = <T>(action: string, run: () => Promise<T>): Effect.Effect<T, SandboxError> =>
  Effect.tryPromise({
    try: run,
    catch: (cause) => new SandboxError({ message: `${action}: ${errorMessage(cause)}`, cause }),
  });
