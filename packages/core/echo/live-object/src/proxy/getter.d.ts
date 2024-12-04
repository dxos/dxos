import { Reference } from '@dxos/echo-protocol';
import { type S } from '@dxos/effect';
import type { BaseObject } from '@dxos/echo-schema';
/**
 * Returns the schema for the given object if one is defined.
 */
export declare const getSchema: <T extends BaseObject<T>>(obj: T | undefined) => S.Schema<any> | undefined;
export declare const isDeleted: <T extends BaseObject<T>>(obj: T) => boolean;
export declare const getType: <T extends BaseObject<T>>(obj: T | undefined) => Reference | undefined;
export declare const getTypename: <T extends BaseObject<T>>(obj: T) => string | undefined;
//# sourceMappingURL=getter.d.ts.map
