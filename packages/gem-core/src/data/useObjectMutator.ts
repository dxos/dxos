//
// Copyright 2020 DXOS.org
//

import update from 'immutability-helper';
import get from 'lodash/get';
import { useRef, useState } from 'react';

export type ObjectMutator<T> = [T, Function, Function, Function];

/**
 * Returns a state object and setter, with addition live getter and updater (for the current up-to-date reference).
 *
 * https://reactjs.org/docs/hooks-faq.html#why-am-i-seeing-stale-props-or-state-inside-my-function
 */
export const useObjectMutator = <T>(initalValue: T) => {
  const [data, setData] = useState<T>(initalValue);

  // Required since state is frozen within callbacks.
  const ref = useRef<T>(data);

  return [

    // Get data state (snapshot).
    data,

    // Update data state.
    (data: any) => {
      ref.current = data;
      setData(ref.current);
    },

    // Getter (using the current reference).
    (key: string) => !key ? ref.current : get(ref.current, key),

    // Updater.
    // https://github.com/kolodny/immutability-helper
    // NOTE: Use $apply to update variable (e.g., push to potentially null object).
    (data: any) => setData(ref.current = update(ref.current, data))
  ] as ObjectMutator<T>;
};
