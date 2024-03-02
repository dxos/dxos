//
// Copyright 2024 DXOS.org
//

import { generateName } from '@dxos/display-name';
import { type PublicKey } from '@dxos/react-client';
import { type Identity } from '@dxos/react-client/halo';
import { type MessageMetadata } from '@dxos/react-ui-thread';

export type MessagePropertiesProvider = (identityKey: PublicKey | undefined) => MessageMetadata;

// TODO(burdon): This isn't a hook. Rename and move to types.
export const createMessageData = (id: string, identity?: Identity): MessageMetadata => {
  return {
    id,
    authorId: identity?.identityKey.toHex(),
    authorName:
      identity?.profile?.displayName ??
      (identity?.identityKey ? generateName(identity.identityKey.toHex()) : undefined),
    authorStatus: 'inactive',
  };
};
