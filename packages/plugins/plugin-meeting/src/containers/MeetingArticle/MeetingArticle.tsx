//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { Surface, useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, Ref } from '@dxos/echo';
import { Call, CallsCapabilities } from '@dxos/plugin-calls/types';
import { useObject } from '@dxos/react-client/echo';
import { Panel, useTranslation } from '@dxos/react-ui';
import { Menu, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import { Text } from '@dxos/schema';
import { Transcript } from '@dxos/types';

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
 * area that renders the selected component as a section surface.
 */
export const MeetingArticle = ({ role, subject: meeting, attendableId }: MeetingArticleProps) => {
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
  const call = meeting.call?.target;

  const [notes2] = useObject<Text.Text>(meeting.notes);
  const [transcript2] = useObject<Transcript.Transcript>(meeting.transcript);
  const [summary2] = useObject<Text.Text>(meeting.summary);
  const [call2] = useObject<Call.Call>(meeting.call);

  const hasSummary = !!summary && summary.content.length > 0;

  const handleGenerateSummary = useCallback(async () => {
    await invokePromise(MeetingOperation.Summarize, { meeting });
  }, [invokePromise, meeting]);

  // TODO(burdon): Change to create call?
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
        .subgraph((b) =>
          b.group(
            'more',
            // TODO(burdon): Factor out common menu.
            {
              label: ['event-toolbar-more.menu', { ns: meta.id }],
              icon: 'ph--dots-three-vertical--regular',
              iconOnly: true,
              variant: 'dropdownMenu',
              caretDown: false,
            },
            (group) => [
              group.action(
                'start-call',
                {
                  label: ['start-call.label', { ns: meta.id }],
                  icon: 'ph--phone-call--regular',
                },
                handleStartCall,
              ),
              group.action(
                'generate-summary',
                {
                  label: [hasSummary ? 'regenerate-summary.label' : 'generate-summary.label', { ns: meta.id }],
                  icon: 'ph--book-open-text--regular',
                },
                handleGenerateSummary,
              ),
            ],
          ),
        )
        .build(),
    [tab, hasSummary, transportProvider, handleGenerateSummary, handleStartCall],
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
        return call ? { subject: call, attendableId } : undefined;
    }
  }, [tab, attendableId, notes, transcript, summary, hasSummary, call]);

  return (
    <Panel.Root role={role}>
      <Menu.Root {...menuActions} attendableId={attendableId}>
        <Panel.Toolbar asChild>
          <Menu.Toolbar />
        </Panel.Toolbar>
      </Menu.Root>
      {data && (
        <Panel.Content>
          <Surface.Surface type={AppSurface.Article} data={data} limit={1} />
        </Panel.Content>
      )}
    </Panel.Root>
  );
};
