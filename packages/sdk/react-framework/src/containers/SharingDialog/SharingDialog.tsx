//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';
import urlJoin from 'url-join';

import { Box, Button, Popover } from '@mui/material';

import { InvitationRequest, Party, PartyMember } from '@dxos/client';
import { Dialog } from '@dxos/react-components';
import { Resource } from '@dxos/registry-client';

import { MemberRow } from './MemberRow';
import { PendingBotInvitation } from './PendingBotInvitation';
import { PendingInvitation } from './PendingInvitation';
import { SpawnBotPanel } from './SpawnBotPanel';

const defaultCreateUrl = (invitationCode: string) => {
  // TODO(burdon): By-pass keyhole with fake code.
  const kubeCode = [...new Array(6)].map(() => Math.floor(Math.random() * 10)).join('');
  const invitationPath = `/invitation/${invitationCode}`; // App-specific.
  const { origin, pathname } = window.location;
  return urlJoin(origin, pathname, `?code=${kubeCode}`, `/#${invitationPath}`);
};

export interface SharingDialogProps {
  open: boolean
  modal?: boolean
  party?: Party
  title: string
  members?: PartyMember[] // TODO(rzadp): Support HALO members as well (different devices).
  invitations?: InvitationRequest[]
  botInvitations?: any[]
  onCreateInvitation: () => (void | Promise<void>)
  onCreateBotInvitation?: (resource: Resource) => (void | Promise<void>)
  onCancelInvitation: (invitation: InvitationRequest) => void
  onClose?: () => void
  createUrl?: (invitationCode: string) => string
}

/**
 * Reusable sharing logic for inviting to a regular party and to a HALO party.
 * Not exported for the end user.
 * See PartySharingDialog and DeviceSharingDialog.
 */
export const SharingDialog = ({
  open,
  modal,
  party,
  title,
  members = [],
  invitations = [],
  botInvitations = [],
  createUrl = defaultCreateUrl,
  onCreateInvitation,
  onCreateBotInvitation,
  onCancelInvitation,
  onClose
}: SharingDialogProps) => {
  const [botPopover, setBotPopover] = useState<HTMLButtonElement | null>(null);

  return (
    <Dialog
      open={open}
      modal={modal}
      title={title}
      content={(
        <>
          <Box>
            <Button
              variant='outlined'
              onClick={onCreateInvitation}
            >
              Invite User
            </Button>

            {party && onCreateBotInvitation && (
              <>
                <Button
                  variant='outlined'
                  onClick={event => setBotPopover(event.currentTarget)}
                  sx={{ marginLeft: 1 }}
                >
                  Invite Bot
                </Button>
                <Popover
                  open={Boolean(botPopover)}
                  onClose={() => setBotPopover(null)}
                  anchorEl={botPopover}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left'
                  }}
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left'
                  }}
                >
                  <Box sx={{ width: 400, padding: 2 }}>
                    <SpawnBotPanel
                      party={party}
                      onClose={() => {
                        setTimeout(() => {
                          setBotPopover(null);
                        }, 500);
                      }}
                    />
                  </Box>
                </Popover>
              </>
            )}
          </Box>

          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            padding: 1,
            marginTop: 2,
            maxHeight: 8 * 40,
            overflow: 'auto'
          }}>
            {/* Users */}
            {invitations.map((invitation, i) => (
              <PendingInvitation
                key={i}
                invitationCode={invitation.descriptor.encode().toString()}
                pin={invitation.hasConnected ? invitation.secret.toString() : undefined}
                createUrl={createUrl}
                onCancel={() => onCancelInvitation(invitation)}
              />
            ))}

            {/* Bots */}
            {botInvitations.map((invitation, i) => (
              <PendingBotInvitation
                key={i}
                onCancel={() => onCancelInvitation(invitation)}
              />
            ))}

            {/* Members */}
            {members.map((member, i) => (
              <MemberRow
                key={i}
                member={member}
              />
            ))}
          </Box>
        </>
      )}
      actions={(
        <Button onClick={onClose}>Close</Button>
      )}
    />
  );
};
