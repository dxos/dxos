//
// Copyright 2023 DXOS.org
//

export * from './meta';
// Companion view-state aspect — public so consumers (e.g. plugin-assistant) can read the
// globally-selected companion variant that used to live on `DeckState.companionVariant`.
export { COMPANION_VIEW_STATE_CONTEXT, type CompanionState, companionAspect } from './util/companion-view-state';
export * as DeckCapabilities from './types/DeckCapabilities';
export * as DeckOperation from './types/DeckOperation';
export * from './types';
export * as Settings from './types/Settings';
