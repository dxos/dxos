//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import { Capabilities } from '@dxos/app-framework';
import { useCapability, useOperationInvoker, useOptionalCapability, usePluginManager } from '@dxos/app-framework/ui';
import { AppCapabilities } from '@dxos/app-toolkit';
import { useAppGraph, useShowItem } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { Attention } from '@dxos/react-ui-attention';

import { InboxCapabilities, type Mailbox, type SystemTags } from '#types';

import { type MailboxController, createMailboxController } from './mailbox-controller';

export type UseMailboxControllerOptions = {
  mailbox: Mailbox.Mailbox;
  systemTag?: SystemTags.SystemTagId;
  filterProp?: string;
  attendableId?: string;
};

/**
 * The React↔controller bridge: resolves capabilities (components must not resolve them deeper
 * down), constructs the controller once per mailbox/view identity, and leaves `anchors`/`slots`
 * for the template to fill via ref callbacks and slot renderers.
 */
export const useMailboxController = ({
  mailbox,
  systemTag,
  filterProp,
  attendableId,
}: UseMailboxControllerOptions): MailboxController => {
  const registry = useCapability(Capabilities.AtomRegistry);
  const invoker = useOperationInvoker();
  const settings = useCapability(InboxCapabilities.Settings);
  const manager = usePluginManager();
  const { graph } = useAppGraph();
  const showItem = useShowItem();
  const progressRegistry = useOptionalCapability(AppCapabilities.ProgressRegistry);

  return useMemo(
    () =>
      createMailboxController({
        registry,
        mailbox,
        systemTag,
        filterProp,
        attendableId,
        invoker,
        graph,
        settings,
        extractors: manager.capabilities.atom(InboxCapabilities.ObjectExtractor),
        injectedActions: manager.capabilities.atom(InboxCapabilities.MailboxAction),
        openTopic: (projectId) => {
          void showItem({
            contextId: attendableId ?? Obj.getURI(mailbox).toString(),
            selectionId: projectId,
            companion: Attention.linkedSegment('topic'),
          });
        },
        progressRegistry,
        anchors: {},
        slots: {},
      }),
    [
      registry,
      mailbox,
      systemTag,
      filterProp,
      attendableId,
      invoker,
      graph,
      settings,
      manager,
      showItem,
      progressRegistry,
    ],
  );
};
