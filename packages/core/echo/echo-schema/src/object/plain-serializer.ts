import { ECHO_ATTR_TYPE, TYPENAME_SYMBOL } from './typename';

/**
 * Converts an ECHO object with hidden symbols to a plain object with `@type` and `@meta` fields.
 */
export const toPlainObject = (obj: any) => {
  const { id, [TYPENAME_SYMBOL]: typename, ...rest } = obj;
  return {
    id,
    [ECHO_ATTR_TYPE]: typename,
    ...rest,
  };
};
