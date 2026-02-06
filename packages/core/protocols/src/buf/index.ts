//
// Copyright 2024 DXOS.org
//

export * as buf from '@bufbuild/protobuf';
export * as bufWkt from '@bufbuild/protobuf/wkt';

// Re-export commonly used types and functions.
export { create, type Message, type MessageShape, toBinary, fromBinary } from '@bufbuild/protobuf';
export { type Empty, EmptySchema } from '@bufbuild/protobuf/wkt';

/** @deprecated Use `create` instead. */
export { create as createBuf } from '@bufbuild/protobuf';
