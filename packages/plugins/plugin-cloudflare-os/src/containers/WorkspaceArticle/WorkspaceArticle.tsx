//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Obj, Ref } from '@dxos/echo';
import { ActionToolbar, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import { useTranslation } from '@dxos/react-ui/Hooks';
import * as Panel from '@dxos/react-ui/Panel';
import * as Status from '@dxos/react-ui/Status';
import * as ToggleGroup from '@dxos/react-ui/ToggleGroup';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { GadgetFrame } from '#components';
import { CloudflareOs, CloudflareOsOperation } from '#types';

import { CloudflareOsNamespace } from '../../namespace.ts';
import { useWorkspace } from './useWorkspace.ts';

export type WorkspaceArticleProps = AppSurface.ObjectArticleProps<CloudflareOs.Workspace>;

/** The bound workspace: its gadgets as tabs, and the picked gadget running in its sandbox. */
export const WorkspaceArticle = ({ role, subject, attendableId }: WorkspaceArticleProps) => {
  const { t } = useTranslation(CloudflareOsNamespace.key);
  const { invokePromise } = Hooks.useOperationInvoker();
  const [selected, setSelected] = useState<number>();
  const { gadgets, gadgetId, error, jsCode, connect } = useWorkspace(subject, selected);
  const gadget = gadgets.find(({ id }) => id === gadgetId);

  const handleRefresh = useCallback(() => {
    void invokePromise?.(
      CloudflareOsOperation.RefreshWorkspace,
      { workspace: Ref.make(subject) },
      { spaceId: Obj.getDatabase(subject)?.spaceId },
    );
  }, [invokePromise, subject]);

  const menuActions = useMenuBuilder(
    () =>
      MenuBuilder.make()
        .action(
          'refresh',
          {
            label: ['refresh.label', { ns: CloudflareOsNamespace.key }],
            icon: 'ph--arrows-clockwise--regular',
            disposition: 'toolbar',
            testId: 'cloudflare-os.refresh',
          },
          () => handleRefresh(),
        )
        .build(),
    [handleRefresh],
  );

  return (
    <Panel.Root role={role}>
      <Panel.Header classNames='dx-expand flex'>
        <Toolbar.Root classNames='grow'>
          <Toolbar.ToggleGroup
            type='single'
            value={gadgetId === undefined ? '' : String(gadgetId)}
            onValueChange={(value: string) => value && setSelected(Number(value))}
          >
            {gadgets.map(({ id, title, chatId }) => (
              <ToggleGroup.Item
                key={id}
                value={String(id)}
                label={chatId === undefined ? title : t('pending-gadget.label', { title })}
                data-testid={`cloudflare-os.gadget.${id}`}
              />
            ))}
          </Toolbar.ToggleGroup>
        </Toolbar.Root>
        <ActionToolbar {...menuActions} attendableId={attendableId} />
      </Panel.Header>
      <Panel.Body classNames='flex flex-col'>
        {error ? (
          <Status.Empty icon='ph--warning--regular'>{error}</Status.Empty>
        ) : gadget === undefined ? (
          <Status.Empty icon='ph--cloud--regular'>{t('no-gadgets.message')}</Status.Empty>
        ) : jsCode === null ? (
          <Status.Empty>{t('no-gadget-ui.message')}</Status.Empty>
        ) : jsCode === undefined ? null : (
          <GadgetFrame key={gadget.id} jsCode={jsCode} title={gadget.title} onConnect={connect} />
        )}
      </Panel.Body>
    </Panel.Root>
  );
};

export default WorkspaceArticle;

WorkspaceArticle.displayName = 'WorkspaceArticle';
