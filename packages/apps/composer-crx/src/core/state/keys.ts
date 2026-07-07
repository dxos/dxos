//
// Copyright 2026 DXOS.org
//

import { decodeBoolean, decodeString, defineState } from './state';

//
// Config — `browser.storage.sync` (user-set, synced across the user's browsers).
//

/** Whether developer mode is enabled (verbose logging, debug preview, local service endpoints). */
export const DeveloperMode = defineState('sync', 'developer-mode', false, decodeBoolean);

/** Whether the assistant should use the configured Space to retrieve information. */
export const SpaceMode = defineState('sync', 'space-mode', false, decodeBoolean);

/** The configured Space id the assistant queries when {@link SpaceMode} is enabled. */
export const SpaceId = defineState<string | undefined>('sync', 'space-id', undefined, decodeString);

//
// Session — `browser.storage.local` (per-install).
//

/** Thumbnail data URL handed from the context-menu action to the side panel on (re)open. */
export const ThumbnailUrl = defineState<string | undefined>('local', 'thumbnail-url', undefined, decodeString);
