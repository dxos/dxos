//
// Copyright 2024 DXOS.org
//

import { generateName } from '@dxos/display-name';
import { type PublicKey } from '@dxos/react-client';
import { type Identity } from '@dxos/react-client/halo';
import { type MessageMetadata } from '@dxos/react-ui-thread';

export type MessagePropertiesProvider = (identityKey: PublicKey | undefined) => MessageMetadata;

export const useMessageMetadata = (id: string, identity?: Identity): MessageMetadata => {
  const authorId = identity?.identityKey.toHex() ?? 'unknown';
  return {
    id,
    authorId,
    authorName: identity?.profile?.displayName ?? (identity?.identityKey ? generateName(authorId) : ''),
    authorStatus: 'inactive',
  };
};
