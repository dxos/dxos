//
// Copyright 2026 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';

// Node-specific implementation spliced into the generated barrel by `dx-plugin gen` in place of
// the canonical declaration: the headless environments register the reduced schema list rather
// than the browser `./schema` module.
export const Schema = AppCapability.schema(() => import('../schema.headless'));

// OperationHandler intentionally has NO override here: the former `capabilities/node.ts` built
// this module by hand instead of via the `AppCapability.operationHandler` maker, omitting
// `activatesOn` and so defaulting it to the Idle wave instead of the maker's Startup — a drift
// bug, not a deliberate choice (see plugin-variant-dedup DESIGN.md's drift audit, which names
// this exact plugin). Letting `capabilities/index.ts`'s canonical maker-based declaration flow
// through unmodified fixes it: node now registers on Startup, matching browser and workerd.
