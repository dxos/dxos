//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { Filter, Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { Granola } from '@dxos/plugin-granola/types';
import { Markdown } from '@dxos/plugin-markdown/types';
import { useQuery } from '@dxos/react-client/echo';
import { Button, Icon, Panel, ScrollArea, Toolbar } from '@dxos/react-ui';

import { Demo } from '#types';

export type DemoPanelProps = {
  role: string;
  subject: Demo.DemoController;
};

/** Canned Granola notes for the software-team demo narrative. */
const GRANOLA_FIXTURES: { title: string; summary: string; attendees: string[] }[] = [
  {
    title: 'Sprint Planning — Widgets Team',
    summary: [
      '## Meeting summary',
      '',
      '- Alice walked through the Q2 roadmap.',
      '- Bob raised the **color picker redesign**: the current UX is confusing for colorblind users.',
      '  - Agreed to ship a hue/saturation split with a preview swatch.',
      '- Dana flagged the **widget dragging bug**: drop targets flicker on slow machines.',
      '  - Assigning to Bob, should be a quick fix.',
      '- Touched on the auth provider migration — parking until next sprint.',
      '',
      '## Action items',
      '- [ ] Bob to draft color picker spec by Wednesday.',
      '- [ ] Dana to file repro for dragging bug.',
    ].join('\n'),
    attendees: ['Alice Chen', 'Bob Kaur', 'Dana Rivera'],
  },
  {
    title: 'Design 1:1 — Color Picker Redesign',
    summary: [
      '## Follow-up to sprint planning',
      '',
      'Worked through the **color picker** flow with the design team.',
      '',
      '- Settled on HSL sliders with live preview.',
      '- Need to test against the existing accessibility audit.',
      '- Bob will spike a prototype in Figma; review Thursday.',
    ].join('\n'),
    attendees: ['Alice Chen', 'Bob Kaur'],
  },
];

let fixtureIndex = 0;

export const DemoPanel = ({ role, subject: controller }: DemoPanelProps) => {
  const db = Obj.getDatabase(controller);
  const events: Demo.DemoEvent[] = useQuery(db!, Filter.type(Demo.DemoEvent));
  const [busy, setBusy] = useState(false);

  const emit = useCallback(
    async (kind: string, label: string, payload?: unknown) => {
      if (!db) {
        return;
      }
      setBusy(true);
      try {
        db.add(Demo.makeEvent({ kind, label, payload }));
        log.info('demo: event emitted', { kind, label });
      } finally {
        setBusy(false);
      }
    },
    [db],
  );

  const handleGranolaNote = useCallback(async () => {
    if (!db) {
      return;
    }
    setBusy(true);
    try {
      const fixture = GRANOLA_FIXTURES[fixtureIndex % GRANOLA_FIXTURES.length];
      fixtureIndex += 1;
      const granolaId = `demo-${Date.now()}`;
      const doc = db.add(Markdown.make({ name: fixture.title, content: fixture.summary }));
      db.add(
        Obj.make(Granola.GranolaSyncRecord, {
          granolaId,
          document: Ref.make(doc),
          attendees: fixture.attendees.map((name) => ({ name })),
          calendarEvent: { title: fixture.title },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      );
      db.add(
        Demo.makeEvent({
          kind: 'granola-note',
          label: `Granola note arrived: ${fixture.title}`,
          payload: { granolaId, title: fixture.title },
        }),
      );
      log.info('demo: granola note injected', { granolaId, title: fixture.title });
    } finally {
      setBusy(false);
    }
  }, [db]);

  const handlePrMerged = useCallback(
    () =>
      emit('pr-merged', 'GitHub PR #123 merged: fix color picker bug', {
        number: 123,
        repo: 'widgets/widgets-app',
        title: 'fix color picker bug — honor HSL inputs in onChange',
        author: 'bob-kaur',
        mergedAt: new Date().toISOString(),
        relatedKeywords: ['color picker', 'hsl', 'picker'],
      }),
    [emit],
  );

  const handleSlackMessage = useCallback(
    () =>
      emit('slack-message', 'Slack: @alice — any update on the picker?', {
        channel: 'widgets-eng',
        from: 'bob-kaur',
        mentions: ['alice'],
        text: 'hey @alice — any update on the color picker redesign?',
      }),
    [emit],
  );

  const handleReset = useCallback(async () => {
    if (!db) {
      return;
    }
    setBusy(true);
    try {
      const allEvents = await db.query(Filter.type(Demo.DemoEvent)).run();
      for (const event of allEvents) {
        db.remove(event);
      }
      log.info('demo: events cleared', { count: allEvents.length });
    } finally {
      setBusy(false);
    }
  }, [db]);

  const recent = [...events].sort((a, b) => (b.emittedAt ?? '').localeCompare(a.emittedAt ?? '')).slice(0, 20);

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.Text>{controller.name ?? 'Demo Controls'}</Toolbar.Text>
          <Toolbar.Separator />
          <Toolbar.IconButton
            label='Reset demo events'
            icon='ph--arrow-counter-clockwise--regular'
            iconOnly
            disabled={busy || events.length === 0}
            onClick={handleReset}
          />
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content>
        <ScrollArea.Root orientation='vertical' padding>
          <ScrollArea.Viewport>
            <div className='flex flex-col gap-2 p-2'>
              <div className='text-xs text-subdued uppercase tracking-wider pt-2 pb-1'>Inject event</div>
              <Button disabled={busy} onClick={handleGranolaNote}>
                <Icon icon='ph--notebook--regular' size={4} />
                <span>Simulate Granola note arriving</span>
              </Button>
              <Button disabled={busy} onClick={handlePrMerged}>
                <Icon icon='ph--git-merge--regular' size={4} />
                <span>Simulate GitHub PR merged</span>
              </Button>
              <Button disabled={busy} onClick={handleSlackMessage}>
                <Icon icon='ph--chat-circle--regular' size={4} />
                <span>Simulate Slack message</span>
              </Button>

              <div className='text-xs text-subdued uppercase tracking-wider pt-4 pb-1'>
                Recent events ({events.length})
              </div>
              {recent.length === 0 && (
                <div className='text-sm text-subdued italic px-1'>no events yet — click a button above</div>
              )}
              {recent.map((event) => (
                <div
                  key={event.id}
                  className='flex gap-2 items-start border border-separator rounded p-2 text-sm'
                >
                  <Icon
                    icon={event.handled ? 'ph--check-circle--regular' : 'ph--lightning--regular'}
                    size={4}
                  />
                  <div className='flex-1'>
                    <div className='font-medium'>{event.label}</div>
                    <div className='text-xs text-subdued'>
                      {event.kind} · {event.emittedAt ? new Date(event.emittedAt).toLocaleTimeString() : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Content>
    </Panel.Root>
  );
};
