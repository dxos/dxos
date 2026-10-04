//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { Surface, useOperationInvoker, useOptionalAtomCapability } from '@dxos/app-framework/ui';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { log } from '@dxos/log';
import { Flex, Panel, useTranslation } from '@dxos/react-ui';
import { type Message } from '@dxos/types';

import { type InvitationRenderer, NotificationsPanel } from '#components';
import { meta } from '#meta';
import { MESSENGER_COMPANION, MessengerCapabilities } from '#types';

const renderInvitation: InvitationRenderer = ({ data, sender }) => (
  <Surface.Surface type={AppSurface.SpaceInvitation} data={{ ...data, sender }} limit={1} />
);

/**
 * The notifications deck companion: binds the panel to the default space's container, renders
 * invitations through plugin-client's surface, and opens a message's first linked object.
 */
export const MessengerCompanion = () => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();
  const notifications = useOptionalAtomCapability(MessengerCapabilities.NotificationsContainer);

  const handleOpen = useCallback(
    (message: Message.Message) => {
      const ref = message.attachments?.[0]?.ref;
      if (!ref) {
        return;
      }

      void ref
        .load()
        .then((object) => invokePromise(LayoutOperation.Open, { subject: [GraphPath.getObjectPathFromObject(object)] }))
        .catch((error) => log.warn('failed to open notification link', { error }));
    },
    [invokePromise],
  );

  if (!notifications) {
    return (
      <Panel.Root>
        <Panel.Body>
          <Flex center classNames='h-full text-fg-subtle' role='status'>
            {t('empty.message')}
          </Flex>
        </Panel.Body>
      </Panel.Root>
    );
  }

  return (
    <NotificationsPanel
      role={AppSurface.deckCompanion(MESSENGER_COMPANION).role}
      notifications={notifications}
      renderInvitation={renderInvitation}
      onOpen={handleOpen}
    />
  );
};

MessengerCompanion.displayName = 'MessengerCompanion';
