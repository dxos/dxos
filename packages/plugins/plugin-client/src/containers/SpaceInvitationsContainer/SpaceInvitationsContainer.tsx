//
// Copyright 2026 DXOS.org
//

import React, { useMemo, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { log } from '@dxos/log';
import { useClient } from '@dxos/react-client';
import { useSpaces } from '@dxos/react-client/echo';
import { useContacts, useInboxNotices } from '@dxos/react-client/halo';
import { useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
import { type SpaceInvitationEntry, SpaceInvitationList } from '@dxos/shell/react';

import { meta } from '#meta';

import { filterSpaceInvitations, joinSpaceInvitation } from '../../inbox/index.ts';

export const SpaceInvitationsContainer = () => {
  const { t } = useTranslation(meta.profile.key);
  const client = useClient();
  const invoker = useOperationInvoker();
  const notices = useInboxNotices();
  const contacts = useContacts();
  const spaces = useSpaces();
  const [pending, setPending] = useState<string[]>([]);
  const invitations = useMemo(
    (): SpaceInvitationEntry[] =>
      filterSpaceInvitations(
        notices,
        contacts,
        spaces.map((space) => space.key),
      ),
    [notices, contacts, spaces],
  );

  const track = (invitation: SpaceInvitationEntry, action: () => Promise<unknown>) => {
    setPending((ids) => [...ids, invitation.id]);
    void action()
      .catch((error) => log.warn('space invitation action failed', { error }))
      .finally(() => setPending((ids) => ids.filter((id) => id !== invitation.id)));
  };

  const handleJoin = (invitation: SpaceInvitationEntry) =>
    track(invitation, () => joinSpaceInvitation(invoker, client.halo.inbox, invitation.spaceKey));

  const handleDismiss = (invitation: SpaceInvitationEntry) =>
    track(invitation, () => client.halo.inbox.ack([invitation.id]));

  return (
    <Form.Root variant='settings'>
      <Form.Viewport scroll>
        <Form.Content>
          <Form.FieldSet label={t('space-invitations.label')} description={t('space-invitations.description')}>
            <SpaceInvitationList
              invitations={invitations}
              pending={pending}
              onJoin={handleJoin}
              onDismiss={handleDismiss}
            />
          </Form.FieldSet>
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};
