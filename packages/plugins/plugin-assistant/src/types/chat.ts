//
// Copyright 2024 DXOS.org
//

import { Expando, Ref, S, TypedObject } from '@dxos/echo-schema';

export class AIChatType extends TypedObject({ typename: 'dxos.org/type/AIChat', version: '0.1.0' })({
  name: S.optional(S.String),
  // TODO(wittjosiah): Should be a ref to a Queue.
  queue: Ref(Expando),
}) {}
