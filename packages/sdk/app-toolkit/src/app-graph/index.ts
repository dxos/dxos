//
// Copyright 2025 DXOS.org
//

export * as AppNode from './AppNode.ts';
export * as AppNodeMatcher from './AppNodeMatcher.ts';
export * as DeckSpec from './DeckSpec.ts';
/**
 * @deprecated Moving away from the generic type-section pattern; top-level sections will all be custom
 * going forward. Remove once there are no more consumers. Remaining consumers: Calendar, Chat, Channel.
 */
export * as TypeSection from './TypeSection.ts';
