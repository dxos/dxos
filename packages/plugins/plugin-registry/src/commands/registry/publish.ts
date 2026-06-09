//
// Copyright 2026 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as PlatformCommand from '@effect/platform/Command';
import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as FileSystem from '@effect/platform/FileSystem';
import * as HttpClient from '@effect/platform/HttpClient';
import * as HttpClientRequest from '@effect/platform/HttpClientRequest';
import * as Path from '@effect/platform/Path';
import * as Config from 'effect/Config';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { AUTH_OPTION_DESCRIPTIONS, NSID, createSession, putRecord, resolveCredentials } from './util';

const DEFAULT_REGISTRY_URL = 'https://edge.dxos.workers.dev';

type PluginConfig = {
  id: string;
  name: string;
  build?: { command?: string; outdir?: string };
  publish?: { registryUrl?: string; assetBaseUrl?: string };
};

/** Manifest emitted by the build (subset consumed here). */
const ManifestSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  version: Schema.String.pipe(Schema.nonEmptyString()),
  description: Schema.optional(Schema.String),
  homePage: Schema.optional(Schema.String),
  source: Schema.optional(Schema.String),
  icon: Schema.optional(Schema.String),
  iconHue: Schema.optional(Schema.String),
  tags: Schema.optional(Schema.Array(Schema.String)),
  screenshots: Schema.optional(Schema.Array(Schema.String)),
});
type Manifest = Schema.Schema.Type<typeof ManifestSchema>;

const PluginsDocSchema = Schema.Struct({
  package: Schema.optional(Schema.Struct({ plugins: Schema.optional(Schema.Array(Schema.Unknown)) })),
});

const UploadResponseSchema = Schema.Struct({ data: Schema.Struct({ moduleUrl: Schema.String }) });

const ensureTrailingSlash = (url: string): string => (url.endsWith('/') ? url : `${url}/`);

const sha256Base64 = async (bytes: Uint8Array): Promise<string> => {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes as unknown as BufferSource);
  return Buffer.from(new Uint8Array(digest)).toString('base64');
};

/**
 * `dx registry publish` — config-driven build + publish.
 *
 * Reads the plugin metadata from `dx.yml`, runs the declared build command,
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
      Options.withDescription('Project directory containing dx.yml. Defaults to the current directory.'),
      Options.withDefault('.'),
    ),
    module: Options.text('module').pipe(
      Options.withDescription('Plugin id to publish when dx.yml declares several. Defaults to the first.'),
      Options.optional,
    ),
    noBuild: Options.boolean('no-build').pipe(
      Options.withDescription('Skip running the build command (publish a pre-built dist).'),
    ),
    assetBaseUrl: Options.text('asset-base-url').pipe(
      Options.withDescription('Skip upload and point the release at an already-hosted bundle directory.'),
      Options.optional,
    ),
    registryUrl: Options.text('registry-url').pipe(
      Options.withDescription('Edge registry base URL for uploads.'),
      Options.optional,
    ),
  },
  (options) =>
    Function.pipe(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const dir = path.resolve(options.dir);

        // Load the target plugin entry from dx.yml.
        const dxYmlPath = path.join(dir, 'dx.yml');
        if (!(yield* fs.exists(dxYmlPath))) {
          return yield* Effect.fail(new Error(`No dx.yml found in ${dir}.`));
        }
        const { parse } = yield* Effect.promise(() => import('yaml'));
        const doc = yield* Schema.decodeUnknown(PluginsDocSchema)(parse(yield* fs.readFileString(dxYmlPath)));
        const plugins = (doc.package?.plugins ?? []) as PluginConfig[];
        const moduleId = Option.getOrUndefined(options.module);
        const plugin = moduleId ? plugins.find((entry) => entry.id === moduleId) : plugins[0];
        if (!plugin?.id) {
          return yield* Effect.fail(new Error(moduleId ? `No plugin '${moduleId}' in dx.yml.` : 'dx.yml declares no plugins.'));
        }

        // Build (unless skipped).
        const buildCommand = plugin.build?.command;
        if (!options.noBuild && buildCommand) {
          yield* Console.log(`Building: ${buildCommand}`);
          const exitCode = yield* PlatformCommand.make('sh', '-c', buildCommand).pipe(
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
        const outdir = path.join(dir, plugin.build?.outdir ?? 'dist');
        const manifestPath = path.join(outdir, 'manifest.json');
        if (!(yield* fs.exists(manifestPath))) {
          return yield* Effect.fail(new Error(`manifest.json not found in ${outdir}. Did the build run?`));
        }
        const manifestRaw = yield* fs.readFileString(manifestPath);
        const manifest: Manifest = yield* Schema.decodeUnknown(ManifestSchema)(JSON.parse(manifestRaw));
        const slug = manifest.id;
        const version = manifest.version;
        const manifestHash = `sha256-${yield* Effect.promise(() => sha256Base64(new TextEncoder().encode(manifestRaw)))}`;

        // Resolve hosting → moduleUrl.
        const registryUrl =
          Option.getOrUndefined(options.registryUrl) ?? plugin.publish?.registryUrl ?? DEFAULT_REGISTRY_URL;
        const assetBaseUrl = Option.getOrUndefined(options.assetBaseUrl) ?? plugin.publish?.assetBaseUrl;
        let moduleUrl: string;
        if (assetBaseUrl) {
          moduleUrl = new URL('manifest.json', ensureTrailingSlash(assetBaseUrl)).toString();
          yield* Console.log(`Self-hosted: ${moduleUrl}`);
        } else {
          moduleUrl = yield* uploadBundle({ registryUrl, slug, version, outdir });
          yield* Console.log(`Uploaded:  ${moduleUrl}`);
        }

        // Authenticate and write records.
        const { handle, appPassword } = yield* resolveCredentials({
          handle: Option.getOrUndefined(options.handle),
          appPassword: Option.getOrUndefined(options.appPassword),
        });
        const session = yield* createSession(handle, appPassword);
        const createdAt = new Date().toISOString();

        const profile: Record<string, unknown> = { slug, name: manifest.name, createdAt };
        if (manifest.description !== undefined) {
          profile.description = manifest.description;
        }
        if (manifest.homePage !== undefined) {
          profile.homepage = manifest.homePage;
        }
        if (manifest.source !== undefined) {
          profile.source = manifest.source;
        }
        if (manifest.icon !== undefined) {
          profile.icon = manifest.icon;
        }
        if (manifest.iconHue !== undefined) {
          profile.iconHue = manifest.iconHue;
        }
        if (manifest.tags && manifest.tags.length > 0) {
          profile.tags = manifest.tags;
        }
        if (manifest.screenshots && manifest.screenshots.length > 0) {
          profile.screenshots = manifest.screenshots;
        }

        const profileResult = yield* putRecord(session, NSID.PackageProfile, slug, profile);
        yield* Console.log(`Profile    ${profileResult.uri}`);

        const releaseResult = yield* putRecord(session, NSID.PackageRelease, `${slug}_${version}`, {
          package: slug,
          version,
          moduleUrl,
          manifestHash,
          createdAt,
        });
        yield* Console.log(`Release    ${releaseResult.uri}`);
      }),
      Effect.provide(FetchHttpClient.layer),
    ),
).pipe(Command.withDescription('Build, host, and publish the plugin in the current directory to the registry.'));

/**
 * Upload the build output to the edge registry. Auth uses a shared upload token
 * (`$REGISTRY_UPLOAD_TOKEN`); release integrity is anchored by the signed
 * record's `manifestHash`, not the transport. Returns the canonical `moduleUrl`
 * (the hosted `manifest.json`).
 */
const uploadBundle = ({
  registryUrl,
  slug,
  version,
  outdir,
}: {
  registryUrl: string;
  slug: string;
  version: string;
  outdir: string;
}) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const uploadToken = yield* Config.string('REGISTRY_UPLOAD_TOKEN');

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

    const client = yield* HttpClient.HttpClient;
    const response = yield* HttpClientRequest.post(`${ensureTrailingSlash(registryUrl)}registry/upload`).pipe(
      HttpClientRequest.setHeaders({ Authorization: `Bearer ${uploadToken}` }),
      HttpClientRequest.bodyJson({ slug, version, files }),
      Effect.flatMap((req) => client.execute(req)),
      Effect.flatMap((res) => res.json),
      Effect.flatMap(Schema.decodeUnknown(UploadResponseSchema)),
      Effect.scoped,
    );
    return response.data.moduleUrl;
  });
