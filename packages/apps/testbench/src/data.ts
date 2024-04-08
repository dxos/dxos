//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';

import { EchoObjectSchema } from '@dxos/echo-schema';

// TODO(burdon): [API]: Dr. Frankenstein.
export class ItemType extends EchoObjectSchema({ typename: 'dxos.app.testbench.Item', version: '0.1.0' })({
  text: S.string,
}) {}
