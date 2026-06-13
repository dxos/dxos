//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { Surface, useOperationInvoker } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { IconButton, Panel, ScrollArea, useTranslation } from '@dxos/react-ui';
import { Menu, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';

import { meta } from '#meta';
import { type Meeting, MeetingOperation } from '#types';

type MeetingTab = 'notes' | 'transcript' | 'summary';

const TAB_ORDER: MeetingTab[] = ['notes', 'transcript', 'summary'];

const TAB_ICONS: Record<MeetingTab, string> = {
  notes: 'ph--note--regular',
  transcript: 'ph--subtitles--regular',
  summary: 'ph--list-bullets--regular',
};

export type MeetingArticleProps = AppSurface.ObjectArticleProps<Meeting.Meeting>;

/**
 * Hub view for a meeting: a toolbar of tabs (notes / transcript / summary) over a single content
 * area that renders the selected component as a section surface.
 */
export const MeetingArticle = ({ attendableId, role, subject: meeting }: MeetingArticleProps) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  const [tab, setTab] = useState<MeetingTab>('notes');

  const notes = meeting.notes?.target;
  const transcript = meeting.transcript?.target;
  const summary = meeting.summary?.target;
  const hasSummary = !!summary && summary.content.length > 0;

  const handleGenerateSummary = useCallback(async () => {
    await invokePromise(MeetingOperation.Summarize, { meeting });
  }, [invokePromise, meeting]);

  // Toolbar tabs (single-select toggle group) + a generate/regenerate-summary action.
  const menuActions = useMenuBuilder(
    () =>
      MenuBuilder.make()
        .root({ label: ['meeting-toolbar.menu', { ns: meta.id }] })
        .subgraph((builder) =>
          builder.group(
            'tab',
            {
              label: ['meeting-tabs.menu', { ns: meta.id }],
              iconOnly: true,
              variant: 'toggleGroup',
              selectCardinality: 'single',
              value: tab,
            },
            (group) => {
              for (const key of TAB_ORDER) {
                group.action(
                  key,
                  { label: [`${key}.label`, { ns: meta.id }], icon: TAB_ICONS[key], checked: tab === key },
                  () => setTab(key),
                );
              }
            },
          ),
        )
        .separator()
        .action(
          'generate-summary',
          {
            label: [hasSummary ? 'regenerate-summary.label' : 'generate-summary.label', { ns: meta.id }],
            icon: 'ph--book-open-text--regular',
          },
          handleGenerateSummary,
        )
        .build(),
    [tab, hasSummary, handleGenerateSummary],
  );

  const data = useMemo(() => {
    switch (tab) {
      case 'notes':
        return notes ? { attendableId, subject: notes } : undefined;
      case 'transcript':
        return transcript ? { attendableId, subject: transcript } : undefined;
      case 'summary':
        return hasSummary ? { attendableId, subject: summary } : undefined;
    }
  }, [tab, attendableId, notes, transcript, summary, hasSummary]);

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar>
        <Menu.Root {...menuActions} attendableId={attendableId}>
          <Menu.Toolbar />
        </Menu.Root>
      </Panel.Toolbar>
      <Panel.Content asChild>
        <ScrollArea.Root orientation='vertical'>
          <ScrollArea.Viewport>
            {data ? (
              <Surface.Surface type={AppSurface.Section} data={data} />
            ) : tab === 'summary' ? (
              <div className='grid place-items-center min-h-32'>
                <IconButton
                  icon='ph--book-open-text--regular'
                  label={t('generate-summary.label')}
                  onClick={handleGenerateSummary}
                />
              </div>
            ) : (
              <div className='grid place-items-center min-h-32 text-description'>{t(`${tab}.label`)}</div>
            )}
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Content>
    </Panel.Root>
  );
};
