//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { Capabilities, type CapabilityManager } from '@dxos/app-framework';
import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { Obj } from '@dxos/echo';

import { Paths } from '../app';
import { AppCapabilities } from '../app-framework';

//
// Personal and exemplar space tags.
//

/** Space tag for the personal space. */
export const PERSONAL_SPACE_TAG = 'org.dxos.space.personal';

/** Space tag for the bundled exemplar/sample space. */
export const EXEMPLAR_SPACE_TAG = 'org.dxos.space.exemplar';

// TODO(wittjosiah): Remove once all profiles have tagged personal spaces (tags cannot be added retroactively).
const DEFAULT_SPACE_KEY = '__DEFAULT__';

// Intentional escape hatch: reads a pre-schema marker that lives outside the typed SpaceProperties
// struct, written by old clients before immutable space tags existed.
const hasLegacyDefaultSpaceMarker = (properties: Record<string, unknown>): boolean =>
  properties[DEFAULT_SPACE_KEY] === true;

/** Check if a space has a specific tag. */
export const hasTag = (space: Pick<Space, 'tags'>, tag: string): boolean => space.tags.includes(tag);

/** Check if a space is the exemplar/sample space. */
export const isExemplarSpace = (space: Pick<Space, 'tags'>): boolean => hasTag(space, EXEMPLAR_SPACE_TAG);

/** Check if a space is the personal space. */
export const isPersonalSpace = (space: Pick<Space, 'tags' | 'properties'>): boolean => {
  if (hasTag(space, PERSONAL_SPACE_TAG)) {
    return true;
  }

  // TODO(wittjosiah): Remove once all profiles have tagged personal spaces (tags cannot be added retroactively).
  try {
    return hasLegacyDefaultSpaceMarker(space.properties as unknown as Record<string, unknown>);
  } catch {
    return false;
  }
};

/**
 * Mark a space as the personal space via legacy property.
 * @deprecated Use `tags: [PERSONAL_SPACE_TAG]` when creating the space instead.
 * TODO(wittjosiah): Remove once all profiles have tagged personal spaces (tags cannot be added retroactively).
 */
export const setPersonalSpace = (space: Space): void => {
  Obj.update(space.properties, (properties) => {
    (properties as any)[DEFAULT_SPACE_KEY] = true;
  });
};

/** Find the personal space. */
export const getPersonalSpace = (client: { spaces: { get(): Space[] } }): Space | undefined =>
  client.spaces.get().find((space) => isPersonalSpace(space));

/**
 * Find the personal space, falling back to the legacy `DefaultSpace` HALO credential for profiles
 * that predate immutable space tags.
 *
 * Returns `{ space, fromCredential }` where `fromCredential: true` means the space was found via
 * the old credential and `setPersonalSpace` should be called once the space is ready to persist
 * the `__DEFAULT__` marker for future loads.
 *
 * TODO(wittjosiah): Remove once all profiles have tagged personal spaces (tags cannot be added retroactively).
 */
export const resolvePersonalSpace = (client: {
  spaces: { get(): Space[]; get(id: any): Space | undefined };
  halo: { queryCredentials(options: { type: string }): any[] };
}): { space: Space; fromCredential: boolean } | undefined => {
  const found = getPersonalSpace(client);
  if (found) {
    return { space: found, fromCredential: false };
  }

  const defaultSpaceCredential = client.halo.queryCredentials({
    type: 'dxos.halo.credentials.DefaultSpace',
  })[0];
  if (!defaultSpaceCredential) {
    return undefined;
  }

  const defaultSpaceId = defaultSpaceCredential?.subject?.assertion?.spaceId;
  if (typeof defaultSpaceId !== 'string') {
    return undefined;
  }
  const space = client.spaces.get(defaultSpaceId);
  return space ? { space, fromCredential: true } : undefined;
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

export const getActiveSpaceId = (workspace?: string) => (workspace ? Paths.getSpaceIdFromPath(workspace) : undefined);

export const getActiveSpace = (client: Client, capabilities: CapabilityManager.CapabilityManager) => {
  const spaceId = getActiveSpaceId(getActiveWorkspace(capabilities));
  return spaceId ? client.spaces.get(spaceId) : undefined;
};
