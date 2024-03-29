//
// Copyright 2020 DXOS.org
//

/**
 * A simple syntax sugar to write `value as T` as a statement.
 *
 * NOTE: This does not provide any type safety.
 * It's just for convenience so that autocomplete works for value.
 * It's recommended to check the type URL manually beforehand or use `assertAnyType` instead.
 * @param value
 */
export const checkType = <T>(value: T): T => value;
