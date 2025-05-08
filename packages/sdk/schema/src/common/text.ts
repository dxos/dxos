//
// Copyright 2025 DXOS.org
//

import { S, TypedObject } from '@dxos/echo-schema';

// TODO(wittjosiah): Using `EchoObject` here causes type errors.
export class TextType extends TypedObject({ typename: 'dxos.org/type/Text', version: '0.1.0' })({
  content: S.String,
}) {}
