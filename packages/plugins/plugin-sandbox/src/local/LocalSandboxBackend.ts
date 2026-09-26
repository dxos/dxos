//
// Copyright 2026 DXOS.org
//

import { type ISandboxManager, type SandboxRuntimeConfig, createSandboxManager } from '@carderne/sandbox-runtime';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as Semaphore from 'effect/Semaphore';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, unlink, writeFile } from 'node:fs/promises';
import { constants, homedir, platform } from 'node:os';
import { isAbsolute, join, relative } from 'node:path';

import { log } from '@dxos/log';

import { type ExecRequest, type ExecResult, type FileEntry, SandboxRecord } from '../services/SandboxClient.ts';
import * as SandboxService from '../types/SandboxService.ts';
import { type ResourceLimits, limitsPrelude } from './limits.ts';
import { resolveSandboxPath } from './paths.ts';

export type LocalSandboxOptions = {
  /** Directory holding every sandbox; defaults to `~/.local/state/dxos/sandboxes`. */
  root?: string;
  /** `PATH` for the host shell and the commands it confines; defaults to the system directories. */
  path?: string;
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
const DEFAULT_PATH = '/usr/local/bin:/usr/bin:/bin';
const MAX_TRANSFER_BYTES = 64 * 1024 * 1024;
const TRANSFER_TIMEOUT = 60_000;
const LOCAL_BASE_IMAGE = 'local';

/**
 * Whether srt's seccomp unix-socket filter must be dropped. Its helper cannot map uids inside an
 * unprivileged nested container (a CI runner, a cloud dev box) and fails every command there;
 * probed once per process, since it is a property of the host.
 */
let skipSocketFilter: boolean | undefined;

type SpawnResult = {
  readonly exitCode: number;
  readonly stdout: OutputBuffer;
  readonly stderr: OutputBuffer;
  readonly timedOut: boolean;
  readonly timeout: number;
};

type SandboxEntry = {
  readonly dir: string;
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
export class LocalSandboxBackend implements SandboxService.Backend {
  readonly kind = 'local';

  readonly #root: string;
  readonly #options: LocalSandboxOptions;
  readonly #entries = new Map<string, SandboxEntry>();
  readonly #openLock = Semaphore.makeUnsafe(1);
  /**
   * The whole environment of the host shell that starts the confinement. The host's own is never
   * inherited: anything a caller or the sandbox controls (`BASH_ENV`, `HOME`, `LD_PRELOAD`) would
   * run code before the sandbox exists, and it carries tokens the sandbox keeps from the command.
   */
  readonly #hostEnv: Record<string, string>;

  constructor(options: LocalSandboxOptions = {}) {
    this.#options = options;
    this.#root = options.root ?? join(homedir(), '.local', 'state', 'dxos', 'sandboxes');
    this.#hostEnv = { PATH: options.path ?? DEFAULT_PATH, LANG: 'C.UTF-8' };
  }

  get root(): string {
    return this.#root;
  }

  create(
    spaceId: string,
    sandboxId: string,
    options: SandboxService.CreateOptions = {},
  ): Effect.Effect<SandboxRecord, SandboxService.SandboxError> {
    return this.#ensureRecord(spaceId, sandboxId, options);
  }

  exec(
    spaceId: string,
    sandboxId: string,
    request: ExecRequest,
  ): Effect.Effect<ExecResult, SandboxService.SandboxError> {
    return Effect.gen({ self: this }, function* () {
      const entry = yield* this.#open(spaceId, sandboxId);
      const cwd = request.cwd ? yield* this.#resolve(entry, request.cwd) : entry.workspaceDir;
      return yield* this.#run(entry, request, cwd);
    });
  }

  readFileBytes(
    spaceId: string,
    sandboxId: string,
    path: string,
  ): Effect.Effect<{ bytes: Uint8Array; type: string }, SandboxService.SandboxError> {
    return Effect.gen({ self: this }, function* () {
      const entry = yield* this.#open(spaceId, sandboxId);
      const target = yield* this.#resolve(entry, path);
      const result = yield* this.#transfer(entry, `read ${path}`, [
        `f=${shellQuote(target)}`,
        '[ -f "$f" ] || { echo "not a file" >&2; exit 2; }',
        'exec cat -- "$f"',
      ]);
      const bytes = new Uint8Array(result.stdout.bytes());
      return { bytes, type: sniffMimeType(bytes) };
    });
  }

  writeFile(
    spaceId: string,
    sandboxId: string,
    path: string,
    content: Uint8Array,
  ): Effect.Effect<void, SandboxService.SandboxError> {
    return Effect.gen({ self: this }, function* () {
      const entry = yield* this.#open(spaceId, sandboxId);
      const target = yield* this.#resolve(entry, path);
      yield* this.#transfer(
        entry,
        `write ${path}`,
        [`f=${shellQuote(target)}`, 'mkdir -p -- "$(dirname -- "$f")" && cat > "$f"'],
        content,
      );
    });
  }

  listFiles(
    spaceId: string,
    sandboxId: string,
    path: string,
  ): Effect.Effect<readonly FileEntry[], SandboxService.SandboxError> {
    return Effect.gen({ self: this }, function* () {
      const entry = yield* this.#open(spaceId, sandboxId);
      const target = yield* this.#resolve(entry, path);
      // NUL-separated `type size name` records: names may hold any byte but NUL and `/`.
      const result = yield* this.#transfer(entry, `list ${path}`, [
        `d=${shellQuote(target)}`,
        '[ -d "$d" ] || { echo "not a directory" >&2; exit 2; }',
        'for f in "$d"/* "$d"/.[!.]* "$d"/..?*; do',
        '  [ -e "$f" ] || [ -L "$f" ] || continue',
        '  if [ -d "$f" ]; then printf \'d\\t\\t%s\\0\' "${f##*/}"',
        '  else printf \'f\\t%s\\t%s\\0\' "$(wc -c < "$f" 2>/dev/null | tr -d \' \')" "${f##*/}"; fi',
        'done',
      ]);
      return parseListing(result.stdout.bytes().toString('utf8'));
    });
  }

  /** Stops the sandbox's proxies and deletes its directory. */
  destroy(spaceId: string, sandboxId: string): Effect.Effect<void, SandboxService.SandboxError> {
    return Effect.gen({ self: this }, function* () {
      yield* this.#readRecord(spaceId, sandboxId);
      yield* this.#close(sandboxId);
      yield* attempt('destroy sandbox', () => rm(this.#sandboxDir(sandboxId), { recursive: true, force: true }));
    });
  }

  /** Stops every sandbox's proxies, leaving their files in place. */
  close(): Effect.Effect<void, SandboxService.SandboxError> {
    return Effect.forEach([...this.#entries.keys()], (sandboxId) => this.#close(sandboxId), { discard: true });
  }

  #sandboxDir(sandboxId: string): string {
    // An id with a separator would name a directory outside the root.
    if (!/^[\w-]+$/.test(sandboxId)) {
      throw new Error(`Invalid sandbox id: ${sandboxId}`);
    }
    return join(this.#root, sandboxId);
  }

  #resolve(entry: SandboxEntry, path: string): Effect.Effect<string, SandboxService.SandboxError> {
    return Effect.try({
      try: () => resolveSandboxPath(entry.workspaceDir, path),
      catch: (cause) => new SandboxService.SandboxError({ message: errorMessage(cause), cause }),
    });
  }

  #readRecord(
    spaceId: string,
    sandboxId: string,
  ): Effect.Effect<SandboxRecord | undefined, SandboxService.SandboxError> {
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
    options: SandboxService.CreateOptions = {},
  ): Effect.Effect<SandboxRecord, SandboxService.SandboxError> {
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
  #open(spaceId: string, sandboxId: string): Effect.Effect<SandboxEntry, SandboxService.SandboxError> {
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
      const entry: SandboxEntry = { dir, workspaceDir, tmpDir, manager, semaphore: Semaphore.makeUnsafe(1) };
      this.#entries.set(sandboxId, entry);
      return entry;
    }).pipe(this.#openLock.withPermits(1));
  }

  #initializeManager(
    workspaceDir: string,
    tmpDir: string,
  ): Effect.Effect<ISandboxManager, SandboxService.SandboxError> {
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
          allowRead: [
            workspaceDir,
            tmpDir,
            ...toolchainDirs(home, this.#hostEnv.PATH.split(':')),
            ...(this.#options.allowRead ?? []),
          ],
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
      const probe = yield* this.#spawn(manager, 'true', {
        cwd: workspaceDir,
        timeout: 30_000,
        maxOutputBytes: DEFAULT_MAX_OUTPUT_BYTES,
      });
      if (probe.exitCode === 0 || !probe.stderr.text().includes('apply-seccomp')) {
        skipSocketFilter = false;
        return manager;
      }

      log.warn('sandbox: seccomp unavailable on this host; unix sockets will not be filtered', {
        stderr: probe.stderr.text().trim(),
      });
      skipSocketFilter = true;
      yield* attempt('stop sandbox', () => manager.reset());
      return yield* start(true);
    });
  }

  #run(entry: SandboxEntry, request: ExecRequest, cwd: string): Effect.Effect<ExecResult, SandboxService.SandboxError> {
    return Effect.gen({ self: this }, function* () {
      const exports = yield* Effect.try({
        try: () => envExports(request.env ?? {}),
        catch: (cause) => new SandboxService.SandboxError({ message: errorMessage(cause), cause }),
      });
      const result = yield* this.#runScript(entry, [...exports, `cd ${shellQuote(cwd)} || exit 1`, request.command], {
        timeout: request.timeout ?? DEFAULT_EXEC_TIMEOUT,
        maxOutputBytes: this.#options.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES,
      });
      if (result.timedOut) {
        return {
          stdout: result.stdout.text(),
          stderr: `${result.stderr.text()}\ncommand timed out after ${result.timeout}ms and was killed`,
          exitCode: -1,
          success: false,
        };
      }
      return {
        stdout: result.stdout.text(),
        stderr: result.stderr.text(),
        exitCode: result.exitCode,
        success: result.exitCode === 0,
      };
    });
  }

  /**
   * Runs `lines` as a script inside the sandbox. File transfers go through here too rather than
   * through host `fs` calls: a command can plant symlinks in its workspace, and only the OS sandbox
   * resolves them against what the command may actually reach.
   */
  #runScript(
    entry: SandboxEntry,
    lines: readonly string[],
    options: { timeout: number; maxOutputBytes: number; input?: Uint8Array },
  ): Effect.Effect<SpawnResult, SandboxService.SandboxError> {
    return Effect.gen({ self: this }, function* () {
      // The script travels as a file, so newlines, heredocs and quotes reach the shell intact.
      const script = join(entry.tmpDir, `.exec-${randomUUID()}.sh`);
      const body = [
        ...limitsPrelude(this.#options.limits ?? DEFAULT_LIMITS, platform()),
        ...sandboxExports(entry),
        ...lines,
        '',
      ].join('\n');
      // Exclusive create: the directory is writable from inside, and a planted link must not be followed.
      yield* attempt('stage command', () => writeFile(script, body, { flag: 'wx' }));
      return yield* this.#spawn(entry.manager, `bash ${shellQuote(script)}`, { cwd: entry.dir, ...options }).pipe(
        Effect.ensuring(
          Effect.promise(async () => {
            entry.manager.cleanupAfterCommand();
            await unlink(script).catch(() => {});
          }),
        ),
        entry.semaphore.withPermits(1),
      );
    });
  }

  /**
   * Runs `command` confined by `manager`, bounded by `timeout` ms of wall-clock time. The host
   * shell that starts the confinement gets a fixed environment: anything a caller or the sandbox
   * controls (`BASH_ENV`, `HOME`, `LD_PRELOAD`) would run code before the sandbox exists.
   */
  #spawn(
    manager: ISandboxManager,
    command: string,
    {
      cwd,
      timeout,
      maxOutputBytes,
      input,
    }: { cwd: string; timeout: number; maxOutputBytes: number; input?: Uint8Array },
  ): Effect.Effect<SpawnResult, SandboxService.SandboxError> {
    const hostEnv = this.#hostEnv;
    return Effect.gen(function* () {
      const wrapped = yield* attempt('wrap command', () => manager.wrapWithSandbox(command));
      return yield* Effect.callback<SpawnResult, SandboxService.SandboxError>((resume) => {
        // Its own process group, so a timeout kills everything the command started, not just the shell.
        const child = spawn('bash', ['-c', wrapped], {
          cwd,
          env: hostEnv,
          detached: true,
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        const stdout = new OutputBuffer(maxOutputBytes);
        const stderr = new OutputBuffer(maxOutputBytes);
        child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
        child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));
        // A command that exits without reading its input closes the pipe under us.
        child.stdin.on('error', () => {});
        child.stdin.end(input);

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
          resume(
            Effect.fail(
              new SandboxService.SandboxError({ message: `failed to start command: ${cause.message}`, cause }),
            ),
          );
        });
        child.on('close', (code, signal) => {
          clearTimeout(timer);
          // A signal is reported the way a shell reports it, so a SIGXCPU from the CPU limit reads 152.
          const exitCode = code ?? 128 + (signal ? constants.signals[signal] : 0);
          resume(Effect.succeed({ exitCode, stdout, stderr, timedOut, timeout }));
        });

        return Effect.sync(() => {
          clearTimeout(timer);
          killGroup();
        });
      });
    });
  }

  /** Runs a file transfer script, failing on a non-zero exit or on output past the transfer limit. */
  #transfer(
    entry: SandboxEntry,
    action: string,
    lines: readonly string[],
    input?: Uint8Array,
  ): Effect.Effect<SpawnResult, SandboxService.SandboxError> {
    return this.#runScript(entry, lines, { timeout: TRANSFER_TIMEOUT, maxOutputBytes: MAX_TRANSFER_BYTES, input }).pipe(
      Effect.flatMap((result) => {
        if (result.timedOut || result.exitCode !== 0 || result.stdout.truncated) {
          const reason = result.timedOut
            ? 'timed out'
            : result.stdout.truncated
              ? `larger than ${MAX_TRANSFER_BYTES} bytes`
              : result.stderr.text().trim() || `exit ${result.exitCode}`;
          return Effect.fail(new SandboxService.SandboxError({ message: `${action}: ${reason}` }));
        }
        return Effect.succeed(result);
      }),
    );
  }

  #close(sandboxId: string): Effect.Effect<void, SandboxService.SandboxError> {
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

  get truncated(): boolean {
    return this.#dropped > 0;
  }

  bytes(): Buffer {
    return Buffer.concat(this.#chunks);
  }

  text(): string {
    const text = this.bytes().toString('utf8');
    return this.#dropped > 0 ? `${text}\n[${this.#dropped} bytes of output truncated]` : text;
  }
}

/** Environment set inside the sandbox, where it can only affect the confined command. */
const sandboxExports = ({ workspaceDir, tmpDir }: SandboxEntry): string[] => [
  `export HOME=${shellQuote(workspaceDir)}`,
  `export TMPDIR=${shellQuote(tmpDir)}`,
  `export WORKSPACE=${shellQuote(workspaceDir)}`,
];

/** The caller's variables as `export` lines; a name that is not an identifier would inject shell. */
const envExports = (env: Record<string, string>): string[] =>
  Object.entries(env).map(([name, value]) => {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
      throw new Error(`Invalid environment variable name: ${name}`);
    }
    return `export ${name}=${shellQuote(value)}`;
  });

/**
 * The `PATH` entries under `home` (`~/.bun/bin`, `~/.cargo/bin`), each exactly: hiding the home
 * directory must not hide the tools a command calls, and widening an entry to its top-level
 * directory would re-expose `~/.local` or `~/.config` wholesale. A tool that reads beyond its own
 * directory needs an `allowRead` entry.
 */
export const toolchainDirs = (home: string, entries: readonly string[]): string[] => {
  const dirs = new Set<string>();
  for (const entry of entries) {
    const offset = relative(home, entry);
    if (!entry || !isAbsolute(entry) || offset === '' || offset.startsWith('..') || isAbsolute(offset)) {
      continue;
    }
    dirs.add(entry);
  }
  return [...dirs];
};

const parseListing = (listing: string): FileEntry[] =>
  listing
    .split('\0')
    .filter((record) => record.length > 0)
    .map((record): FileEntry => {
      const [kind, size, ...name] = record.split('\t');
      return kind === 'd'
        ? { name: name.join('\t'), type: 'directory' }
        : { name: name.join('\t'), type: 'file', ...(size ? { size: Number(size) } : {}) };
    });

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

const attempt = <T>(action: string, run: () => Promise<T>): Effect.Effect<T, SandboxService.SandboxError> =>
  Effect.tryPromise({
    try: run,
    catch: (cause) => new SandboxService.SandboxError({ message: `${action}: ${errorMessage(cause)}`, cause }),
  });
