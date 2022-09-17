//
// Copyright 2019 DXOS.org
//

import { schemaJson as Schema, schema } from './gen';

export const codec = schema.getCodecForType('dxos.halo.signed.Message');

/**
 * Loop the message through the codec. Useful for checking that the object properly conforms to protobuf.
 * @param message
 */
export const codecLoop = (message: any) => codec.decode(codec.encode(message));

export { Schema, schema };
