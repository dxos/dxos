//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';
import urlJoin from 'url-join';

import { Face as NewIcon, Contacts as AddressIcon, Adb as BotIcon } from '@mui/icons-material';
import { Box, Button, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';

import { InvitationEncoder, Invitation, PartyMember } from '@dxos/client';
import { Dialog } from '@dxos/react-components';
import { ResourceSet } from '@dxos/registry-client';

import { MemberRow } from './MemberRow';
import { PendingInvitation } from './PendingInvitation';
import { SpawnBotPanel } from './SpawnBotPanel';

const defaultCreateUrl = (invitation: Invitation) => {
  // TODO(burdon): By-pass keyhole with fake code.
  const code = InvitationEncoder.encode(invitation);
  const kubeCode = [...new Array(6)].map(() => Math.floor(Math.random() * 10)).join('');
  const invitationPath = `/invitation/${code}`; // App-specific.
  const { origin, pathname } = window.location;
  return urlJoin(origin, pathname, `?code=${kubeCode}`, `/#${invitationPath}`);
};

enum MemberType {
  ONLINE,
  OFFLINE,
  BOT
}

export interface SharingDialogProps {
  open: boolean;
  modal?: boolean;
  title: string;
  members?: PartyMember[]; // TODO(rzadp): Support HALO members as well (different devices).
  invitations?: Invitation[];
  createUrl?: (invitation: Invitation) => string;
  onCreateInvitation: () => void;
  onCreateOfflineInvitation?: () => void; // TODO(burdon): Pass type/identityKey into onCreateInvitation.
  onCancelInvitation: (invitation: Invitation) => void;
  onCreateBotInvitation?: (resource: ResourceSet) => void;
  onClose?: () => void;
}

/**
 * Reusable sharing logic for inviting to a regular party and to a HALO party.
 * Not exported for the end user.
 * See PartySharingDialog and DeviceSharingDialog.
 * @deprecated
 */
export const SharingDialog = ({
  open,
  modal,
  title,
  members = [],
  invitations = [],
  createUrl = defaultCreateUrl,
  onCreateInvitation,
  onCancelInvitation,
  onCreateOfflineInvitation,
  onCreateBotInvitation,
  onClose
}: SharingDialogProps) => {
  const [memberType, setMemberType] = useState(MemberType.ONLINE);
  const [bot, setBot] = useState<ResourceSet>();

  const active = memberType === MemberType.ONLINE || (memberType === MemberType.BOT && bot);

  const handleInvitation = () => {
    switch (memberType) {
      case MemberType.ONLINE: {
        onCreateInvitation();
        break;
      }

      case MemberType.OFFLINE: {
        onCreateOfflineInvitation?.();
        break;
      }

      case MemberType.BOT: {
        onCreateBotInvitation?.(bot!);
        break;
      }
    }
  };

  return (
    <Dialog
      open={open}
      modal={modal}
      title={title}
      maxWidth='sm'
      content={
        <>
          <Typography variant='body2' sx={{ marginBottom: 2 }}>
            {`Add collaborators ${onCreateBotInvitation ? 'and bots' : ''} to the party.`}
          </Typography>

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 3
            }}
          >
            {(onCreateOfflineInvitation || onCreateBotInvitation) && (
              <>
                <ToggleButtonGroup
                  exclusive
                  size='small'
                  color='primary'
                  value={memberType}
                  onChange={(_, value) => setMemberType(value)}
                >
                  <ToggleButton value={MemberType.ONLINE} title='New invitation'>
                    <NewIcon />
                  </ToggleButton>
                  {/* TODO(burdon): Address book for offline invitations. */}
                  {onCreateOfflineInvitation && (
                    <ToggleButton value={MemberType.OFFLINE} title='Addresss book'>
                      <AddressIcon />
                    </ToggleButton>
                  )}
                  {onCreateBotInvitation && (
                    <ToggleButton value={MemberType.BOT} title='Bot registry'>
                      <BotIcon />
                    </ToggleButton>
                  )}
                </ToggleButtonGroup>

                <Box sx={{ flex: 1, paddingLeft: 3, paddingRight: 3 }}>
                  {memberType === MemberType.BOT && <SpawnBotPanel onSelect={(resource) => setBot(resource)} />}
                </Box>
              </>
            )}

            <Button disabled={!active} onClick={handleInvitation}>
              {memberType === MemberType.ONLINE ? 'Create invitation' : 'Send invitation'}
            </Button>
          </Box>

          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              maxHeight: 8 * 40,
              overflow: 'auto'
            }}
          >
            {/* Users */}
            {invitations.map((invitation, i) => (
              <PendingInvitation
                key={i}
                invitation={invitation}
                createUrl={createUrl}
                onCancel={() => onCancelInvitation(invitation)}
              />
            ))}

            {/* Members */}
            {members.map((member, i) => (
              <MemberRow key={i} member={member} />
            ))}
          </Box>
        </>
      }
      actions={<Button onClick={onClose}>Close</Button>}
    />
  );
};
