//
// Copyright 2023 DXOS.org
//

export * from './meta';
export * from './types';
// Public so consumers (e.g. plugin-assistant) can read which companion the sidebar is showing.
export { getNodeCompanionVariant, makeNodeCompanionValue } from './hooks/useCompanionGroups';
