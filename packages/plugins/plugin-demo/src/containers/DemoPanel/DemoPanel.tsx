//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useRef, useState } from 'react';

import { Filter, Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { Granola } from '@dxos/plugin-granola/types';
import { Markdown } from '@dxos/plugin-markdown/types';
import { Trello } from '@dxos/plugin-trello/types';
import { useQuery } from '@dxos/react-client/echo';
import { Button, Icon, Panel, ScrollArea, Toolbar } from '@dxos/react-ui';

import { bootstrapFromEnv, type BootstrapResult } from './bootstrap-from-env';
import { matchNoteToCards } from './match-cards';
import { pollMergedPullRequests } from './pr-poller';
import { seedSoftwareTeamFixture } from './seed-fixture';
import { postNudgeToSlack, readSlackPostConfig } from './slack-post';
import { Demo } from '#types';

const PR_POLL_INTERVAL_MS = 15_000;

/** Delay before running aiMatch on a newly-injected Granola note. Tuned so the viewer sees the note land before matches appear. */
const MATCH_DELAY_MS = 800;

/** Delay before the proactive Slack nudge fires on a pr-merged event. Same rationale — viewer sees the event land first. */
const NUDGE_DELAY_MS = 600;

type PrPayload = {
  number?: number;
  repo?: string;
  title?: string;
  author?: string;
  relatedKeywords?: readonly string[];
};

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
  const matches: Demo.DemoMatch[] = useQuery(db!, Filter.type(Demo.DemoMatch));
  const nudges: Demo.DemoNudge[] = useQuery(db!, Filter.type(Demo.DemoNudge));
  const syncRecords: Granola.GranolaSyncRecord[] = useQuery(db!, Filter.type(Granola.GranolaSyncRecord));
  const cards: Trello.TrelloCard[] = useQuery(db!, Filter.type(Trello.TrelloCard));
  const [busy, setBusy] = useState(false);
  const [lastBootstrap, setLastBootstrap] = useState<BootstrapResult | undefined>(undefined);
  const processedGranolaEventIds = useRef(new Set<string>());
  const processedPrEventIds = useRef(new Set<string>());

  // Autonomous matcher: whenever an unhandled `granola-note` event appears,
  // look up its sync record, run aiMatch against open Trello cards, and write
  // DemoMatch rows. The delay gives the viewer a beat to see the note land
  // before the links appear.
  useEffect(() => {
    if (!db) {
      return;
    }
    const unhandled = events.filter(
      (event) =>
        event.kind === 'granola-note' &&
        !event.handled &&
        !processedGranolaEventIds.current.has(event.id),
    );
    if (unhandled.length === 0) {
      return;
    }
    for (const event of unhandled) {
      processedGranolaEventIds.current.add(event.id);
    }

    const timer = setTimeout(async () => {
      for (const event of unhandled) {
        try {
          const payload = event.payload ? (JSON.parse(event.payload) as { granolaId?: string }) : {};
          const granolaId = payload.granolaId;
          const record = syncRecords.find((candidate) => candidate.granolaId === granolaId);
          if (!record) {
            log.info('demo: granola event has no sync record yet', { granolaId });
            continue;
          }
          const document = record.document?.target;
          const cardMatches = await matchNoteToCards({ record, document, cards });
          if (document) {
            for (const match of cardMatches) {
              const card = cards.find((candidate) => candidate.id === match.cardId);
              if (!card) {
                continue;
              }
              db.add(
                Obj.make(Demo.DemoMatch, {
                  document: Ref.make(document),
                  card: Ref.make(card),
                  confidence: match.confidence,
                  reasoning: match.reasoning,
                  source: match.source,
                  createdAt: new Date().toISOString(),
                }),
              );
            }
          }
          Obj.change(event, (mutable) => {
            mutable.handled = true;
          });
          log.info('demo: wrote matches', {
            granolaId,
            matches: cardMatches.length,
            via: cardMatches[0]?.source ?? 'none',
          });
        } catch (err) {
          log.warn('demo: match loop failed', { error: String(err) });
        }
      }
    }, MATCH_DELAY_MS);

    return () => clearTimeout(timer);
  }, [db, events, syncRecords, cards]);

  // Proactive nudge: on each unhandled `pr-merged` event, find which Trello
  // card the PR relates to (via keyword overlap with the card name/description
  // plus any DemoMatch already linking the card to a recent meeting), then
  // write a DemoNudge describing the Slack message the agent would send.
  useEffect(() => {
    if (!db) {
      return;
    }
    const unhandled = events.filter(
      (event) =>
        event.kind === 'pr-merged' &&
        !event.handled &&
        !processedPrEventIds.current.has(event.id),
    );
    if (unhandled.length === 0) {
      return;
    }
    for (const event of unhandled) {
      processedPrEventIds.current.add(event.id);
    }

    const timer = setTimeout(async () => {
      for (const event of unhandled) {
        try {
          const payload: PrPayload = event.payload ? JSON.parse(event.payload) : {};
          const keywords = (payload.relatedKeywords ?? []).map((kw) => kw.toLowerCase());
          const relevantCard = cards.find((card) => {
            if (card.closed) {
              return false;
            }
            const haystack = `${card.name ?? ''} ${card.description ?? ''}`.toLowerCase();
            return keywords.some((keyword) => haystack.includes(keyword));
          });
          if (!relevantCard) {
            log.info('demo: pr-merged had no matching card', { keywords });
            Obj.change(event, (mutable) => {
              mutable.handled = true;
            });
            continue;
          }
          const linkedMatch = matches
            .filter((match) => match.card?.target?.id === relevantCard.id)
            .sort((first, second) => (second.createdAt ?? '').localeCompare(first.createdAt ?? ''))[0];
          const meetingContext = linkedMatch?.document?.target?.name;

          const lines: string[] = [];
          lines.push(
            `Hey @alice — the fix you ${
              meetingContext ? `discussed in "${meetingContext}"` : 'have been tracking'
            } just shipped.`,
          );
          lines.push('');
          if (payload.title) {
            lines.push(`• **PR ${payload.number ? `#${payload.number} ` : ''}**${payload.title}`);
          }
          if (payload.author) {
            lines.push(`• author: @${payload.author}`);
          }
          lines.push('');
          lines.push(
            `The card "${relevantCard.name}" is still in "${relevantCard.listName ?? 'your board'}" — want me to move it to Done?`,
          );

          db.add(
            Obj.make(Demo.DemoNudge, {
              channel: 'widgets-eng',
              mention: 'alice',
              text: lines.join('\n'),
              card: Ref.make(relevantCard),
              emittedAt: new Date().toISOString(),
              posted: false,
            }),
          );
          Obj.change(event, (mutable) => {
            mutable.handled = true;
          });
          log.info('demo: nudge emitted', { cardId: relevantCard.id, pr: payload.number });
        } catch (err) {
          log.warn('demo: nudge loop failed', { error: String(err) });
        }
      }
    }, NUDGE_DELAY_MS);

    return () => clearTimeout(timer);
  }, [db, events, cards, matches]);

  // Live-Slack poster: when DEMO_LIVE_SLACK=true, post each unposted nudge to
  // real Slack and flip `posted` on success. Runs after the nudge emitter so
  // both steps are visible in the panel.
  const postedNudgeIds = useRef(new Set<string>());
  useEffect(() => {
    const config = readSlackPostConfig();
    if (!config) {
      return;
    }
    const pending = nudges.filter(
      (nudge) => !nudge.posted && !postedNudgeIds.current.has(nudge.id),
    );
    if (pending.length === 0) {
      return;
    }
    for (const nudge of pending) {
      postedNudgeIds.current.add(nudge.id);
    }
    void (async () => {
      for (const nudge of pending) {
        try {
          await postNudgeToSlack(config, nudge.text);
          Obj.change(nudge, (mutable) => {
            mutable.posted = true;
          });
          log.info('demo: nudge posted to slack', { id: nudge.id, channel: config.channel });
        } catch (err) {
          log.warn('demo: slack post failed', { id: nudge.id, error: String(err) });
        }
      }
    })();
  }, [nudges]);

  // PR poller: when GITHUB_PAT + GITHUB_REPO are in localStorage, poll for
  // newly-merged PRs every 15s. The poller upserts GitHubPullRequest objects
  // and emits a DemoEvent (kind=pr-merged) on each transition from
  // not-merged → merged, which the nudge observer above converts into a
  // DemoNudge.
  useEffect(() => {
    if (!db) {
      return;
    }
    const pat = globalThis.localStorage?.getItem('GITHUB_PAT') ?? '';
    const repo = globalThis.localStorage?.getItem('GITHUB_REPO') ?? '';
    if (!pat || !repo) {
      return;
    }
    let cancelled = false;

    const tick = async () => {
      if (cancelled) {
        return;
      }
      try {
        await pollMergedPullRequests(db, { pat, repo });
      } catch (err) {
        log.info('demo: pr-poller tick failed', { error: String(err) });
      }
    };

    void tick();
    const handle = setInterval(tick, PR_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(handle);
    };
  }, [db]);

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

  const handleBootstrap = useCallback(async () => {
    if (!db) {
      return;
    }
    setBusy(true);
    try {
      const result = await bootstrapFromEnv(db);
      setLastBootstrap(result);
      (globalThis as any).__dxosDemoReady = true;
      if (typeof globalThis.document !== 'undefined') {
        globalThis.document.body.setAttribute('data-demo-ready', 'true');
      }
    } finally {
      setBusy(false);
    }
  }, [db]);

  const handleSeed = useCallback(async () => {
    if (!db) {
      return;
    }
    setBusy(true);
    try {
      const result = await seedSoftwareTeamFixture(db);
      if (result.alreadySeeded) {
        log.info('demo: fixture already present — skipping');
      }
    } finally {
      setBusy(false);
    }
  }, [db]);

  const handleReset = useCallback(async () => {
    if (!db) {
      return;
    }
    setBusy(true);
    try {
      const allEvents = await db.query(Filter.type(Demo.DemoEvent)).run();
      const allMatches = await db.query(Filter.type(Demo.DemoMatch)).run();
      const allNudges = await db.query(Filter.type(Demo.DemoNudge)).run();
      for (const event of allEvents) {
        db.remove(event);
      }
      for (const match of allMatches) {
        db.remove(match);
      }
      for (const nudge of allNudges) {
        db.remove(nudge);
      }
      processedGranolaEventIds.current.clear();
      processedPrEventIds.current.clear();
      log.info('demo: state cleared', {
        events: allEvents.length,
        matches: allMatches.length,
        nudges: allNudges.length,
      });
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
              <div className='text-xs text-subdued uppercase tracking-wider pt-2 pb-1'>Setup</div>
              <Button disabled={busy} onClick={handleBootstrap}>
                <Icon icon='ph--rocket-launch--regular' size={4} />
                <span>Bootstrap from .env.demo (seed + wire credentials)</span>
              </Button>
              <Button disabled={busy} onClick={handleSeed}>
                <Icon icon='ph--plant--regular' size={4} />
                <span>Seed Widgets-team board only ({cards.length} existing cards)</span>
              </Button>
              {lastBootstrap && (
                <div className='text-xs border border-separator rounded p-2 bg-base space-y-1'>
                  {lastBootstrap.created.length > 0 && (
                    <div>
                      <span className='font-medium text-success'>Created:</span>{' '}
                      {lastBootstrap.created.join('; ')}
                    </div>
                  )}
                  {lastBootstrap.skipped.length > 0 && (
                    <div>
                      <span className='font-medium text-subdued'>Skipped:</span>{' '}
                      {lastBootstrap.skipped.join('; ')}
                    </div>
                  )}
                  {lastBootstrap.errors.length > 0 && (
                    <div>
                      <span className='font-medium text-error'>Errors:</span>{' '}
                      {lastBootstrap.errors.join('; ')}
                    </div>
                  )}
                </div>
              )}

              <div className='text-xs text-subdued uppercase tracking-wider pt-4 pb-1'>Inject event</div>
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

              {nudges.length > 0 && (
                <>
                  <div className='text-xs text-subdued uppercase tracking-wider pt-4 pb-1'>
                    Proactive nudges ({nudges.length})
                  </div>
                  {[...nudges]
                    .sort((first, second) => (second.emittedAt ?? '').localeCompare(first.emittedAt ?? ''))
                    .slice(0, 5)
                    .map((nudge) => (
                      <div
                        key={nudge.id}
                        className='border border-separator rounded p-3 text-sm bg-base'
                      >
                        <div className='flex gap-2 items-center text-xs text-subdued mb-2'>
                          <Icon icon='ph--hash--regular' size={4} />
                          <span>#{nudge.channel}</span>
                          {!nudge.posted && (
                            <span className='ml-auto italic'>preview · not posted to real Slack</span>
                          )}
                        </div>
                        <div className='whitespace-pre-wrap leading-relaxed'>{nudge.text}</div>
                      </div>
                    ))}
                </>
              )}

              {matches.length > 0 && (
                <>
                  <div className='text-xs text-subdued uppercase tracking-wider pt-4 pb-1'>
                    Auto-linked ({matches.length})
                  </div>
                  {[...matches]
                    .sort((first, second) => (second.createdAt ?? '').localeCompare(first.createdAt ?? ''))
                    .slice(0, 10)
                    .map((match) => {
                      const docName = match.document?.target?.name ?? 'note';
                      const cardName = match.card?.target?.name ?? 'card';
                      const icon =
                        match.confidence === 'high'
                          ? 'ph--check-circle--fill'
                          : match.confidence === 'medium'
                            ? 'ph--warning-circle--regular'
                            : 'ph--link--regular';
                      return (
                        <div
                          key={match.id}
                          className='flex gap-2 items-start border border-separator rounded p-2 text-sm bg-base'
                        >
                          <Icon icon={icon} size={4} />
                          <div className='flex-1'>
                            <div className='font-medium'>
                              <span className='text-subdued'>{docName}</span>
                              <span className='mx-1'>→</span>
                              <span>{cardName}</span>
                            </div>
                            <div className='text-xs text-subdued'>
                              {match.confidence} · {match.source ?? 'ai'} · {match.reasoning}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </>
              )}

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
