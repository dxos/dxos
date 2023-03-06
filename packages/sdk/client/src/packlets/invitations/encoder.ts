//
// Copyright 2022 DXOS.org
//

import base from 'base-x';

import { schema } from '@dxos/protocols';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';

// Encode with URL-safe alpha-numeric characters.
const base62 = base('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');

const codec = schema.getCodecForType('dxos.client.services.Invitation');

/**
 * Encodes and decodes an invitation proto into/from alphanumeric chars.
 */
export class InvitationEncoder {
  static decode(text: string): Invitation {
    return codec.decode(base62.decode(text));
  }

  static encode(invitation: Invitation): string {
    return base62.encode(codec.encode(invitation));
  }
}
