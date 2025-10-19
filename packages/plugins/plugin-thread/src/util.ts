//
// Copyright 2024 DXOS.org
//

import * as Match from 'effect/Match';

import { generateName } from '@dxos/display-name';
import { type Selection } from '@dxos/plugin-attention';
import { type PublicKey } from '@dxos/react-client';
import { type Identity } from '@dxos/react-client/halo';
import { type MessageMetadata } from '@dxos/react-ui-thread';
import { hexToFallback } from '@dxos/util';

export type MessagePropertiesProvider = (identityKey: PublicKey | undefined) => MessageMetadata;

export const getMessageMetadata = (id: string, identity?: Identity): MessageMetadata => {
  const fallback = hexToFallback(identity?.identityKey.toHex() ?? '0');
  return {
    id,
    authorId: identity?.did,
    authorName:
      identity?.profile?.displayName ??
      (identity?.identityKey ? generateName(identity.identityKey.toHex()) : undefined),
    authorAvatarProps: {
      hue: identity?.profile?.data?.hue ?? fallback.hue,
      emoji: identity?.profile?.data?.emoji ?? fallback.emoji,
    },
  };
};

export const getAnchor = Match.type<Selection | undefined>().pipe(
  Match.when({ mode: 'single' }, (s) => s.id),
  Match.when({ mode: 'multi' }, (s) => (s.ids.length > 0 ? s.ids.join(',') : undefined)),
  Match.when({ mode: 'range' }, (s) => (s.from && s.to ? `${s.from}:${s.to}` : undefined)),
  Match.when({ mode: 'multi-range' }, (s) => s.ranges[0] && `${s.ranges[0].from}:${s.ranges[0].to}`),
  Match.when(undefined, () => undefined),
  Match.exhaustive,
);
