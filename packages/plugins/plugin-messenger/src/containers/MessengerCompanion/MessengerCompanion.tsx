//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useCallback } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as EffectEx from '@dxos/effect/EffectEx';
import { log } from '@dxos/log';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import { type Message } from '@dxos/types';

import { type InvitationRenderer, NotificationsPanel } from '#components';
import { loadLink } from '#materializer';
import { MESSENGER_COMPANION, meta } from '#meta';
import { MessengerCapabilities } from '#types';

const renderInvitation: InvitationRenderer = ({ data, sender }) => (
  <Surface.Surface type={AppSurface.SpaceInvitation} data={{ ...data, sender }} limit={1} />
);

/**
 * The notifications deck companion: binds the panel to the default space's container, renders
 * invitations through plugin-client's surface, and opens a message's first linked object.
 */
export type MessengerCompanionProps = {
  /** The companion's graph node id, which the deck passes as the surface's `id`. */
  attendableId?: string;
};

export const MessengerCompanion = ({ attendableId }: MessengerCompanionProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const { invokePromise } = Hooks.useOperationInvoker();
  const client = Hooks.useCapability(ClientCapabilities.Client);
  const containers = Hooks.useOptionalAtomCapability(MessengerCapabilities.NotificationsContainers);
  const inboxStatus = UiHooks.useMulticastObservable(client.halo.inbox.status);

  const handleOpen = useCallback(
    (message: Message.Message) => {
      const ref = message.attachments?.[0]?.ref;
      if (!ref) {
        return;
      }

      void EffectEx.runPromise(
        loadLink(client, ref).pipe(
          Effect.flatMap((object) =>
            Effect.promise(() =>
              invokePromise(LayoutOperation.Open, { subject: [GraphPath.getObjectPathFromObject(object)] }),
            ),
          ),
        ),
      ).catch((error) => log.warn('failed to open notification link', { error }));
    },
    [client, invokePromise],
  );

  if (!containers || containers.length === 0) {
    return (
      <Panel.Root>
        <Panel.Body asChild>
          <Layout.Flex center classNames='text-fg-subtle' role='status'>
            {t(inboxStatus === 'account-required' ? 'account-required.message' : 'empty.message')}
          </Layout.Flex>
        </Panel.Body>
      </Panel.Root>
    );
  }

  return (
    <NotificationsPanel
      role={AppSurface.deckCompanion(MESSENGER_COMPANION).role}
      attendableId={attendableId}
      containers={containers}
      renderInvitation={renderInvitation}
      onOpen={handleOpen}
      inboxStatus={inboxStatus}
    />
  );
};

MessengerCompanion.displayName = 'MessengerCompanion';
