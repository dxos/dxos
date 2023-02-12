//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';
import urlJoin from 'url-join';

import { Face as NewIcon } from '@mui/icons-material';
import { Box, Button, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';

import { InvitationEncoder, Invitation, SpaceMember } from '@dxos/client';
import { Dialog } from '@dxos/react-components-deprecated';

import { MemberRow } from './MemberRow';
import { PendingInvitation } from './PendingInvitation';

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
  members?: SpaceMember[]; // TODO(rzadp): Support HALO members as well (different devices).
  invitations?: Invitation[];
  createUrl?: (invitation: Invitation) => string;
  onCreateInvitation: () => void;
  onCreateOfflineInvitation?: () => void; // TODO(burdon): Pass type/identityKey into onCreateInvitation.
  onCancelInvitation: (invitation: Invitation) => void;
  onClose?: () => void;
}

/**
 * Reusable sharing logic for inviting to a regular space and to a HALO space.
 * Not exported for the end user.
 * See SpaceSharingDialog and DeviceSharingDialog.
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
  onClose
}: SharingDialogProps) => {
  const [memberType, setMemberType] = useState(MemberType.ONLINE);

  const active = memberType === MemberType.ONLINE;

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
            {'Add collaborators to the space.'}
          </Typography>

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 3
            }}
          >
            {onCreateOfflineInvitation && (
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
                </ToggleButtonGroup>
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
