//
// Copyright 2026 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';

import { ClientService } from '@dxos/client';

import { AUTH_OPTION_DESCRIPTIONS, NSID, putRecord, resolveSession } from './util';

/**
 * `dx registry publish-package` — publishes both the mutable
 * `package.profile` (rkey = slug) and a `package.release`
 * (rkey = `<slug>:<version>`) record to the authenticated user's PDS.
 *
 * The two writes are independent `putRecord` (upsert) calls; if the second fails the
 * first is left in place (the indexer treats a profile with no releases as
 * present-but-unpublishable, so a half-success is benign). Releases are conceptually
 * single-write per version but not enforced — see docs/registry-spec.md (Integrity).
 */
export const publishPackage = Command.make(
  'publish-package',
  {
    handle: Options.text('handle').pipe(
      Options.withDescription(AUTH_OPTION_DESCRIPTIONS.handle),
      Options.optional,
    ),
    appPassword: Options.text('app-password').pipe(
      Options.withDescription(AUTH_OPTION_DESCRIPTIONS.appPassword),
      Options.optional,
    ),
    slug: Options.text('slug').pipe(
      Options.withDescription('Package slug — also the rkey of the profile record. Lower-case, [a-z0-9-], ≤63 chars.'),
    ),
    name: Options.text('name').pipe(Options.withDescription('Human-readable package name.')),
    description: Options.text('description').pipe(
      Options.withDescription('Short description shown in the registry.'),
      Options.withDefault(''),
    ),
    version: Options.text('version').pipe(
      Options.withDescription('Semver version (no build metadata). The release rkey is `<slug>:<version>`.'),
    ),
    moduleUrl: Options.text('module-url').pipe(
      Options.withDescription('HTTPS URL to the bundle or manifest for this release.'),
    ),
    homepage: Options.text('homepage').pipe(Options.withDescription('Homepage URL.'), Options.optional),
    source: Options.text('source').pipe(Options.withDescription('Source repository URL.'), Options.optional),
    tag: Options.text('tag').pipe(
      Options.withDescription('Tag (repeatable). Categorizes the package for discovery.'),
      Options.repeated,
    ),
    iconHue: Options.text('icon-hue').pipe(Options.withDescription('Display hue (string).'), Options.optional),
    manifestHash: Options.text('manifest-hash').pipe(
      Options.withDescription('Optional content hash for the bundle/manifest.'),
      Options.optional,
    ),
  },
  (options) =>
    Function.pipe(
      Effect.gen(function* () {
        const client = yield* ClientService;
        const session = yield* resolveSession({
          handle: Option.getOrUndefined(options.handle),
          appPassword: Option.getOrUndefined(options.appPassword),
          client,
        });
        const createdAt = new Date().toISOString();

        const profile: Record<string, unknown> = {
          slug: options.slug,
          name: options.name,
          description: options.description,
          createdAt,
        };
        const homepage = Option.getOrUndefined(options.homepage);
        if (homepage !== undefined) {
          profile.homepage = homepage;
        }
        const source = Option.getOrUndefined(options.source);
        if (source !== undefined) {
          profile.source = source;
        }
        if (options.tag.length > 0) {
          profile.tags = options.tag;
        }
        const iconHue = Option.getOrUndefined(options.iconHue);
        if (iconHue !== undefined) {
          profile.iconHue = iconHue;
        }

        const profileResult = yield* putRecord(session, NSID.PackageProfile, options.slug, profile);
        yield* Console.log(`Profile  ${profileResult.uri}`);

        const release: Record<string, unknown> = {
          package: options.slug,
          version: options.version,
          moduleUrl: options.moduleUrl,
          createdAt,
        };
        const manifestHash = Option.getOrUndefined(options.manifestHash);
        if (manifestHash !== undefined) {
          release.manifestHash = manifestHash;
        }

        const releaseResult = yield* putRecord(
          session,
          NSID.PackageRelease,
          `${options.slug}:${options.version}`,
          release,
        );
        yield* Console.log(`Release  ${releaseResult.uri}`);
      }),
      Effect.provide(FetchHttpClient.layer),
    ),
).pipe(Command.withDescription("Publish a package profile + release to the authenticated user's PDS."));
