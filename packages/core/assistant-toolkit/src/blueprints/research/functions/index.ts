//
// Copyright 2025 DXOS.org
//

import { default as create$ } from './document-create';
import { default as research$ } from './research';

export * as ResearchGraph from './research-graph';
export * from './types';

export namespace Functions {
  export const create = create$;
  export const research = research$;
}

// Backwards compatibility
export const ResearchFunctions = Functions;
