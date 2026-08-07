//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Option from 'effect/Option';

import { type CapabilityManager } from '@dxos/app-framework';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { Annotation, Obj } from '@dxos/echo';

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
 * @deprecated The personal space is now an ordinary space designated by the
 * {@link AppAnnotation.PersonalSpaceAnnotation} setting on the settings space. This tag survives
 * only to resolve profiles created before the settings space existed.
 */
export const PERSONAL_SPACE_TAG = 'org.dxos.space.personal';

/** Space tag for the bundled exemplar/sample space. */
export const EXEMPLAR_SPACE_TAG = 'org.dxos.space.exemplar';

// TODO(wittjosiah): Remove once all profiles have migrated to the settings space.
const DEFAULT_SPACE_KEY = '__DEFAULT__';

// Intentional escape hatch: reads a pre-schema marker that lives outside the typed SpaceProperties
// struct, written by old clients before immutable space tags existed.
const hasLegacyDefaultSpaceMarker = (properties: Record<string, unknown>): boolean =>
  properties[DEFAULT_SPACE_KEY] === true;

/** Check if a space has a specific tag. */
export const hasTag = (space: Pick<Space, 'tags'>, tag: string): boolean => space.tags.includes(tag);

/** Check if a space is the exemplar/sample space. */
export const isExemplarSpace = (space: Pick<Space, 'tags'>): boolean => hasTag(space, EXEMPLAR_SPACE_TAG);

/** Check if a space is the settings space. */
export const isSettingsSpace = (space: Pick<Space, 'tags'>): boolean => hasTag(space, SETTINGS_SPACE_TAG);

/** Find the settings space. */
export const getSettingsSpace = (client: { spaces: { get(): Space[] } }): Space | undefined =>
  client.spaces.get().find((space) => isSettingsSpace(space));

/** Resolves spaces by id or in bulk; structural so callers can pass a `Client` or a stub. */
type SpaceResolver = { spaces: { get(): Space[]; get(id: string): Space | undefined } };

/** The slice of a HALO credential the legacy `DefaultSpace` lookup reads. */
type LegacyCredential = { subject?: { assertion?: { spaceId?: unknown } } };

/**
 * Check if a space is the personal space of a profile created before the settings space existed.
 * @deprecated Compare against {@link getPersonalSpace} instead; this only reads legacy markers.
 */
export const isLegacyPersonalSpace = (space: Pick<Space, 'tags' | 'properties'>): boolean => {
  if (hasTag(space, PERSONAL_SPACE_TAG)) {
    return true;
  }

  try {
    return hasLegacyDefaultSpaceMarker(space.properties as unknown as Record<string, unknown>);
  } catch {
    return false;
  }
};

/**
 * Mark a space as the legacy personal space via the `__DEFAULT__` property.
 * @deprecated Only used to persist the result of a `DefaultSpace` credential lookup so the
 * settings-space migration can find it on the next load.
 */
export const setLegacyPersonalSpace = (space: Space): void => {
  Obj.update(space.properties, (properties) => {
    (properties as unknown as Record<string, unknown>)[DEFAULT_SPACE_KEY] = true;
  });
};

/**
 * Find the legacy personal space, falling back to the `DefaultSpace` HALO credential for profiles
 * that predate immutable space tags.
 *
 * Returns `{ space, fromCredential }` where `fromCredential: true` means the space was found via
 * the old credential and {@link setLegacyPersonalSpace} should be called once the space is ready
 * to persist the `__DEFAULT__` marker for future loads.
 *
 * @deprecated Migration input only — read {@link getPersonalSpace} at runtime.
 */
export const resolveLegacyPersonalSpace = (
  client: SpaceResolver & { halo: { queryCredentials(options: { type: string }): LegacyCredential[] } },
): { space: Space; fromCredential: boolean } | undefined => {
  const found = client.spaces.get().find((space) => isLegacyPersonalSpace(space));
  if (found) {
    return { space: found, fromCredential: false };
  }

  const defaultSpaceCredential = client.halo.queryCredentials({
    type: 'dxos.halo.credentials.DefaultSpace',
  })[0];
  if (!defaultSpaceCredential) {
    return undefined;
  }

  const defaultSpaceId: unknown = defaultSpaceCredential?.subject?.assertion?.spaceId;
  if (typeof defaultSpaceId !== 'string') {
    return undefined;
  }
  const space = client.spaces.get(defaultSpaceId);
  return space ? { space, fromCredential: true } : undefined;
};

/** Read the personal-space designation off the settings space, if one has been made. */
export const readPersonalSpaceId = (settingsSpace: Pick<Space, 'properties'>): string | undefined => {
  // The settings space may not be open yet, in which case reading `properties` throws.
  try {
    return Annotation.get(settingsSpace.properties, AppAnnotation.PersonalSpaceAnnotation).pipe(Option.getOrUndefined);
  } catch {
    return undefined;
  }
};

/**
 * The space the user has designated as their personal space — the default target for content that
 * is not scoped to the active space (quick entry, chat, preview and entity lookup).
 *
 * Resolves the {@link AppAnnotation.PersonalSpaceAnnotation} setting on the settings space, falling
 * back to the legacy personal space for profiles that have not yet been migrated.
 */
export const getPersonalSpace = (client: SpaceResolver): Space | undefined => {
  const settingsSpace = getSettingsSpace(client);
  const configuredId = settingsSpace && readPersonalSpaceId(settingsSpace);
  const configured = configuredId ? client.spaces.get(configuredId) : undefined;
  // The settings space is internal; designating it would hand app configuration out as the default
  // content target, so a stale or hand-edited designation falls through to the legacy space.
  if (configured && !isSettingsSpace(configured)) {
    return configured;
  }

  return client.spaces.get().find((space) => isLegacyPersonalSpace(space));
};

/** Designate `spaceId` as the personal space by writing the setting to the settings space. */
export const setPersonalSpaceId = (settingsSpace: Space, spaceId: string): void => {
  Obj.update(settingsSpace.properties, (properties) => {
    Annotation.set(properties, AppAnnotation.PersonalSpaceAnnotation, spaceId);
  });
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
