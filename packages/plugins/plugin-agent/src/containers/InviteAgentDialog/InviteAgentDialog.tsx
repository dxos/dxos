//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import type * as Agent from '@dxos/assistant/Agent';
import { Obj, Ref } from '@dxos/echo';
import { type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { useSpaces } from '@dxos/react-client/echo';
import { SearchList, useSearchListResults } from '@dxos/react-ui-search';
import * as Dialog from '@dxos/react-ui/Dialog';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as SystemButton from '@dxos/react-ui/SystemButton';
import * as Theme from '@dxos/react-ui/Theme';

import { meta } from '#meta';
import { AgentOperation } from '#types';

const SPACE_ICON = 'ph--planet--regular';

export type InviteAgentDialogProps = {
  agent: Agent.Agent;
};

type SpaceItem = { id: SpaceId; label: string };

/**
 * Picks a space to invite the agent into. The agent joins it keeping its memory, and opens there, so the
 * conversation can carry on at once.
 */
export const InviteAgentDialog = ({ agent }: InviteAgentDialogProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const { invokePromise } = Hooks.useOperationInvoker();
  const spaces = useSpaces();
  const [pending, setPending] = useState(false);
  const here = Obj.getDatabase(agent)?.spaceId;

  const items = useMemo<SpaceItem[]>(
    () =>
      spaces
        .filter((space) => space.id !== here && AppSpace.isVisibleSpace(space))
        .map((space) => ({
          id: space.id,
          label: space.properties.name || Theme.toLocalizedString(['unnamed-space.label', { ns: meta.profile.key }], t),
        }))
        .sort((left, right) => left.label.localeCompare(right.label)),
    [spaces, here, t],
  );
  const { results, handleSearch } = useSearchListResults({ items, extract: (item) => item.label });

  const handleSelect = useCallback(
    async (spaceId: SpaceId) => {
      setPending(true);
      const { data, error } = await invokePromise(AgentOperation.InviteAgent, { agent: Ref.make(agent) }, { spaceId });
      // The returned ref crossed the operation boundary without a resolver, so it is re-made on the space.
      const db = spaces.find((space) => space.id === spaceId)?.db;
      const invited =
        data && db
          ? await db
              .makeRef<Agent.Agent>(data.agent.uri)
              .tryLoad()
              .catch(() => undefined)
          : undefined;
      if (!invited) {
        // Stays open, so another space can be picked, or the dialog dismissed knowing nothing changed.
        log.warn('failed to invite agent', { error });
        setPending(false);
        await invokePromise(LayoutOperation.AddToast, {
          id: `${meta.profile.key}.invite-agent-failed`,
          icon: 'ph--warning--regular',
          title: ['invite-agent-failed.title', { ns: meta.profile.key }],
          description: error?.message,
        });
        return;
      }

      await invokePromise(LayoutOperation.UpdateDialog, { state: false });
      await invokePromise(LayoutOperation.Open, {
        subject: [GraphPath.getObjectPathFromObject(invited)],
        workspace: GraphPath.getSpacePath(spaceId),
        navigation: 'immediate',
      });
    },
    [invokePromise, agent, spaces],
  );

  return (
    <Dialog.Content data-testid='agent.invite-dialog'>
      <Dialog.Header>
        <Dialog.Title>{t('invite-agent-dialog.title', { name: agent.name || t('new-agent.name') })}</Dialog.Title>
        <Dialog.CloseTrigger asChild>
          <SystemButton.Close />
        </Dialog.CloseTrigger>
      </Dialog.Header>
      <Dialog.Body>
        <p className='pb-2 text-description'>{t('invite-agent-dialog.description')}</p>
        <SearchList.Root onSearch={handleSearch} resetSelectionOnChange>
          <SearchList.Input
            classNames='px-0'
            autoFocus
            escapeBehavior='dismiss'
            placeholder={t('invite-agent-dialog.placeholder')}
            {...{ [Dialog.DIALOG_AUTOFOCUS_ATTRIBUTE]: '' }}
          />
          <SearchList.Viewport classNames='max-h-[24rem]'>
            {results.length === 0 && <SearchList.Empty />}
            {results.map((item) => (
              <SearchList.Item
                key={item.id}
                value={item.id}
                label={item.label}
                icon={SPACE_ICON}
                disabled={pending}
                onSelect={() => void handleSelect(item.id)}
              />
            ))}
          </SearchList.Viewport>
        </SearchList.Root>
      </Dialog.Body>
    </Dialog.Content>
  );
};

InviteAgentDialog.displayName = 'InviteAgentDialog';
