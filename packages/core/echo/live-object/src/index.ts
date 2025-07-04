//
// Copyright 2024 DXOS.org
//

// TODO(dmaretskyi): Remove deprecated exports.

export * from './proxy';
export * from './snapshot';
export * from './object';
export * from './live';

/**
 * @deprecated Use {@link Ref.make} instead.
 */
// export const makeRef = EchoSchemaModule.Ref.make;

/**
 * @deprecated Use {@link Ref.fromDXN} instead.
 */
// export const refFromDXN = EchoSchemaModule.Ref.fromDXN;

/**
 * @deprecated Import from `@dxos/echo-schema` instead.
 */
// export const RefArray = EchoSchemaModule.RefArray;

/**
 * @deprecated Import from `@dxos/echo-schema` instead.
 */
// export const getObjectMeta = EchoSchemaModule.getObjectMeta;

/**
 * @deprecated Import from `@dxos/echo-schema` instead.
 */
// export const isDeleted = EchoSchemaModule.isDeleted;

/**
 * @deprecated Import from `@dxos/echo-schema` instead.
 */
// export const getType = EchoSchemaModule.getType;

/**
 * @deprecated Import from `@dxos/echo-schema` instead.
 */
// export const getMeta = EchoSchemaModule.getMeta;
