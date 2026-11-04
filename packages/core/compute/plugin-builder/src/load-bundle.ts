//
// Copyright 2026 DXOS.org
//

import { Miniflare, Request, Response } from 'miniflare';

import { PluginLoader } from '@dxos/edge-compute/plugin-loader';
import { type EdgeFunctionEnv, type PluginProtocol } from '@dxos/protocols';

import * as PluginBundle from './PluginBundle.ts';

/** Why one module failed to import. */
export type ImportFailure = { readonly path: string; readonly message: string };

/** A plugin bundle loaded into workerd through Worker Loader, as EDGE loads it, driven from Node. */
export interface LoadedBundle extends AsyncDisposable {
  /** Bytes of the modules Worker Loader is given (scripts and wasm, after `vendor/` is pruned), which the isolate holds. */
  readonly moduleBytes: number;
  /** Activates the plugin with the vendored host and returns what it contributes. */
  describe(): Promise<PluginProtocol.Catalog>;
  /** Imports each path of the bundle once and reports the ones that throw. */
  importModules(paths: readonly string[]): Promise<readonly ImportFailure[]>;
  /** Runs an operation through the bundle's `PluginProtocol.Entrypoint`, with the data plane as its `DATA_SERVICE`. */
  invoke(request: PluginProtocol.InvokeRequest): Promise<PluginProtocol.InvokeResult>;
  /** The protocol version of the bundle's vendored host, as EDGE's router asks it. */
  protocolVersion(): Promise<number>;
}

/**
 * The part of EDGE's `DATA_SERVICE` a plugin's database reads and writes through, served from Node: what a bundle
 * needs to run a space-scoped operation without the db-service Durable Objects behind it.
 */
export interface DataPlane {
  getSpaceMeta(spaceId: string): Promise<EdgeFunctionEnv.SpaceMeta | undefined>;
  getDocuments(spaceId: string, documentIds: string[]): Promise<EdgeFunctionEnv.RawDocument[]>;
  createDocument(spaceId: string, initialValue?: Record<string, unknown>): Promise<{ documentId: string }>;
  changeDocument(spaceId: string, documentId: string, changes: Uint8Array): Promise<void>;
}

export type LoadOptions = {
  /** Serves the bundle's `DATA_SERVICE`; without it a space-scoped invocation is refused, as on a host with no data bindings. */
  readonly dataPlane?: DataPlane;
  /** Serves the bundle's `TYPE_REGISTRY`, standing in for EDGE's registry of published types. */
  readonly typeRegistry?: PluginProtocol.TypeRegistry;
  /** Serves `scope.operations`, standing in for EDGE's router to other plugins' operations. */
  readonly operations?: PluginProtocol.OperationHost;
};

/** The worker's name, which its own service bindings name to reach its entrypoints. */
const LOADER_HOST_NAME = 'plugin-loader-host';

/** The main module that imports bundle paths one by one, for checking a bundle without its host. */
const IMPORT_MAIN = `
export default {
  async fetch(request) {
    const failures = [];
    for (const path of await request.json()) {
      try {
        await import('./' + path);
      } catch (error) {
        failures.push({ path, message: String(error?.stack ?? error) });
      }
    }
    return Response.json(failures);
  },
};
`;

/**
 * A worker that loads the bundle it is bound to through Worker Loader and forwards each call to it.
 *
 * With a data plane its `DataService` entrypoint is the bundle's `DATA_SERVICE`, relaying each call to Node as JSON with
 * bytes in base64; it answers every query with no rows, since the data plane keeps no index.
 */
const LOADER_HOST = `
import { RpcTarget, WorkerEntrypoint } from 'cloudflare:workers';

const decode = (base64) => Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
const encode = (bytes) => btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''));

const toWire = (value) => JSON.stringify(value, (_key, entry) => (entry instanceof Uint8Array ? { $bytes: encode(entry) } : entry));
const fromWire = (text) => JSON.parse(text, (_key, entry) => (entry && typeof entry.$bytes === 'string' ? decode(entry.$bytes) : entry));

const relay = async (env, method, args) => {
  const response = await env.DATA_PLANE.fetch('http://data-plane/', { method: 'POST', body: toWire({ method, args }) });
  const body = fromWire(await response.text());
  if (!response.ok) {
    throw new Error(body.error);
  }
  return body.result;
};

export class DataService extends WorkerEntrypoint {
  getSpaceMeta(_ctx, spaceId) { return relay(this.env, 'getSpaceMeta', [spaceId]); }
  getDocuments(_ctx, spaceId, documentIds) { return relay(this.env, 'getDocuments', [spaceId, documentIds]); }
  createDocument(_ctx, spaceId, initialValue) { return relay(this.env, 'createDocument', [spaceId, initialValue]); }
  changeDocument(_ctx, spaceId, documentId, changes) { return relay(this.env, 'changeDocument', [spaceId, documentId, changes]); }
  execQuery(_ctx, _request) { return { results: [], objects: [] }; }
}

export class TypeRegistry extends WorkerEntrypoint {
  async resolveType(typename, version) {
    const response = await this.env.TYPE_PLANE.fetch('http://type-plane/', { method: 'POST', body: JSON.stringify({ typename, version }) });
    const body = await response.json();
    if (!response.ok) {
      throw new Error(body.error);
    }
    return body.result ?? undefined;
  }
}

class Operations extends RpcTarget {
  constructor(env) { super(); this.env = env; }
  async invoke(operationKey, input, options) {
    const response = await this.env.OPERATION_PLANE.fetch('http://operation-plane/', { method: 'POST', body: JSON.stringify({ operationKey, input, options }) });
    const body = await response.json();
    if (!response.ok) {
      throw new Error(body.error);
    }
    return body.result;
  }
}

export class Unavailable extends WorkerEntrypoint {
  fetch() { throw new Error('Not served by the plugin loader host.'); }
}

const bindings = (env) => ({
  ...(env.DATA_SERVICE === undefined
    ? {}
    : { DATA_SERVICE: env.DATA_SERVICE, QUEUE_SERVICE: env.QUEUE_SERVICE, FUNCTIONS_AI_SERVICE: env.FUNCTIONS_AI_SERVICE }),
  ...(env.TYPE_REGISTRY === undefined ? {} : { TYPE_REGISTRY: env.TYPE_REGISTRY }),
});

const load = (env, id, mainModule, main) =>
  env.LOADER.get(id, () => {
    const modules = { [mainModule]: { js: main } };
    for (const [path, content] of Object.entries(env.FILES)) {
      if (/\\.(js|mjs)$/.test(path)) {
        modules[path] = { js: new TextDecoder().decode(decode(content)) };
      } else if (path.endsWith('.wasm')) {
        modules[path] = { wasm: decode(content).buffer };
      }
    }
    return {
      compatibilityDate: env.COMPATIBILITY_DATE,
      compatibilityFlags: env.COMPATIBILITY_FLAGS,
      mainModule,
      modules,
      env: bindings(env),
      globalOutbound: null,
    };
  });

export default {
  async fetch(request, env) {
    const { method, paths, invocation } = await request.json();
    try {
      if (method === 'invoke') {
        const scope = env.OPERATION_PLANE === undefined ? undefined : { operations: new Operations(env) };
        const result = await load(env, 'host', env.MAIN_MODULE, env.HOST_MAIN).getEntrypoint().invoke(invocation, scope);
        return Response.json({ result });
      }
      if (method === 'version') {
        const result = await load(env, 'host', env.MAIN_MODULE, env.HOST_MAIN).getEntrypoint().protocolVersion();
        return Response.json({ result });
      }
      if (method === 'import') {
        return load(env, 'import', '__import__.js', env.IMPORT_MAIN).getEntrypoint().fetch('http://bundle/', {
          method: 'POST',
          body: JSON.stringify(paths),
        });
      }
      const result = await load(env, 'host', env.MAIN_MODULE, env.HOST_MAIN).getEntrypoint().describe();
      return Response.json({ result });
    } catch (error) {
      return Response.json({ error: String(error?.stack ?? error) }, { status: 500 });
    }
  },
};
`;

/**
 * Loads a plugin bundle through Worker Loader in a local workerd, exactly as EDGE's loader does: bare imports rewritten
 * to `vendor/` and a main module that starts the vendored host. The plugin runs alone, as on EDGE.
 */
export const loadBundle = async (
  files: PluginBundle.Files,
  { dataPlane, typeRegistry, operations }: LoadOptions = {},
): Promise<LoadedBundle> => {
  const { problems, vendor } = PluginBundle.check(files);
  if (!vendor) {
    throw new Error(
      `The bundle has no ${PluginBundle.VENDOR_MANIFEST_FILE}: ${problems.map(({ message }) => message).join('; ')}`,
    );
  }
  const workerCode = await PluginLoader.workerCode(files);
  const { files: modules, mainModule, main } = workerCode;
  const moduleBytes = Object.values(PluginLoader.toLoaderModules(workerCode)).reduce(
    (total, module) =>
      total + ('js' in module ? new TextEncoder().encode(module.js).byteLength : module.wasm.byteLength),
    0,
  );
  const miniflare = new Miniflare({
    name: LOADER_HOST_NAME,
    modules: true,
    script: LOADER_HOST,
    compatibilityDate: PluginLoader.COMPATIBILITY_DATE,
    compatibilityFlags: [...PluginLoader.COMPATIBILITY_FLAGS],
    workerLoaders: { LOADER: {} },
    serviceBindings: {
      ...(dataPlane
        ? {
            DATA_PLANE: (request: Request) => serveDataPlane(dataPlane, request),
            DATA_SERVICE: { name: LOADER_HOST_NAME, entrypoint: 'DataService' },
            QUEUE_SERVICE: { name: LOADER_HOST_NAME, entrypoint: 'Unavailable' },
            FUNCTIONS_AI_SERVICE: { name: LOADER_HOST_NAME, entrypoint: 'Unavailable' },
          }
        : {}),
      ...(typeRegistry
        ? {
            TYPE_PLANE: (request: Request) => serveTypeRegistry(typeRegistry, request),
            TYPE_REGISTRY: { name: LOADER_HOST_NAME, entrypoint: 'TypeRegistry' },
          }
        : {}),
      ...(operations ? { OPERATION_PLANE: (request: Request) => serveOperations(operations, request) } : {}),
    },
    bindings: {
      COMPATIBILITY_DATE: PluginLoader.COMPATIBILITY_DATE,
      COMPATIBILITY_FLAGS: [...PluginLoader.COMPATIBILITY_FLAGS],
      MAIN_MODULE: mainModule,
      HOST_MAIN: main,
      IMPORT_MAIN,
      FILES: Object.fromEntries(
        Object.entries(modules).map(([path, content]) => [path, Buffer.from(content).toString('base64')]),
      ),
    },
  });

  const call = async (
    method: 'describe' | 'import' | 'invoke' | 'version',
    { paths, invocation }: { paths?: readonly string[]; invocation?: PluginProtocol.InvokeRequest } = {},
  ): Promise<string> => {
    const response = await miniflare.dispatchFetch('http://bundle.local/', {
      method: 'POST',
      body: JSON.stringify({ method, paths, invocation }),
    });
    const body = await response.text();
    if (!response.ok) {
      throw new Error(`workerd answered ${response.status}: ${body}`);
    }
    return body;
  };

  return {
    moduleBytes,
    describe: async () => {
      const { result }: { result: PluginProtocol.Catalog } = JSON.parse(await call('describe'));
      return result;
    },
    importModules: async (paths) => {
      const failures: ImportFailure[] = JSON.parse(await call('import', { paths }));
      return failures;
    },
    invoke: async (invocation) => {
      const { result }: { result: PluginProtocol.InvokeResult } = JSON.parse(await call('invoke', { invocation }));
      return result;
    },
    protocolVersion: async () => {
      const { result }: { result: number } = JSON.parse(await call('version'));
      return result;
    },
    [Symbol.asyncDispose]: () => miniflare.dispose(),
  };
};

const BYTES_KEY = '$bytes';

const toWire = (value: unknown): string =>
  JSON.stringify(value, (_key, entry) =>
    entry instanceof Uint8Array ? { [BYTES_KEY]: Buffer.from(entry).toString('base64') } : entry,
  );

const fromWire = (text: string): unknown =>
  JSON.parse(text, (_key, entry) =>
    entry !== null && typeof entry === 'object' && typeof entry[BYTES_KEY] === 'string'
      ? new Uint8Array(Buffer.from(entry[BYTES_KEY], 'base64'))
      : entry,
  );

const isString = (value: unknown): value is string => typeof value === 'string';
const isStrings = (value: unknown): value is string[] => Array.isArray(value) && value.every(isString);
const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/** Answers one relayed `DATA_SERVICE` call; the arguments are checked, since they cross a JSON boundary. */
/** Answers the loader host's `TypeRegistry` entrypoint from Node; an unknown type is `null` on the wire. */
const serveTypeRegistry = async (registry: PluginProtocol.TypeRegistry, request: Request): Promise<Response> => {
  try {
    const body: unknown = JSON.parse(await request.text());
    const typename = isRecord(body) ? body.typename : undefined;
    const version = isRecord(body) ? body.version : undefined;
    if (!isString(typename) || !(version === undefined || version === null || isString(version))) {
      throw new Error('Invalid type registry call.');
    }
    const result = await registry.resolveType(typename, version ?? undefined);
    return Response.json({ result: result ?? null });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
};

/** Answers a bundle's call to another plugin's operation from Node, as EDGE's router answers it. */
const serveOperations = async (operations: PluginProtocol.OperationHost, request: Request): Promise<Response> => {
  try {
    const body: unknown = JSON.parse(await request.text());
    const operationKey = isRecord(body) ? body.operationKey : undefined;
    const options = isRecord(body) && isRecord(body.options) ? body.options : {};
    if (!isRecord(body) || !isString(operationKey)) {
      throw new Error('Invalid operation call.');
    }
    const result = await operations.invoke(operationKey, body.input, {
      ...(isString(options.spaceId) ? { spaceId: options.spaceId } : {}),
      ...(isString(options.conversation) ? { conversation: options.conversation } : {}),
      ...(isString(options.parentPid) ? { parentPid: options.parentPid } : {}),
    });
    return Response.json({ result });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
};

const serveDataPlane = async (dataPlane: DataPlane, request: Request): Promise<Response> => {
  try {
    const body = fromWire(await request.text());
    const method = isRecord(body) ? body.method : undefined;
    const args = isRecord(body) && Array.isArray(body.args) ? body.args : [];
    const [spaceId, second, third] = args;
    if (!isString(spaceId)) {
      throw new Error(`Invalid data plane call: ${String(method)}`);
    }
    const result = await (async (): Promise<unknown> => {
      switch (method) {
        case 'getSpaceMeta':
          return dataPlane.getSpaceMeta(spaceId);
        case 'getDocuments':
          if (isStrings(second)) {
            return dataPlane.getDocuments(spaceId, second);
          }
          break;
        case 'createDocument':
          if (second === undefined || second === null || isRecord(second)) {
            return dataPlane.createDocument(spaceId, second ?? undefined);
          }
          break;
        case 'changeDocument':
          if (isString(second) && third instanceof Uint8Array) {
            return dataPlane.changeDocument(spaceId, second, third);
          }
          break;
      }
      throw new Error(`Invalid data plane call: ${String(method)}`);
    })();
    return new Response(toWire({ result }));
  } catch (error) {
    return new Response(toWire({ error: String(error instanceof Error ? (error.stack ?? error) : error) }), {
      status: 500,
    });
  }
};
