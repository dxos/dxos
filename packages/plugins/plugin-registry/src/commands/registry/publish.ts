//
// Copyright 2026 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as PlatformCommand from '@effect/platform/Command';
import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as FileSystem from '@effect/platform/FileSystem';
import * as Path from '@effect/platform/Path';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { findDxConfigFile, loadDxConfig } from '@dxos/app-framework/vite-plugin';
import { Config2 } from '@dxos/protocols';
import { type Client, ClientService } from '@dxos/client';
import { Context } from '@dxos/context';
import { EdgeHttpClient } from '@dxos/edge-client';

import { AUTH_OPTION_DESCRIPTIONS, NSID, putRecord, resolveSession } from './util';

/** Manifest emitted by the build (subset consumed here). Extends `Config2.Plugin` with build-time fields. */
const ManifestSchema = Schema.Struct({
  ...Config2.Plugin.fields,
  version: Schema.String.pipe(Schema.nonEmptyString()),
  dependencies: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.String })),
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
 * at your own already-hosted directory), then writes the `package.profile` and
 * `package.release` records to the authenticated publisher's PDS. Release
 * integrity is anchored by `manifestHash` (sha256 of `manifest.json`) in the
 * signed release record.
 */
export const publish = Command.make(
  'publish',
  {
    handle: Options.text('handle').pipe(Options.withDescription(AUTH_OPTION_DESCRIPTIONS.handle), Options.optional),
    appPassword: Options.text('app-password').pipe(
      Options.withDescription(AUTH_OPTION_DESCRIPTIONS.appPassword),
      Options.optional,
    ),
    dir: Options.text('dir').pipe(
      Options.withDescription('Project directory containing dx.config.ts. Defaults to the current directory.'),
      Options.withDefault('.'),
    ),
    noBuild: Options.boolean('no-build').pipe(
      Options.withDescription('Skip running the build command (publish a pre-built dist).'),
    ),
    assetBaseUrl: Options.text('asset-base-url').pipe(
      Options.withDescription('Skip upload and point the release at an already-hosted bundle directory.'),
      Options.optional,
    ),
    edgeUrl: Options.text('edge-url').pipe(
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
          const exitCode = yield* PlatformCommand.make(
            'sh',
            '-c',
            `export PATH="${binDir}:$PATH"; ${buildCommand}`,
          ).pipe(
            PlatformCommand.workingDirectory(dir),
            PlatformCommand.stdout('inherit'),
            PlatformCommand.stderr('inherit'),
            PlatformCommand.exitCode,
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
        const manifest: Manifest = yield* Schema.decodeUnknown(ManifestSchema)(JSON.parse(manifestRaw));
        const key = manifest.key;
        const version = manifest.version;
        const manifestHash = `sha256-${yield* Effect.promise(() => sha256Base64(new TextEncoder().encode(manifestRaw)))}`;

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
          if (explicitEdgeUrl) {
            const http = new EdgeHttpClient(explicitEdgeUrl);
            moduleUrl = yield* uploadBundleDirect({ http, key, version, outdir });
          } else {
            const client = yield* ClientService;
            const hasIdentity = !!client.halo.identity.get();
            moduleUrl = yield* uploadBundle({ client, key, version, outdir, auth: hasIdentity });
          }
          yield* Console.log(`Uploaded:  ${moduleUrl}`);
        }

        // Authenticate and write records.
        const client = yield* ClientService;
        const session = yield* resolveSession({
          handle: Option.getOrUndefined(options.handle),
          appPassword: Option.getOrUndefined(options.appPassword),
          client,
        });
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

        const profileResult = yield* putRecord(session, NSID.PackageProfile, key, profile);
        yield* Console.log(`Profile    ${profileResult.uri}`);

        const releaseResult = yield* putRecord(session, NSID.PackageRelease, `${key}:${version}`, {
          package: key,
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

    const { moduleUrl } = yield* Effect.tryPromise(() =>
      http.uploadPluginBundle(Context.default(), { slug: key, version, files }, { auth: false }),
    );
    return moduleUrl;
  });
