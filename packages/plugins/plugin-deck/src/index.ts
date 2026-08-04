//
// Copyright 2023 DXOS.org
//

// Companion view-state aspect — public so consumers (e.g. plugin-assistant) can read the
// globally-selected companion variant that used to live on `DeckState.companionVariant`.

export * as DeckCapabilities from './types/DeckCapabilities';
export * as DeckOperation from './types/DeckOperation';
export * as DeckRole from './types/DeckRole';
export * as DeckSchema from './types/DeckSchema';
export * as Settings from './types/Settings';
export * from './meta';
export { COMPANION_VIEW_STATE_CONTEXT, type CompanionState, companionAspect } from './util/companion-view-state';
