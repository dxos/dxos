//
// Copyright 2026 DXOS.org
//

import React, { useState } from 'react';

import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { ClientProvider } from '@dxos/react-client';

import { Contacts, type Stage, reached } from './Contacts.tsx';
import { Share } from './Share.tsx';

export type PeerAppProps = {
  client: Client;
  /** The space the app opens on; joining another space switches to it. */
  space: Space;
  stage: Stage;
  compact?: boolean;
  onSpaceChange?: (space: Space) => void;
};

// #region provider
/**
 * The app for one client; the hooks below the provider read this client.
 */
export const PeerApp = ({
  client,
  space: initial,
  stage,
  compact,
  onSpaceChange,
}: PeerAppProps) => {
  const [space, setSpace] = useState(initial);
  const handleJoin = (space: Space) => {
    setSpace(space);
    onSpaceChange?.(space);
  };

  return (
    <ClientProvider client={client}>
      <Contacts
        key={space.id}
        space={space}
        stage={stage}
        compact={compact}
        actions={
          reached(stage, 'complete') && (
            <Share client={client} space={space} onJoin={handleJoin} />
          )
        }
      />
    </ClientProvider>
  );
};
// #endregion
