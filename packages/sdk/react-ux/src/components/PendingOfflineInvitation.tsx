//
// Copyright 2021 DXOS.org
//

import React from 'react';
import { CopyToClipboard } from 'react-copy-to-clipboard';

import { IconButton } from '@material-ui/core';
import LinkIcon from '@material-ui/icons/Link';

import { Party } from '@dxos/echo-db';
import { useOfflineInvitation } from '@dxos/react-client';

function PendingOfflineInvitation ({
  party,
  invitation,
  handleCopy
}: {
  party: Party;
  invitation: Record<string, any> | undefined;
  handleCopy: (value: string) => void;
}) {
  if (!invitation) {
    return null;
  }

  const [inviteCode] = useOfflineInvitation(party.key.asBuffer(), invitation.contact, {
    onError: (e) => {
      throw e;
    }
  });

  return (
    <CopyToClipboard text={inviteCode} onCopy={handleCopy}>
      <IconButton size='small' color='inherit' aria-label='copy to clipboard' title='Copy to clipboard' edge='start'>
        <LinkIcon />
      </IconButton>
    </CopyToClipboard>
  );
}

export default PendingOfflineInvitation;
