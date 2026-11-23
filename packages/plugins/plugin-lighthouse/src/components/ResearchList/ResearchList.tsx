//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Status from '@dxos/react-ui/Status';
import { Tag } from '@dxos/react-ui/Tag';

import { meta } from '#meta';

import { type ResearchRow, STATE_HUE } from '../../model/research-list.ts';

export type ResearchListProps = {
  role?: string;
  rows: readonly ResearchRow[];
  /** The lighthouse connection is unreachable: rows keep their names, without status. */
  error?: string;
  onOpen?: (id: string) => void;
  onNew?: () => void;
};

const when = (iso: string | undefined) => {
  if (!iso) {
    return undefined;
  }
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? undefined
    : date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

/**
 * The space's Research, newest first, as lighthouse's session list shows them: name and goal, status, pages, cost and
 * when it started; New research starts one on its goal.
 */
export const ResearchList = ({ role, rows, error, onOpen, onNew }: ResearchListProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  return (
    <Panel.Root role={role} data-testid='lighthouse.research-list'>
      <Panel.Header>
        <Layout.Flex gap='sm' align='center' classNames='px-2 py-1 w-full'>
          <span className='grow font-medium'>{t('research-list.title', { count: rows.length })}</span>
          <Button.Root
            variant='primary'
            icon='ph--plus--regular'
            label={t('research-new.label')}
            onClick={onNew}
            data-testid='lighthouse.research-list.new'
          />
        </Layout.Flex>
      </Panel.Header>
      <Panel.Body asChild>
        <ScrollArea.Root orientation='vertical'>
          <ScrollArea.Viewport>
            {error && <div className='px-3 py-2 text-sm text-error-text'>{error}</div>}
            {rows.length === 0 ? (
              <Status.Empty classNames='p-8'>{t('research-list-empty.message')}</Status.Empty>
            ) : (
              <ul role='list' className='flex flex-col'>
                {rows.map((row) => (
                  <li key={row.id} className='border-b border-separator'>
                    <button
                      type='button'
                      className='w-full text-start px-3 py-2.5 hover:bg-hover-surface focus-visible:bg-hover-surface outline-none'
                      onClick={() => onOpen?.(row.id)}
                      data-testid='lighthouse.research-list.row'
                      data-state={row.state}
                    >
                      <Layout.Flex gap='sm' align='center'>
                        <span className='grow min-w-0 truncate font-medium'>
                          {row.name || t('object-name.placeholder', { ns: 'org.dxos.type.lighthouse.Research' })}
                        </span>
                        <Tag hue={STATE_HUE[row.state]}>{t(`research-state.${row.state}`)}</Tag>
                      </Layout.Flex>
                      {row.goal && row.goal !== row.name && (
                        <div className='text-sm text-fg-muted line-clamp-2'>{row.goal}</div>
                      )}
                      <Layout.Flex gap='md' classNames='text-xs text-fg-subtle tabular-nums mt-1'>
                        {row.pages !== undefined && <span>{t('research-list-pages.label', { count: row.pages })}</span>}
                        {row.usd !== undefined && <span>${row.usd.toFixed(3)}</span>}
                        {when(row.startedAt) && <span>{when(row.startedAt)}</span>}
                      </Layout.Flex>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Body>
    </Panel.Root>
  );
};
