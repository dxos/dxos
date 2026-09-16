//
// Copyright 2024 DXOS.org
//

export * from './Annotation/index.ts';
export * from './common/index.ts';
export * from './Entity/index.ts';
export * from './Filter/index.ts';
export * from './Format/index.ts';
export * from './JsonSchema/index.ts';
// TODO(wittjosiah): Required to ensure types are portable (need to export all types required for downstream inference).
export * from './Obj/index.ts';
export { prettyFilter, prettyQuery } from './Query/pretty.ts';
export * from './Ref/index.ts';
export * from './Type/index.ts';

// Re-exported here (not from the low-level `common/types` barrel) so consumers keep importing meta
// from `@dxos/echo/internal`, while that barrel stays free of the Ref/Annotation eval cycle. Placed
// after `./Ref` so the ref schema `meta` depends on is initialized first.
export * from './common/types/meta.ts';
