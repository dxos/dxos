//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';

import { Document } from '@braneframe/types';
import { Button, useTranslation, Toast } from '@dxos/aurora';
import { CancellableInvitationObservable, Invitation, PublicKey, ShellLayout, Space } from '@dxos/client';
import { useTelemetry } from '@dxos/react-appkit';
import { useIdentity, useInvitationStatus, useSpaceInvitations } from '@dxos/react-client';
import { useShell } from '@dxos/react-shell';

import { MarkdownDocument } from '../_MarkdownDocument';
import { EditorViewState } from '../props';

const InvitationToast = ({
  invitation,
  spaceKey,
}: {
  invitation: CancellableInvitationObservable;
  spaceKey: PublicKey;
}) => {
  const { status } = useInvitationStatus(invitation);
  const shell = useShell();
  const { t } = useTranslation('composer');
  const handleViewInvitations = async () => shell.setLayout(ShellLayout.SPACE_INVITATIONS, { spaceKey });
  return status === Invitation.State.READY_FOR_AUTHENTICATION ? (
    <Toast.Root defaultOpen>
      <Toast.Body>
        <Toast.Title>{t('invitation ready for auth code message')}</Toast.Title>
      </Toast.Body>
      <Toast.Actions>
        <Toast.Action altText='View' asChild>
          <Button onClick={handleViewInvitations}>{t('view invitations label')}</Button>
        </Toast.Action>
      </Toast.Actions>
    </Toast.Root>
  ) : null;
};

export const StandaloneMain = ({ data }: { data: [Space, Document] }) => {
  const [space, document]: [Space, Document] = data;

  // TODO(wittjosiah): Settings to disable telemetry, sync from HALO?
  useTelemetry({ namespace: 'composer-app' });
  useIdentity({ login: true });

  const invitations = useSpaceInvitations(space?.key);

  const [editorViewState, setEditorViewState] = useState<EditorViewState>('editor');

  return (
    <>
      <MarkdownDocument {...{ space, document, layout: 'standalone', editorViewState, setEditorViewState }} />
      {space &&
        invitations.map((invitation) => {
          return <InvitationToast invitation={invitation} spaceKey={space.key} key={invitation.get().invitationId} />;
        })}
    </>
  );
};
