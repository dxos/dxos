//
// Copyright 2024 DXOS.org
//

export * from './Annotation';
export * from './common';
export * from './Entity';
export * from './Format';
export * from './JsonSchema';
// TODO(wittjosiah): Required to ensure types are portable (need to export all types required for downstream inference).
export * from './Obj';
export { prettyFilter, prettyQuery } from './Query/pretty';
export * from './Ref';
export * from './Type';

// Re-exported here (not from the low-level `common/types` barrel) so consumers keep importing meta
// from `@dxos/echo/internal`, while that barrel stays free of the Ref/Annotation eval cycle. Placed
// after `./Ref` so the ref schema `meta` depends on is initialized first.
export * from './common/types/meta';
