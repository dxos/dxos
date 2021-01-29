//
// Copyright 2020 DXOS.org
//

import get from 'lodash.get';
import update from 'immutability-helper';
import { useRef, useState } from 'react';

/**
 * Returns a state object and setter, with addition live getter and updater (for the current up-to-date reference).
 * Regular state hooks return values that are stale within callbacks.
 *
 * https://reactjs.org/docs/hooks-faq.html#why-am-i-seeing-stale-props-or-state-inside-my-function
 *
 * @param {Object} [initalValue]
 * @return {{ Object, function, function, function }}
 */
export const useObjectMutator = (initalValue = {}) => {
  const [data, setData] = useState(initalValue);
  const ref = useRef(data);
  return [

    // Get data state (snapshot).
    data,

    // Update data state.
    data => {
      ref.current = data;
      setData(ref.current);
    },

    // Getter (using the current reference).
    key => !key ? ref.current : get(ref.current, key),

    // Updater.
    // https://github.com/kolodny/immutability-helper
    // NOTE: Use $apply to update variable (e.g., push to potentially null object).
    data => setData(ref.current = update(ref.current, data))
  ];
};
