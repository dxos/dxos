//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { Surface, useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, Ref } from '@dxos/echo';
import { Call, CallsCapabilities } from '@dxos/plugin-calls/types';
import { Panel, useTranslation } from '@dxos/react-ui';
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
  // The built-in Cloudflare transport provider owns the persisted reconnection config and the
  // live join. Present only when plugin-calls is registered; the call action is hidden otherwise.
  const transportProvider = useCapabilities(CallsCapabilities.CallTransportProvider).find(
    (provider) => provider.kind === Call.CLOUDFLARE_TRANSPORT_KIND,
  );

  const notes = meeting.notes?.target;
  const transcript = meeting.transcript?.target;
  const summary = meeting.summary?.target;
  const hasSummary = !!summary && summary.content.length > 0;

  const handleGenerateSummary = useCallback(async () => {
    await invokePromise(MeetingOperation.Summarize, { meeting });
  }, [invokePromise, meeting]);

  // Provision (once) and join the meeting's live call. The room id is derived from the meeting DXN
  // so it is stable and resumable. The transport provider owns the persisted reconnection config
  // and the live join.
  const handleStartCall = useCallback(async () => {
    if (!transportProvider) {
      return;
    }
    const db = Obj.getDatabase(meeting);
    if (!db) {
      return;
    }
    const roomId = Obj.getURI(meeting);
    // Reuse the existing call when present; `Ref.load()` resolves to `AnyEntity`, so narrow it back to
    // `Call` (rather than casting) before handing it to the transport.
    const existing = await meeting.call?.load();
    if (existing && Obj.instanceOf(Call.Call, existing)) {
      await transportProvider.join(existing);
      return;
    }

    const config = transportProvider.makeConfig(roomId);
    db.add(config);
    const call = Call.make({
      name: meeting.name,
      transport: { kind: transportProvider.kind, config: Ref.make(config) },
    });
    db.add(call);
    Obj.update(meeting, (meeting) => {
      meeting.call = Ref.make(call);
    });
    await transportProvider.join(call);
  }, [transportProvider, meeting]);

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
        .subgraph(
          !!transportProvider &&
            ((builder) =>
              builder.action(
                'start-call',
                { label: ['start-call.label', { ns: meta.id }], icon: 'ph--phone-call--regular' },
                handleStartCall,
              )),
        )
        .action(
          'generate-summary',
          {
            label: [hasSummary ? 'regenerate-summary.label' : 'generate-summary.label', { ns: meta.id }],
            icon: 'ph--book-open-text--regular',
          },
          handleGenerateSummary,
        )
        .build(),
    [tab, hasSummary, handleGenerateSummary, transportProvider, handleStartCall],
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
      <Panel.Content>{data && <Surface.Surface type={AppSurface.Section} data={data} />}</Panel.Content>
    </Panel.Root>
  );
};
