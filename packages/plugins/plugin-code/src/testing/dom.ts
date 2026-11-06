//
// Copyright 2026 DXOS.org
//

import { invariant } from '@dxos/invariant';

/** The first element under `root` that matches `selector`; throws when there is none. */
export const queryElement = (root: ParentNode, selector: string): HTMLElement => {
  const element = root.querySelector<HTMLElement>(selector);
  invariant(element, `No element matches ${selector}.`);
  return element;
};
