//
// Copyright 2022 DXOS.org
//

import update from 'immutability-helper';
import { Dispatch, SetStateAction, useState } from 'react';

/**
 * Partially updates state without copying complex (expensive) objects.
 * https://github.com/kolodny/immutability-helper
 *
 * ```tsx
 * const [value,, updateValue] = useStateMutator({ items: [], ... });
 * useEffect(() => {
 *   updateValue({
 *     items: {
 *       $push: [1, 2, 3] // Only update the items property.
 *     }
 *   })
 * }, []);
 * ```
 *
 * @param initialValue
 */
export const useStateUpdater = <T>(
  initialValue: T
): [T, Dispatch<SetStateAction<T>>, (spec: any) => T] => {
  const [value, setValue] = useState<T>(initialValue);
  const handleUpdate = (spec: any) => {
    const newValue = update(value, spec);
    setValue(newValue);
    return newValue;
  };

  return [value, setValue, handleUpdate];
};
