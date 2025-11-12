//
// Copyright 2023 DXOS.org
//

import { useControllableState } from '@radix-ui/react-use-controllable-state';
import { type Dispatch, type SetStateAction } from 'react';

/**
 * A stateful hook with a controlled value.
 * @deprecated Use Radix `useControllableState`.
 */
// TODO(burdon): Remove and require default.
export const useControlledState = <T>(
  controlledValue: T,
  onChange?: (value: T) => void,
): [T, Dispatch<SetStateAction<T>>] =>
  useControllableState<T>({ prop: controlledValue, defaultProp: undefined as unknown as T, onChange });
