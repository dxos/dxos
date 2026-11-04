//
// Copyright 2026 DXOS.org
//

import * as Command from 'effect/cli/Command';
import * as Options from 'effect/cli/Flag';
import * as Config from 'effect/Config';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as FileSystem from 'effect/FileSystem';
import * as Function from 'effect/Function';
import * as FetchHttpClient from 'effect/http/FetchHttpClient';
import * as Option from 'effect/Option';
import * as Path from 'effect/Path';
import * as PlatformCommand from 'effect/process/ChildProcess';
import * as ChildProcessSpawner from 'effect/process/ChildProcessSpawner';
import * as Schema from 'effect/Schema';

import { ClientFree } from '@dxos/cli-util';
import { type Client, initializedClient } from '@dxos/client';
import { createEdgeIdentity } from '@dxos/client/edge';
import { Context } from '@dxos/context';
import { EdgeHttpClient } from '@dxos/edge-client';
import { Config2, EdgeCallFailedError } from '@dxos/protocols';

import * as BundleDescriber from '../../BundleDescriber.ts';
import { RegistryCommandError } from './errors.ts';
import { PublishError } from './errors.ts';
import { AUTH_OPTION_DESCRIPTIONS, NSID, putRecord, resolveSession } from './util.ts';

/** Manifest emitted by the build (subset consumed here). Extends `Config2.Plugin` with build-time fields. */
const ManifestSchema = Schema.Struct({
  ...Config2.Plugin.fields,
  version: Schema.String.pipe(Schema.check(Schema.isNonEmpty())),
  dependencies: Schema.optional(Schema.Record(Schema.String, Schema.String)),
});
type Manifest = Schema.Schema.Type<typeof ManifestSchema>;

/** The profile's own client unless `baseUrl` overrides its EDGE, which then needs the identity set on a client of its own. */
const identityHttpClient = (client: Client, baseUrl: string): EdgeHttpClient => {
  if (baseUrl === client.edge.http.baseUrl) {
    return client.edge.http;
  }
  const http = new EdgeHttpClient(baseUrl);
  http.setIdentity(createEdgeIdentity(client));
  return http;
};

const ensureTrailingSlash = (url: string): string => (url.endsWith('/') ? url : `${url}/`);

const sha256Base64 = async (bytes: Uint8Array): Promise<string> => {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes as BufferSource);
  return Buffer.from(new Uint8Array(digest)).toString('base64');
};

/**
 * `dx registry publish` — config-driven build + publish.
 *
 * Reads the build/publish orchestration from `dx.config.ts`, runs the declared build command,
 * reads the emitted `manifest.json`, runs the bundle's `describe()` on a local workerd as EDGE would (failing the
 * publish when a module does not activate there), hosts the bundle (default: upload the build
 * output to the DXOS edge registry; override with `publish.assetBaseUrl` to point
 * at your own already-hosted directory), then writes the `plugin.profile` and
 * `plugin.release` records to the authenticated publisher's PDS. Release
 * integrity is anchored by `manifestHash` (sha256 of `manifest.json`) in the
 * signed release record.
 */
export const publish = Command.make(
  'publish',
  {
    handle: Options.String('handle').pipe(Options.withDescription(AUTH_OPTION_DESCRIPTIONS.handle), Options.optional),
    appPassword: Options.String('app-password').pipe(
      Options.withDescription(AUTH_OPTION_DESCRIPTIONS.appPassword),
      Options.optional,
    ),
    dir: Options.String('dir').pipe(
      Options.withDescription('Project directory containing dx.config.ts. Defaults to the current directory.'),
      Options.withDefault('.'),
    ),
    noBuild: Options.Boolean('no-build').pipe(
      Options.withDefault(false),
      Options.withDescription('Skip running the build command (publish a pre-built dist).'),
    ),
    assetBaseUrl: Options.String('asset-base-url').pipe(
      Options.withDescription('Skip upload and point the release at an already-hosted bundle directory.'),
      Options.optional,
    ),
    private: Options.Boolean('private').pipe(
      Options.withDefault(false),
      Options.withDescription(
        'Publish privately: upload the bundle and list it only to you, writing no AT Protocol records. ' +
          'Authenticates as the logged-in identity, or with the API token in $DX_API_TOKEN.',
      ),
    ),
    channel: Options.String('channel').pipe(
      Options.withDescription(
        'A channel EDGE moves to this version, like an npm dist-tag. `latest` moves on every version that is not a prerelease.',
      ),
      Options.optional,
    ),
    uploadOnly: Options.Boolean('upload-only').pipe(
      Options.withDefault(false),
      Options.withDescription(
        'Upload the bundle and write no AT Protocol records: EDGE runs it, the registry does not list it to browsers.',
      ),
    ),
    edgeUrl: Options.String('edge-url').pipe(
      Options.withDescription(
        'Edge base URL for bundle upload (e.g. http://localhost:8787). Bypasses profile config; a public upload then skips auth (requires WORKER_ENV=dev on the server), a --private one never does.',
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

        // Load + validate the build/publish orchestration from dx.config.ts, through the subpath that carries no
        // Vite or Babel, which the compiled `dx` cannot bundle.
        const { findDxConfigFile, loadDxConfig } = yield* Effect.promise(
          () => import('@dxos/app-framework/vite-plugin/config'),
        );
        const configFile = findDxConfigFile(dir);
        if (!configFile) {
          return yield* Effect.fail(new PublishError({ message: 'No dx.config.ts found.', context: { dir } }));
        }
        const config = yield* Effect.tryPromise({
          try: () => loadDxConfig(configFile),
          catch: (error) =>
            new PublishError({ message: 'Failed to load dx.config.ts.', context: { dir }, cause: error }),
        });

        const describer = yield* Effect.serviceOption(BundleDescriber.Service);
        if (Option.isNone(describer)) {
          return yield* Effect.fail(
            new PublishError({ message: 'This host cannot run describe() on the bundle, which every publish needs.' }),
          );
        }

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
              env: { ...(yield* describer.value.buildEnv) },
              extendEnv: true,
              stdout: 'inherit',
              stderr: 'inherit',
            }),
          );
          if (exitCode !== 0) {
            return yield* Effect.fail(
              new RegistryCommandError({ message: `Build failed (exit ${exitCode}): ${buildCommand}` }),
            );
          }
        }

        // Read the emitted manifest.
        const outdir = path.join(dir, config.publish?.outputDirectory ?? 'dist');
        const manifestPath = path.join(outdir, 'manifest.json');
        if (!(yield* fs.exists(manifestPath))) {
          return yield* Effect.fail(
            new RegistryCommandError({ message: `manifest.json not found in ${outdir}. Did the build run?` }),
          );
        }
        const manifestRaw = yield* fs.readFileString(manifestPath);
        const manifest: Manifest = yield* Schema.decodeUnknownEffect(ManifestSchema)(JSON.parse(manifestRaw));
        const key = manifest.key;
        const version = manifest.version;
        const manifestHash = `sha256-${yield* Effect.promise(() => sha256Base64(new TextEncoder().encode(manifestRaw)))}`;

        // Before anything is uploaded: a hosted version is immutable, so a bundle EDGE cannot run must not burn it.
        yield* Console.log(`Describing ${outdir}`);
        yield* Console.log(`Described: ${yield* describer.value.describe(outdir)}`);

        if (options.private) {
          const client = yield* initializedClient;
          const token = Option.getOrUndefined(yield* Config.option(Config.String('DX_API_TOKEN')));
          const baseUrl = Option.getOrUndefined(options.edgeUrl) ?? client.edge.http.baseUrl;
          if (!token && !client.halo.identity.get()) {
            return yield* Effect.fail(
              new RegistryCommandError({
                message: 'A private plugin is owned by an identity: run `dx account login`, or set DX_API_TOKEN.',
              }),
            );
          }
          // An API token authenticates as the account that minted it, which is how a sandbox with no
          // identity of its own publishes for its user.
          const http = token ? new EdgeHttpClient(baseUrl, { apiKey: token }) : identityHttpClient(client, baseUrl);
          // The private route takes the bundle as JSON, each file base64-encoded.
          const files = (yield* readBundleFiles(outdir)).map(({ path, content }) => ({
            path,
            content: Buffer.from(content).toString('base64'),
          }));
          const { moduleUrl } = yield* Effect.tryPromise({
            try: () => http.uploadPrivatePluginBundle(Context.default(), { slug: key, version, files }),
            catch: (error) => new PublishError({ message: 'Private bundle upload failed.', cause: error }),
          });
          yield* Console.log(`Uploaded:  ${moduleUrl}`);
          yield* Console.log(
            'Private:   listed in the registry only to the publishing identity; no AT Protocol records.',
          );
          return;
        }

        const channel = Option.getOrUndefined(options.channel);
        if (options.uploadOnly) {
          const moduleUrl = yield* uploadToEdge({
            edgeUrl: Option.getOrUndefined(options.edgeUrl),
            key,
            version,
            outdir,
            channel,
          });
          yield* Console.log(`Uploaded:  ${moduleUrl}`);
          return;
        }

        // Authenticate for the record writes BEFORE uploading: hosted bundles are immutable once
        // uploaded, so a publish whose PDS session cannot authenticate must fail before it burns
        // the version with an orphaned upload.
        const client = yield* initializedClient;
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
          moduleUrl = yield* uploadToEdge({
            edgeUrl: Option.getOrUndefined(options.edgeUrl),
            key,
            version,
            outdir,
            channel,
          });
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
).pipe(
  Command.withDescription('Build, host, and publish the plugin in the current directory to the registry.'),
  // `--upload-only --edge-url` needs no client, so the client is waited for only on the paths that use it.
  Command.annotate(ClientFree, true),
);

/** Every file under the build output, with a `/`-separated relative path. */
const readBundleFiles = (outdir: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;

    const entries = yield* fs.readDirectory(outdir, { recursive: true });
    const files: { path: string; content: Uint8Array<ArrayBuffer> }[] = [];
    for (const entry of entries) {
      const full = path.join(outdir, entry);
      const info = yield* fs.stat(full);
      if (info.type !== 'File') {
        continue;
      }
      // Copied so the bytes own a plain `ArrayBuffer`, which is what a multipart `Blob` part takes.
      const content = new Uint8Array(yield* fs.readFile(full));
      files.push({ path: entry.split(path.sep).join('/'), content });
    }
    return files;
  });

/**
 * Uploads to the edge registry: to `edgeUrl` without auth when given (local dev), with the admin API key in
 * `DX_HUB_API_KEY` for headless callers (CI) that hold no HALO identity, otherwise as the profile's identity.
 * The client is resolved only after the `edgeUrl` branch, which must work on a host whose client cannot initialize.
 */
const uploadToEdge = ({
  edgeUrl,
  key,
  version,
  outdir,
  channel,
}: {
  edgeUrl: string | undefined;
  key: string;
  version: string;
  outdir: string;
  channel: string | undefined;
}) =>
  Effect.gen(function* () {
    if (edgeUrl) {
      return yield* uploadBundleDirect({ http: new EdgeHttpClient(edgeUrl), key, version, outdir, channel });
    }
    const client = yield* initializedClient;
    const apiKey = Option.getOrUndefined(yield* Config.option(Config.String('DX_HUB_API_KEY')));
    if (apiKey) {
      const http = new EdgeHttpClient(client.edge.http.baseUrl, { apiKey });
      return yield* uploadBundleDirect({ http, key, version, outdir, channel });
    }
    return yield* uploadBundle({ client, key, version, outdir, channel, auth: !!client.halo.identity.get() });
  });

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
  channel,
  auth = true,
}: {
  client: Client;
  key: string;
  version: string;
  outdir: string;
  channel?: string;
  auth?: boolean;
}) =>
  Effect.gen(function* () {
    const files = yield* readBundleFiles(outdir);

    const { moduleUrl } = yield* Effect.tryPromise(() =>
      client.edge.http.uploadPluginBundle(Context.default(), { slug: key, version, files, channel }, { auth }),
    );
    return moduleUrl;
  });

/**
 * Upload using a standalone EdgeHttpClient (no DXOS profile required).
 * No identity is presented: the client's API key authenticates, or the server must have WORKER_ENV=dev to accept
 * unauthenticated uploads.
 */
const uploadBundleDirect = ({
  http,
  key,
  version,
  outdir,
  channel,
}: {
  http: EdgeHttpClient;
  key: string;
  version: string;
  outdir: string;
  channel?: string;
}) =>
  Effect.gen(function* () {
    const files = yield* readBundleFiles(outdir);

    const { moduleUrl } = yield* Effect.tryPromise({
      try: () => http.uploadPluginBundle(Context.default(), { slug: key, version, files, channel }, { auth: false }),
      // Keep EdgeCallFailedError intact for the conflict recovery below; type everything else.
      catch: (error) =>
        error instanceof EdgeCallFailedError
          ? error
          : new PublishError({ message: 'Bundle upload failed.', cause: error }),
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
