//
// Copyright 2026 DXOS.org
//

import * as GraphPath from '@dxos/app-toolkit/GraphPath';

/** Well-known local segment name (private — use the helpers below). */
const PROVIDERS_SEGMENT = 'providers';

/** Canonical segment ID for the Providers section node. */
export const getProvidersSectionId = (): string => PROVIDERS_SEGMENT;

/** Canonical qualified path to a specific Provider within a space. */
export const getProviderPath = (spaceId: string, providerId: string): string =>
  GraphPath.getSpacePath(spaceId, PROVIDERS_SEGMENT, providerId);
