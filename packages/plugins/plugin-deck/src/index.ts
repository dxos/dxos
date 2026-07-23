//
// Copyright 2023 DXOS.org
//

export * from './meta';
export * from './types';
// Companion view-state aspect — public so consumers (e.g. plugin-assistant) can read the
// globally-selected companion variant that used to live on `DeckState.companionVariant`.
export { COMPANION_VIEW_STATE_CONTEXT, type CompanionState, companionAspect } from './util/companion-view-state';
