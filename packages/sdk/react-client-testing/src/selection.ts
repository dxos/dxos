//
// Copyright 2022 DXOS.org
//

import { Party, Selection } from '@dxos/client';
import { TestType } from '@dxos/client-testing';

/**
 * Eval method against a party object.
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval#never_use_eval!
 * @param party
 * @param text
 */
// TODO(burdon): Create utility class.
export const execSelection = (party: Party, text: string): Selection<any> | undefined => {
  try {
    // eslint-disable-next-line no-new-func
    const exec = new Function(`"use strict"; return function(party) { return party.${text} }`)();
    const result = exec(party);
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
