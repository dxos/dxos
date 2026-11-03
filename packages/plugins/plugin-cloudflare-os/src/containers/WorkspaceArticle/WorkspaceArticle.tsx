//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Obj, Ref } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import * as Button from '@dxos/react-ui/Button';
import { useTranslation } from '@dxos/react-ui/Hooks';
import * as Panel from '@dxos/react-ui/Panel';
import * as ToggleGroup from '@dxos/react-ui/ToggleGroup';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { GadgetFrame } from '#components';
import { CloudflareOs, CloudflareOsOperation } from '#types';

import { CloudflareOsNamespace } from '../../namespace.ts';
import { useWorkspace } from './useWorkspace.ts';

export type WorkspaceArticleProps = AppSurface.ObjectArticleProps<CloudflareOs.Workspace>;

/** The bound workspace: its gadgets as tabs, and the picked gadget running in its sandbox. */
export const WorkspaceArticle = ({ role, subject }: WorkspaceArticleProps) => {
  const { t } = useTranslation(CloudflareOsNamespace.key);
  const { invokePromise } = Hooks.useOperationInvoker();
  const [workspace] = useObject(subject);
  const [selected, setSelected] = useState<number>();
  const { gadgets, error, jsCode, connect } = useWorkspace(subject, selected ?? workspace.gadgets?.[0]?.id);
  const gadgetId = selected ?? gadgets[0]?.id;
  const gadget = gadgets.find(({ id }) => id === gadgetId);

  const handleRefresh = useCallback(() => {
    void invokePromise?.(
      CloudflareOsOperation.RefreshWorkspace,
      { workspace: Ref.make(subject) },
      { spaceId: Obj.getDatabase(subject)?.spaceId },
    );
  }, [invokePromise, subject]);

  return (
    <Panel.Root role={role}>
      <Panel.Header classNames='dx-expand'>
        <Toolbar.Root>
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
          <div className='grow' />
          <Button.Root variant='ghost' onClick={handleRefresh} data-testid='cloudflare-os.refresh'>
            {t('refresh.label')}
          </Button.Root>
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body classNames='flex flex-col'>
        {error ? (
          <p className='p-4 text-description'>{error}</p>
        ) : gadget === undefined ? (
          <p className='p-4 text-description'>{t('no-gadgets.message')}</p>
        ) : jsCode === null ? (
          <p className='p-4 text-description'>{t('no-gadget-ui.message')}</p>
        ) : jsCode === undefined ? null : (
          <GadgetFrame key={gadget.id} jsCode={jsCode} title={gadget.title} onConnect={connect} />
        )}
      </Panel.Body>
    </Panel.Root>
  );
};

export default WorkspaceArticle;

WorkspaceArticle.displayName = 'WorkspaceArticle';
