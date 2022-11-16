//
// Copyright 2022 DXOS.org
//

import { Space, Selection } from '@dxos/client';
import { TestType } from '@dxos/client-testing';

/**
 * Eval method against a space object.
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval#never_use_eval!
 * @param space
 * @param text
 */
// TODO(burdon): Create utility class.
export const execSelection = (space: Space, text: string): Selection<any> | undefined => {
  try {
    // eslint-disable-next-line no-new-func
    const exec = new Function(`"use strict"; return function(space) { return space.${text} }`)();
    const result = exec(space);
    if (result instanceof Selection) {
      return result;
    }
  } catch (err) {
    // Ignore.
  }
};

const format = (text: string) => text.replace(/\)\./g, ')\n  .');

export const defaultSelectionText = format(
  `select().filter({ type: '${TestType.Org}' }).children().filter({ type: '${TestType.Project}' })`
);
