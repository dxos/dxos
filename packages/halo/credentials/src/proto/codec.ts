//
// Copyright 2019 DXOS.org
//

import { schema } from '@dxos/protocols';

export const codec = schema.getCodecForType('dxos.halo.signed.Message');

// TODO(burdon): Testing.
export const codecLoop = (message: any) => codec.decode(codec.encode(message));
