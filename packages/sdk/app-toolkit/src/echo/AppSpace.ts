//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { type CapabilityManager } from '@dxos/app-framework';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { Annotation, Obj } from '@dxos/echo';
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';
import { MembershipPolicy } from '@dxos/protocols/proto/dxos/halo/credentials';

import { GraphPath } from '../app';
import { AppCapabilities } from '../app-framework';
import * as AppAnnotation from './AppAnnotation';

//
// Space tags.
//

/**
 * Space tag for the settings space: a hidden, membership-locked space holding app configuration
 * that must replicate across the user's devices but never be shared with anyone else.
 */
export const SETTINGS_SPACE_TAG = 'org.dxos.space.settings';

/**
 * Space tag for the personal space.
 * @deprecated The default space is now an ordinary space designated by the
 * {@link AppAnnotation.DefaultSpaceAnnotation} setting on the settings space. This tag survives
 * only to resolve profiles created before the settings space existed.
 */
export const PERSONAL_SPACE_TAG = 'org.dxos.space.personal';

/** Space tag for the bundled exemplar/sample space. */
export const EXEMPLAR_SPACE_TAG = 'org.dxos.space.exemplar';

/** Name given to the first space created for a profile. The user is free to rename it. */
export const DEFAULT_SPACE_NAME = 'Personal';

/** Name given to the settings space. Hidden from the UI, but shows in devtools. */
export const SETTINGS_SPACE_NAME = 'Settings';

/** Resolves spaces by id or in bulk; structural so callers can pass a `Client` or a stub. */
type SpaceResolver = { spaces: { get(): Space[]; get(id: string): Space | undefined } };

/**
 * The slice of a space the tag predicates read. `properties` is `unknown` because they only probe
 * it for a legacy marker behind a guard — a closed space throws on access.
 */
type TaggedSpace = Pick<Space, 'tags'> & { properties?: unknown };

/** Check if a space has a specific tag. */
export const hasTag = (space: Pick<Space, 'tags'>, tag: string): boolean => space.tags.includes(tag);

/** Check if a space is the exemplar/sample space. */
export const isExemplarSpace = (space: Pick<Space, 'tags'>): boolean => hasTag(space, EXEMPLAR_SPACE_TAG);

/** Check if a space is the settings space. */
export const isSettingsSpace = (space: Pick<Space, 'tags'>): boolean => hasTag(space, SETTINGS_SPACE_TAG);

/** Find the settings space. */
export const getSettingsSpace = (client: { spaces: { get(): Space[] } }): Space | undefined =>
  client.spaces.get().find((space) => isSettingsSpace(space));

/**
 * Whether a space belongs in the user-facing space lists (navtree, settings, create-object target).
 *
 * Tags mark spaces the app manages on the user's behalf — the settings space, filesystem mirrors —
 * so anything tagged is internal, except the exemplar space and the legacy personal-space tag that
 * pre-migration profiles still carry.
 */
export const isVisibleSpace = (space: TaggedSpace): boolean =>
  space.tags.length === 0 || isExemplarSpace(space) || isLegacyDefaultSpace(space);

//
// Default space designation.
//

/**
 * Read the designated default space id from the settings space.
 * The settings space must be open; callers resolve it via {@link getSettingsSpace} after
 * `SpacesReady`, at which point its properties are readable.
 */
export const readDefaultSpaceId = (settingsSpace: Pick<Space, 'properties'>): string | undefined =>
  Annotation.get(settingsSpace.properties, AppAnnotation.DefaultSpaceAnnotation).pipe(Option.getOrUndefined);

/** Designate `spaceId` as the default space. Pairs with {@link readDefaultSpaceId}. */
export const setDefaultSpaceId = (settingsSpace: Space, spaceId: string): void => {
  Obj.update(settingsSpace.properties, (properties) => {
    Annotation.set(properties, AppAnnotation.DefaultSpaceAnnotation, spaceId);
  });
};

/**
 * The space the user has designated as their default — the target for content that is not scoped
 * to the active space (quick entry, chat, preview and entity lookup).
 *
 * Resolves the designation on the settings space, falling back to the legacy personal space for
 * profiles that have not been migrated yet.
 */
export const getDefaultSpace = (client: SpaceResolver): Space | undefined => {
  const settingsSpace = getSettingsSpace(client);
  const configuredId = settingsSpace && readDefaultSpaceId(settingsSpace);
  const configured = configuredId ? client.spaces.get(configuredId) : undefined;
  // The settings space is internal; designating it would hand app configuration out as the default
  // content target, so a stale or hand-edited designation falls through to the legacy space.
  if (configured && !isSettingsSpace(configured)) {
    return configured;
  }

  return client.spaces.get().find((space) => isLegacyDefaultSpace(space));
};

//
// Identity bootstrap.
//

/**
 * Create the two spaces every profile starts with, and designate the second as the default.
 *
 * Shared by the app's identity-created module, the `halo create` CLI command and the story/test
 * harnesses so the shape of a new profile is defined once. It lives here rather than in
 * plugin-space because plugin-client (CLI, test harness) cannot depend on plugin-space.
 *
 * Both are locked at genesis: the settings space holds configuration that must never be shared,
 * and the first space is private until the user decides otherwise. Both replicate through EDGE so
 * they follow the identity across devices.
 */
export const setupIdentitySpaces = Effect.fnUntraced(function* (client: Client) {
  const settingsSpace = yield* Effect.promise(() =>
    client.spaces.create(
      { name: SETTINGS_SPACE_NAME },
      { tags: [SETTINGS_SPACE_TAG], membershipPolicy: MembershipPolicy.LOCKED },
    ),
  );
  yield* Effect.promise(() => settingsSpace.waitUntilReady());
  yield* Effect.promise(() => settingsSpace.internal.setEdgeReplicationPreference(EdgeReplicationSetting.ENABLED));

  const defaultSpace = yield* Effect.promise(() =>
    client.spaces.create({ name: DEFAULT_SPACE_NAME }, { membershipPolicy: MembershipPolicy.LOCKED }),
  );
  yield* Effect.promise(() => defaultSpace.waitUntilReady());
  yield* Effect.promise(() => defaultSpace.internal.setEdgeReplicationPreference(EdgeReplicationSetting.ENABLED));

  setDefaultSpaceId(settingsSpace, defaultSpace.id);

  return { settingsSpace, defaultSpace };
});

//
// Legacy resolution — profiles created before the settings space existed.
//

// TODO(wittjosiah): Remove once all profiles have migrated to the settings space.
const DEFAULT_SPACE_KEY = '__DEFAULT__';

/** The slice of a HALO credential the legacy `DefaultSpace` lookup reads. */
type LegacyCredential = { subject?: { assertion?: { spaceId?: unknown } } };

/**
 * Check if a space is the default space of a profile created before the settings space existed.
 * Reads the immutable tag, or the `__DEFAULT__` property older clients wrote before tags existed.
 * @deprecated Compare against {@link getDefaultSpace} instead; this only reads legacy markers.
 */
export const isLegacyDefaultSpace = (space: TaggedSpace): boolean => {
  if (hasTag(space, PERSONAL_SPACE_TAG)) {
    return true;
  }

  // Closed spaces throw on property access, and this runs across the whole space list.
  try {
    return (space.properties as Record<string, unknown> | undefined)?.[DEFAULT_SPACE_KEY] === true;
  } catch {
    return false;
  }
};

/**
 * Find the legacy default space, falling back to the `DefaultSpace` HALO credential for profiles
 * that predate immutable space tags. Migration input only — read {@link getDefaultSpace} at runtime.
 * @deprecated
 */
export const resolveLegacyDefaultSpace = (
  client: SpaceResolver & { halo: { queryCredentials(options: { type: string }): LegacyCredential[] } },
): Space | undefined => {
  const found = client.spaces.get().find((space) => isLegacyDefaultSpace(space));
  if (found) {
    return found;
  }

  const credential = client.halo.queryCredentials({ type: 'dxos.halo.credentials.DefaultSpace' })[0];
  const spaceId: unknown = credential?.subject?.assertion?.spaceId;
  return typeof spaceId === 'string' ? client.spaces.get(spaceId) : undefined;
};

//
// Active space helpers.
//

export const getActiveWorkspace = (capabilities: CapabilityManager.CapabilityManager) => {
  const registry = capabilities.get(Capabilities.AtomRegistry);
  const layoutAtom = capabilities.get(AppCapabilities.Layout);
  const layout = registry.get(layoutAtom);
  return layout.workspace;
};

export const getActiveSpaceId = (workspace?: string) =>
  workspace ? GraphPath.getSpaceIdFromPath(workspace) : undefined;

export const getActiveSpace = (client: Client, capabilities: CapabilityManager.CapabilityManager) => {
  const spaceId = getActiveSpaceId(getActiveWorkspace(capabilities));
  return spaceId ? client.spaces.get(spaceId) : undefined;
};

//
// Home content visibility.
//

/** Restore every Home content section for a space to visible, clearing all per-section overrides. */
export const resetHomeVisibility = (space: Space): void => {
  Obj.update(space.properties, (properties) => {
    Annotation.set(properties, AppAnnotation.HomeVisibilityAnnotation, {});
  });
};
