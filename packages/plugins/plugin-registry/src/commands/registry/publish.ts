//
// Copyright 2026 DXOS.org
//

import * as Config from 'effect/Config';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as FileSystem from 'effect/FileSystem';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import * as Path from 'effect/Path';
import * as Schema from 'effect/Schema';
import * as Command from 'effect/unstable/cli/Command';
import * as Options from 'effect/unstable/cli/Flag';
import * as FetchHttpClient from 'effect/unstable/http/FetchHttpClient';
import * as PlatformCommand from 'effect/unstable/process/ChildProcess';
import * as ChildProcessSpawner from 'effect/unstable/process/ChildProcessSpawner';

import { findDxConfigFile, loadDxConfig } from '@dxos/app-framework/vite-plugin';
import { type Client, ClientService } from '@dxos/client';
import { Context } from '@dxos/context';
import { EdgeHttpClient } from '@dxos/edge-client';
import { Config2, EdgeCallFailedError } from '@dxos/protocols';

import { AUTH_OPTION_DESCRIPTIONS, NSID, putRecord, resolveSession } from './util.ts';

/** Manifest emitted by the build (subset consumed here). Extends `Config2.Plugin` with build-time fields. */
const ManifestSchema = Schema.Struct({
  ...Config2.Plugin.fields,
  version: Schema.String.pipe(Schema.check(Schema.isNonEmpty())),
  dependencies: Schema.optional(Schema.Record(Schema.String, Schema.String)),
});
type Manifest = Schema.Schema.Type<typeof ManifestSchema>;

const ensureTrailingSlash = (url: string): string => (url.endsWith('/') ? url : `${url}/`);

const sha256Base64 = async (bytes: Uint8Array): Promise<string> => {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes as BufferSource);
  return Buffer.from(new Uint8Array(digest)).toString('base64');
};

/**
 * `dx registry publish` — config-driven build + publish.
 *
 * Reads the build/publish orchestration from `dx.config.ts`, runs the declared build command,
 * reads the emitted `manifest.json`, hosts the bundle (default: upload the build
 * output to the DXOS edge registry; override with `publish.assetBaseUrl` to point
 * at your own already-hosted directory), then writes the `plugin.profile` and
 * `plugin.release` records to the authenticated publisher's PDS. Release
 * integrity is anchored by `manifestHash` (sha256 of `manifest.json`) in the
 * signed release record.
 */
export const publish = Command.make(
  'publish',
  {
    handle: Options.string('handle').pipe(Options.withDescription(AUTH_OPTION_DESCRIPTIONS.handle), Options.optional),
    appPassword: Options.string('app-password').pipe(
      Options.withDescription(AUTH_OPTION_DESCRIPTIONS.appPassword),
      Options.optional,
    ),
    dir: Options.string('dir').pipe(
      Options.withDescription('Project directory containing dx.config.ts. Defaults to the current directory.'),
      Options.withDefault('.'),
    ),
    noBuild: Options.boolean('no-build').pipe(
      Options.withDescription('Skip running the build command (publish a pre-built dist).'),
    ),
    assetBaseUrl: Options.string('asset-base-url').pipe(
      Options.withDescription('Skip upload and point the release at an already-hosted bundle directory.'),
      Options.optional,
    ),
    edgeUrl: Options.string('edge-url').pipe(
      Options.withDescription(
        'Edge base URL for bundle upload (e.g. http://localhost:8787). Bypasses profile config; auth is skipped (requires WORKER_ENV=dev on the server).',
      ),
      Options.optional,
    ),
  },
  (options) =>
    Function.pipe(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const dir = path.resolve(options.dir);

        // Load + validate the build/publish orchestration from dx.config.ts.
        const configFile = findDxConfigFile(dir);
        if (!configFile) {
          return yield* Effect.fail(new Error(`No dx.config.ts found in ${dir}.`));
        }
        const config = yield* Effect.tryPromise({
          try: () => loadDxConfig(configFile),
          catch: (error) => new Error(`Failed to load dx.config.ts in ${dir}: ${error}`),
        });

        // Build (unless skipped). Prepend the project's `node_modules/.bin` to PATH so
        // locally-installed tools (e.g. `vite`) resolve like they do in an npm script.
        const buildCommand = config.publish?.buildCommand;
        if (!options.noBuild && buildCommand) {
          yield* Console.log(`Building: ${buildCommand}`);
          const binDir = path.join(dir, 'node_modules', '.bin');
          // v4 folds the process options into `make` and runs a command through the spawner
          // service rather than through combinators on the command itself.
          const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
          const exitCode = yield* spawner.exitCode(
            PlatformCommand.make('sh', ['-c', `export PATH="${binDir}:$PATH"; ${buildCommand}`], {
              cwd: dir,
              stdout: 'inherit',
              stderr: 'inherit',
            }),
          );
          if (exitCode !== 0) {
            return yield* Effect.fail(new Error(`Build failed (exit ${exitCode}): ${buildCommand}`));
          }
        }

        // Read the emitted manifest.
        const outdir = path.join(dir, config.publish?.outputDirectory ?? 'dist');
        const manifestPath = path.join(outdir, 'manifest.json');
        if (!(yield* fs.exists(manifestPath))) {
          return yield* Effect.fail(new Error(`manifest.json not found in ${outdir}. Did the build run?`));
        }
        const manifestRaw = yield* fs.readFileString(manifestPath);
        const manifest: Manifest = yield* Schema.decodeUnknownEffect(ManifestSchema)(JSON.parse(manifestRaw));
        const key = manifest.key;
        const version = manifest.version;
        const manifestHash = `sha256-${yield* Effect.promise(() => sha256Base64(new TextEncoder().encode(manifestRaw)))}`;

        // Authenticate for the record writes BEFORE uploading: hosted bundles are immutable once
        // uploaded, so a publish whose PDS session cannot authenticate must fail before it burns
        // the version with an orphaned upload.
        const client = yield* ClientService;
        const session = yield* resolveSession({
          handle: Option.getOrUndefined(options.handle),
          appPassword: Option.getOrUndefined(options.appPassword),
          client,
        });

        // Resolve hosting → moduleUrl.
        const assetBaseUrl = Option.getOrUndefined(options.assetBaseUrl) ?? config.publish?.assetBaseUrl;
        let moduleUrl: string;
        if (assetBaseUrl) {
          moduleUrl = new URL('manifest.json', ensureTrailingSlash(assetBaseUrl)).toString();
          yield* Console.log(`Self-hosted: ${moduleUrl}`);
        } else {
          // Upload to the edge registry via the authenticated edge client (hub-identity VP).
          // When --edge-url is provided we bypass the profile's edge config and post directly
          // with auth: false — relies on WORKER_ENV=dev skipAuth on the server (local dev only).
          const explicitEdgeUrl = Option.getOrUndefined(options.edgeUrl);
          const apiKey = Option.getOrUndefined(yield* Config.option(Config.string('DX_HUB_API_KEY')));
          if (explicitEdgeUrl) {
            const http = new EdgeHttpClient(explicitEdgeUrl);
            moduleUrl = yield* uploadBundleDirect({ http, key, version, outdir });
          } else if (apiKey) {
            // Headless callers (CI) hold no HALO identity, so the VP flow cannot run; the admin
            // API key authenticates the upload instead.
            const http = new EdgeHttpClient(client.edge.http.baseUrl, { apiKey });
            moduleUrl = yield* uploadBundleDirect({ http, key, version, outdir });
          } else {
            const hasIdentity = !!client.halo.identity.get();
            moduleUrl = yield* uploadBundle({ client, key, version, outdir, auth: hasIdentity });
          }
          yield* Console.log(`Uploaded:  ${moduleUrl}`);
        }

        const createdAt = new Date().toISOString();

        const profile: Record<string, unknown> = { key, name: manifest.name, createdAt };
        if (manifest.description !== undefined) {
          profile.description = manifest.description;
        }
        if (manifest.homePage !== undefined) {
          profile.homePage = manifest.homePage;
        }
        if (manifest.source !== undefined) {
          profile.source = manifest.source;
        }
        if (manifest.icon !== undefined) {
          profile.icon = manifest.icon;
        }
        if (manifest.tags && manifest.tags.length > 0) {
          profile.tags = manifest.tags;
        }
        if (manifest.screenshots && manifest.screenshots.length > 0) {
          profile.screenshots = manifest.screenshots;
        }
        if (manifest.dependsOn?.length) {
          profile.dependsOn = manifest.dependsOn;
        }
        if (manifest.spec !== undefined) {
          profile.spec = manifest.spec;
        }

        const profileResult = yield* putRecord(session, NSID.PluginProfile, key, profile);
        yield* Console.log(`Profile    ${profileResult.uri}`);

        const releaseResult = yield* putRecord(session, NSID.PluginRelease, `${key}:${version}`, {
          pluginKey: key,
          version,
          moduleUrl,
          manifestHash,
          createdAt,
          ...(manifest.dependencies ? { dependencies: manifest.dependencies } : {}),
        });
        yield* Console.log(`Release    ${releaseResult.uri}`);
      }),
      Effect.provide(FetchHttpClient.layer),
    ),
).pipe(Command.withDescription('Build, host, and publish the plugin in the current directory to the registry.'));

/**
 * Upload the build output to the edge registry via the authenticated edge client.
 * The edge gates `/registry/upload` on the caller's hub identity (verifiable
 * presentation; bypassed for local dev). Release integrity is anchored by the
 * signed record's `manifestHash`, not the transport. Returns the canonical
 * `moduleUrl` (the hosted `manifest.json`), targeting the client's configured edge.
 */
const uploadBundle = ({
  client,
  key,
  version,
  outdir,
  auth = true,
}: {
  client: Client;
  key: string;
  version: string;
  outdir: string;
  auth?: boolean;
}) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;

    const entries = yield* fs.readDirectory(outdir, { recursive: true });
    const files: { path: string; content: string }[] = [];
    for (const entry of entries) {
      const full = path.join(outdir, entry);
      const info = yield* fs.stat(full);
      if (info.type !== 'File') {
        continue;
      }
      const bytes = yield* fs.readFile(full);
      files.push({ path: entry.split(path.sep).join('/'), content: Buffer.from(bytes).toString('base64') });
    }

    const { moduleUrl } = yield* Effect.tryPromise(() =>
      client.edge.http.uploadPluginBundle(Context.default(), { slug: key, version, files }, { auth }),
    );
    return moduleUrl;
  });

/**
 * Upload using a standalone EdgeHttpClient (no DXOS profile required).
 * Auth is skipped — the server must have WORKER_ENV=dev to accept unauthenticated uploads.
 */
const uploadBundleDirect = ({
  http,
  key,
  version,
  outdir,
}: {
  http: EdgeHttpClient;
  key: string;
  version: string;
  outdir: string;
}) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;

    const entries = yield* fs.readDirectory(outdir, { recursive: true });
    const files: { path: string; content: string }[] = [];
    for (const entry of entries) {
      const full = path.join(outdir, entry);
      const info = yield* fs.stat(full);
      if (info.type !== 'File') {
        continue;
      }
      const bytes = yield* fs.readFile(full);
      files.push({ path: entry.split(path.sep).join('/'), content: Buffer.from(bytes).toString('base64') });
    }

    const { moduleUrl } = yield* Effect.tryPromise({
      try: () => http.uploadPluginBundle(Context.default(), { slug: key, version, files }, { auth: false }),
      // Keep EdgeCallFailedError intact for the conflict recovery below; type everything else.
      catch: (error) => (error instanceof EdgeCallFailedError ? error : new Error(`Bundle upload failed: ${error}`)),
    }).pipe(
      // Hosted versions are immutable, so a re-run of an already-uploaded version answers 409 —
      // the existing bundle is the publish's outcome, keeping registry publishes re-runnable.
      Effect.catchIf(
        (error) => error instanceof EdgeCallFailedError && error.data?.type === 'conflict',
        () => {
          const existingUrl = new URL(`/registry/modules/${key}/${version}/manifest.json`, http.baseUrl).toString();
          return Console.log(`Version already in registry: ${existingUrl}`).pipe(Effect.as({ moduleUrl: existingUrl }));
        },
      ),
    );
    return moduleUrl;
  });
