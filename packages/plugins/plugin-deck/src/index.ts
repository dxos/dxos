//
// Copyright 2023 DXOS.org
//

// Companion view-state aspect — public so consumers (e.g. plugin-assistant) can read the
// globally-selected companion variant that used to live on `DeckState.companionVariant`.

export * from './meta';
export { COMPANION_VIEW_STATE_CONTEXT, type CompanionState, companionAspect } from './util/companion-view-state';
export * from './types';
