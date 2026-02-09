//
// Copyright 2024 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import { EmptySchema } from '@bufbuild/protobuf/wkt';

export * as buf from '@bufbuild/protobuf';
export * as bufWkt from '@bufbuild/protobuf/wkt';
export * as bufCodegen from '@bufbuild/protobuf/codegenv2';

// Re-export commonly used types and functions.
export {
  create,
  fromBinary,
  toBinary,
  type DescMessage,
  type DescMethod,
  type DescService,
  type Message,
  type MessageShape,
} from '@bufbuild/protobuf';
export { type Empty, EmptySchema } from '@bufbuild/protobuf/wkt';
export { type GenService, type GenServiceMethods } from '@bufbuild/protobuf/codegenv2';

/** @deprecated Use `create` instead. */
export { create as createBuf } from '@bufbuild/protobuf';

export const EMPTY = create(EmptySchema);
