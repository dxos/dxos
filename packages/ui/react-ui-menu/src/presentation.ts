//
// Copyright 2026 DXOS.org
//

import { type Node } from '@dxos/app-graph';
import { type MenuActionProperties } from '@dxos/ui-types';

/**
 * Merges an action's `presentation[surface]` chrome override (if any) into its properties, letting a
 * single action declare multiple dispositions yet render appropriately in each surface — e.g. a
 * primary toolbar button and a plain nav-tree row from the same definition.
 */
export const applyPresentation = <A extends Node.ActionLike>(action: A, surface: string): A => {
  const presentation = (action.properties as MenuActionProperties).presentation?.[surface];
  if (!presentation) {
    return action;
  }
  return { ...action, properties: { ...action.properties, ...presentation } };
};
