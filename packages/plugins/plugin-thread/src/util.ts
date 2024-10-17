//
// Copyright 2024 DXOS.org
//

import { generateName } from '@dxos/display-name';
import { type PublicKey } from '@dxos/react-client';
import { type Identity } from '@dxos/react-client/halo';
import { type MessageMetadata } from '@dxos/react-ui-thread';
import { hexToFallback } from '@dxos/util';

export type MessagePropertiesProvider = (identityKey: PublicKey | undefined) => MessageMetadata;

export const getMessageMetadata = (id: string, identity?: Identity): MessageMetadata => {
  const fallback = hexToFallback(identity?.identityKey.toHex() ?? '0');
  return {
    id,
    authorId: identity?.identityKey.toHex(),
    authorName:
      identity?.profile?.displayName ??
      (identity?.identityKey ? generateName(identity.identityKey.toHex()) : undefined),
    authorAvatarProps: {
      hue: identity?.profile?.data?.hue ?? fallback.hue,
      emoji: identity?.profile?.data?.emoji ?? fallback.emoji,
    },
  };
};
