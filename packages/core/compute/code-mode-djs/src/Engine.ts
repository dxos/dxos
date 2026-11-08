//
// Copyright 2026 DXOS.org
//

import { Sandbox, type SandboxImage, type SandboxOptions, loadModule } from '@earendil-works/djs';

import { type Database, JsonSchema, type Registry, Type } from '@dxos/echo';
import { log } from '@dxos/log';

import { Bridge } from './Bridge.ts';
import { GUEST_GLOBAL, HostFunction, type TypeRecord, versionOf } from './protocol.ts';
import { Session } from './Session.ts';
import * as Snapshot from './Snapshot.ts';

/** The guest runtime as one script, and the hash that keys images to it. */
export type GuestBundle = {
  readonly code: string;
  readonly hash: string;
};

export type EngineOptions = {
  readonly bundle: GuestBundle;
  /** The compiled djs module; loaded from the package by default. */
  readonly module?: WebAssembly.Module;
  /** Heap cap of each session, in bytes. */
  readonly memoryLimit?: number;
  /** Work one evaluation may do before it is stopped, in djs fuel units. */
  readonly maxFuel?: number;
};

/** Generous for a program, small enough that a runaway loop stops within a few seconds. */
const DEFAULT_MAX_FUEL = 2_000_000_000;
const DEFAULT_MEMORY_LIMIT = 256 << 20;

/**
 * Opens code-mode sessions in djs.
 *
 * The guest bundle runs once, in a VM that is then collected and kept as the base image; every session
 * starts as a copy of it with the bridge bound by name, so opening one costs a copy of a few megabytes
 * rather than parsing and initializing effect and ECHO again.
 */
export class Engine {
  readonly #options: EngineOptions;
  readonly #module: WebAssembly.Module;
  readonly #base: SandboxImage;
  /** The base image with a set of types registered, by the hash of that set. */
  readonly #typed = new Map<string, Promise<SandboxImage>>();
  /** How long building the base image took, for diagnostics. */
  readonly baseMillis: number;

  private constructor(options: EngineOptions, module: WebAssembly.Module, base: SandboxImage, baseMillis: number) {
    this.#options = options;
    this.#module = module;
    this.#base = base;
    this.baseMillis = baseMillis;
  }

  /** Builds the base image: one VM that loads the guest bundle, collected. */
  static async make(options: EngineOptions): Promise<Engine> {
    const module = options.module ?? (await loadModule());
    const started = performance.now();
    const sandbox = new Sandbox(sandboxOptions({ bridge: undefined, module, options }));
    try {
      sandbox.run(options.bundle.code);
      const base = sandbox.image();
      const baseMillis = performance.now() - started;
      log.info('code-mode-djs base image', { bytes: base.image.byteLength, ms: Math.round(baseMillis) });
      return new Engine(options, module, base, baseMillis);
    } finally {
      sandbox.dispose();
    }
  }

  get bundleHash(): string {
    return this.#options.bundle.hash;
  }

  /** Bytes of the base image every session copies. */
  get baseBytes(): number {
    return this.#base.image.byteLength;
  }

  /**
   * A new session over `db`: a copy of the image that has the database's types registered, which is
   * built from the base image the first time a set of types is seen.
   */
  async open(db: Database.Database): Promise<Session> {
    const image = await this.#typedImage(registrySnapshot(db));
    const bridge = new Bridge();
    const sandbox = await Sandbox.fromImage(image, this.#sandboxOptions(bridge));
    sandbox.run(`${GUEST_GLOBAL}.open(__dxOpen);`, { __dxOpen: { spaceId: String(db.spaceId) } });
    return new Session({ sandbox, bridge, bundleHash: this.bundleHash, names: [] });
  }

  /** A session from a {@link Session.snapshot}; fails, naming the difference, if this engine cannot load it. */
  async restore(bytes: Uint8Array): Promise<Session> {
    const { header, image } = Snapshot.decode(bytes);
    if (header.bundle !== this.bundleHash) {
      throw new Error(`The snapshot needs guest bundle ${header.bundle}; this engine has ${this.bundleHash}.`);
    }
    const bridge = new Bridge();
    const sandbox = await Sandbox.fromImage(image, this.#sandboxOptions(bridge));
    return new Session({ sandbox, bridge, bundleHash: this.bundleHash, names: header.names });
  }

  #typedImage({ types, key }: { readonly types: readonly TypeRecord[]; readonly key: string }): Promise<SandboxImage> {
    let image = this.#typed.get(key);
    if (!image) {
      image = (async () => {
        const sandbox = await Sandbox.fromImage(this.#base, this.#sandboxOptions(undefined));
        try {
          sandbox.run(`${GUEST_GLOBAL}.registerTypes(__dxTypes);`, { __dxTypes: types });
          return sandbox.image();
        } finally {
          sandbox.dispose();
        }
      })();
      // A failed build is not kept, so the next session tries again.
      image.catch(() => this.#typed.delete(key));
      this.#typed.set(key, image);
    }
    return image;
  }

  #sandboxOptions(bridge: Bridge | undefined): SandboxOptions {
    return sandboxOptions({ bridge, module: this.#module, options: this.#options });
  }
}

/**
 * The sandbox options of every VM the engine makes. The base image is made with no bridge: the
 * functions exist by name, and a session's copy binds them to its own bridge.
 */
const sandboxOptions = ({
  bridge,
  module,
  options,
}: {
  bridge: Bridge | undefined;
  module: WebAssembly.Module;
  options: EngineOptions;
}): SandboxOptions => {
  const answer =
    <A extends unknown[], R>(call: (bridge: Bridge, ...args: A) => R) =>
    (...args: A): R => {
      if (!bridge) {
        throw new Error('The base image has no bridge.');
      }
      return call(bridge, ...args);
    };
  return {
    module,
    memoryLimit: options.memoryLimit ?? DEFAULT_MEMORY_LIMIT,
    maxFuel: options.maxFuel ?? DEFAULT_MAX_FUEL,
    // A model's program is not meant to log; what it prints goes through `print`.
    console: {
      log: (...args: unknown[]) => log.info('code-mode-djs guest', { args }),
      info: (...args: unknown[]) => log.info('code-mode-djs guest', { args }),
      warn: (...args: unknown[]) => log.warn('code-mode-djs guest', { args }),
      error: (...args: unknown[]) => log.warn('code-mode-djs guest', { args }),
    },
    unhandledRejections: 'collect',
    // Synchronous from the guest's side even where the host answers with a promise: the VM parks.
    functions: {
      [HostFunction.query]: answer((bridge, ast: unknown) => bridge.query(ast)),
      [HostFunction.load]: answer((bridge, uri: unknown) => bridge.load(uri)),
      [HostFunction.write]: answer((bridge, records: unknown, durable: unknown) => bridge.write(records, durable)),
      [HostFunction.refresh]: answer((bridge, versions: unknown) => bridge.refresh(versions)),
      [HostFunction.print]: answer((bridge, values: unknown) => bridge.print(values)),
    },
    // A promise in the guest at once, so the program's own effects decide whether calls overlap.
    asyncFunctions: {
      [HostFunction.invoke]: answer((bridge, key: unknown, input: unknown) => bridge.invoke(key, input)),
      [HostFunction.tool]: answer((bridge, name: unknown, input: unknown) => bridge.tool(name, input)),
      [HostFunction.sleep]: (ms: unknown) =>
        new Promise<void>((resolve) => setTimeout(resolve, typeof ms === 'number' && ms > 0 ? ms : 0)),
    },
  };
};

/** Each registry's type snapshot and its hash, until the registry changes. */
const snapshots = new WeakMap<Registry.Registry, { readonly types: readonly TypeRecord[]; readonly key: string }>();

/**
 * Every registered object type as schema rather than as the class that cannot cross, cached per
 * registry: serializing every schema is the larger part of opening a session. A relation's kind and
 * endpoints do not survive the JSON-schema round trip, so relations stay on the host.
 */
const registrySnapshot = (db: Database.Database): { readonly types: readonly TypeRecord[]; readonly key: string } => {
  const cached = snapshots.get(db.registry);
  if (cached) {
    return cached;
  }
  const types = db.registry.list().flatMap((entity): TypeRecord[] => {
    if (!Type.isType(entity) || Type.isRelation(entity)) {
      return [];
    }
    const typename = Type.getTypename(entity);
    const version = Type.getVersion(entity);
    return typename === undefined || version === undefined
      ? []
      : [{ typename, version, jsonSchema: JsonSchema.toJsonSchema(entity) }];
  });
  const snapshot = { types, key: versionOf(types) };
  snapshots.set(db.registry, snapshot);
  const unsubscribe = db.registry.changed.on(() => {
    snapshots.delete(db.registry);
    unsubscribe();
  });
  return snapshot;
};
