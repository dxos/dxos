//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { Surface, useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { CallsCapabilities } from '@dxos/plugin-calls/types';
import { Panel, useTranslation } from '@dxos/react-ui';
import { Menu, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';

import { meta } from '#meta';
import { type Meeting, MeetingOperation } from '#types';

type MeetingTab = 'notes' | 'transcript' | 'summary' | 'call';

const TAB_ORDER: MeetingTab[] = ['notes', 'transcript', 'summary', 'call'];

const TAB_ICONS: Record<MeetingTab, string> = {
  notes: 'ph--note--regular',
  transcript: 'ph--subtitles--regular',
  summary: 'ph--list-bullets--regular',
  call: 'ph--phone-call--regular',
};

export type MeetingArticleProps = AppSurface.ObjectArticleProps<Meeting.Meeting>;

/**
 * Hub view for a meeting: a toolbar of tabs (notes / transcript / summary) over a single content
 * area that renders the selected component as an article surface.
 */
export const MeetingArticle = ({ role, subject: meeting, attendableId }: MeetingArticleProps) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  const [tab, setTab] = useState<MeetingTab>('notes');
  // The Call tab is offered only when the calls plugin contributes a transport provider.
  const callAvailable = useCapabilities(CallsCapabilities.CallTransportProvider).length > 0;
  const tabs = useMemo(() => (callAvailable ? TAB_ORDER : TAB_ORDER.filter((key) => key !== 'call')), [callAvailable]);

  // Read the reactive ref targets directly: these are handed to child surfaces (e.g. MarkdownArticle)
  // which call `useObject` themselves, so they must receive the live object, not a `useObject` snapshot.
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
              for (const key of tabs) {
                group.action(
                  key,
                  {
                    label: [`${key}.label`, { ns: meta.id }],
                    icon: TAB_ICONS[key],
                    checked: tab === key,
                  },
                  () => setTab(key),
                );
              }
            },
          ),
        )
        .separator()
        .menu('more', (group) => [
          group.action(
            'generate-summary',
            {
              label: [hasSummary ? 'regenerate-summary.label' : 'generate-summary.label', { ns: meta.id }],
              icon: 'ph--book-open-text--regular',
            },
            handleGenerateSummary,
          ),
        ])
        .build(),
    [tab, tabs, hasSummary, handleGenerateSummary],
  );

  const data = useMemo(() => {
    switch (tab) {
      case 'notes':
        return notes ? { subject: notes, attendableId } : undefined;
      case 'transcript':
        return transcript ? { subject: transcript, attendableId } : undefined;
      case 'summary':
        return hasSummary ? { subject: summary, attendableId } : undefined;
      case 'call':
        return callAvailable ? { roomId: Obj.getURI(meeting), attendableId } : undefined;
    }
  }, [tab, attendableId, notes, transcript, summary, hasSummary, callAvailable, meeting]);

  return (
    <Panel.Root role={role}>
      <Menu.Root {...menuActions} attendableId={attendableId}>
        <Panel.Toolbar asChild>
          <Menu.Toolbar />
        </Panel.Toolbar>
      </Menu.Root>
      {data && (
        <Panel.Content>
          {/* `role` (not `type`) because the call tab's data is keyed by `roomId`, not an ECHO subject. */}
          <Surface.Surface role='article' data={data} limit={1} />
        </Panel.Content>
      )}
    </Panel.Root>
  );
};
