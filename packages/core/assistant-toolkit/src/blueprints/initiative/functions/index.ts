//
// Copyright 2026 DXOS.org
//

import { default as addArtifact$ } from './add-artifact';
import { default as agent$ } from './agent';
import { default as getContext$ } from './get-context';
import { default as qualifier$ } from './qualifier';

export namespace Functions {
  export const addArtifact = addArtifact$;
  export const agent = agent$;
  export const getContext = getContext$;
  export const qualifier = qualifier$;
}
