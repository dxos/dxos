//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { getObjectPathFromObject, LayoutOperation } from '@dxos/app-toolkit';
import { Filter, Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { Markdown } from '@dxos/plugin-markdown/types';
import { Trello } from '@dxos/plugin-trello/types';
import { useQuery } from '@dxos/react-client/echo';
import { Card, Icon, Panel, ScrollArea, Toolbar } from '@dxos/react-ui';
import { Focus, Mosaic, type MosaicTileProps, useMosaicContainer } from '@dxos/react-ui-mosaic';

import { Granola } from '#types';

export type GranolaArticleProps = {
  role: string;
  subject: Granola.GranolaAccount;
  attendableId?: string;
};

// Use local proxy in dev to avoid CORS, direct API in production.
const GRANOLA_API_BASE = '/api/granola';

/** Build rich markdown content from Granola note details. */
const buildDocumentContent = (detail: any): string => {
  const sections: string[] = [];

  if (detail.calendar_event?.title) {
    sections.push(`> **Meeting:** ${detail.calendar_event.title}`);
    const parts: string[] = [];
    if (detail.calendar_event.start_time) {
      const start = new Date(detail.calendar_event.start_time);
      const end = detail.calendar_event.end_time ? new Date(detail.calendar_event.end_time) : undefined;
      parts.push(`**Date:** ${start.toLocaleDateString()} ${start.toLocaleTimeString()}${end ? ` - ${end.toLocaleTimeString()}` : ''}`);
    }
    if (detail.calendar_event.organizer_email) {
      parts.push(`**Organizer:** ${detail.calendar_event.organizer_email}`);
    }
    if (parts.length > 0) {
      sections.push(`> ${parts.join(' | ')}`);
    }
  }

  if (detail.attendees?.length > 0) {
    const names = detail.attendees.map((attendee: any) => attendee.name ?? attendee.email).join(', ');
    sections.push(`> **Attendees:** ${names}`);
  }

  if (sections.length > 0) {
    sections.push('');
  }

  const summary = detail.summary_markdown ?? detail.summary_text;
  if (summary) {
    sections.push(summary);
  }

  if (detail.transcript?.length > 0) {
    sections.push('', '---', '', '## Transcript', '');
    for (const entry of detail.transcript) {
      const speaker = entry.speaker_source ? `**${entry.speaker_source}:** ` : '';
      sections.push(`${speaker}${entry.text}`, '');
    }
  }

  return sections.join('\n');
};

//
// AI matching.
//

type MatchResult = {
  noteTitle: string;
  meetingTitle: string;
  cardName: string;
  cardListName: string;
  confidence: string;
  reasoning: string;
};

/** Use Claude to find matches between Granola notes and Trello cards. */
const aiMatch = async (
  records: Granola.GranolaSyncRecord[],
  cards: Trello.TrelloCard[],
): Promise<MatchResult[]> => {
  const apiKey = typeof globalThis.localStorage !== 'undefined'
    ? globalThis.localStorage.getItem('ANTHROPIC_API_KEY')
    : null;

  if (!apiKey) {
    throw new Error('Set ANTHROPIC_API_KEY in localStorage to use AI matching.');
  }

  const noteSummaries = records.map((record) => {
    const doc = record.document?.target;
    const summary = doc?.content?.target?.content?.slice(0, 500) ?? '';
    return {
      id: record.granolaId,
      noteTitle: doc?.name ?? '',
      meetingTitle: record.calendarEvent?.title ?? '',
      attendees: (record.attendees ?? []).map((attendee) => attendee.name ?? attendee.email ?? '').join(', '),
      summarySnippet: summary,
    };
  });

  const cardSummaries = cards.map((card) => ({
    name: card.name,
    list: card.listName ?? '',
    description: (card.description ?? '').slice(0, 200),
    labels: (card.labels ?? []).map((label) => label.name).join(', '),
  }));

  const response = await fetch('/api/anthropic/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: `You are matching meeting notes to Trello cards. For each meeting note, determine if it relates to any of the Trello cards. A match means the meeting was likely about that card's topic, involved the same people/project, or discussed the subject the card tracks.

MEETING NOTES:
${JSON.stringify(noteSummaries, null, 2)}

TRELLO CARDS:
${JSON.stringify(cardSummaries, null, 2)}

Return a JSON array of matches. Each match should have:
- noteTitle: the meeting note title
- meetingTitle: the calendar event title
- cardName: the matched Trello card name (exact match from the list above)
- cardListName: the list the card is in
- confidence: "high", "medium", or "low"
- reasoning: one sentence explaining why this is a match

Only include matches where there is a real connection. If a note has no matching card, skip it. Return ONLY the JSON array, no other text.`,
      }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  const text = result.content?.[0]?.text ?? '[]';
  const jsonText = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();
  return JSON.parse(jsonText) as MatchResult[];
};

//
// Tile components for Mosaic.VirtualStack.
//

type NoteTileData = {
  record: Granola.GranolaSyncRecord;
  onOpen: (record: Granola.GranolaSyncRecord) => void;
};

type NoteTileProps = Pick<MosaicTileProps<NoteTileData>, 'data' | 'location' | 'current'>;

const NoteTile = forwardRef<HTMLDivElement, NoteTileProps>(({ data, location, current }, forwardedRef) => {
  const { record, onOpen } = data;
  const { setCurrentId } = useMosaicContainer('NoteTile');
  const doc = record.document?.target;

  const handleClick = useCallback(() => {
    setCurrentId(record.granolaId);
    onOpen(record);
  }, [record, onOpen, setCurrentId]);

  const published = record.createdAt ? new Date(record.createdAt).toLocaleDateString() : undefined;

  return (
    <Mosaic.Tile asChild classNames='dx-hover dx-current' id={record.granolaId} data={data} location={location}>
      <Focus.Item asChild current={current} onCurrentChange={() => setCurrentId(record.granolaId)}>
        <Card.Root ref={forwardedRef} onClick={handleClick}>
          <Card.Toolbar>
            <Card.IconBlock>
              <Card.Icon icon='ph--notebook--regular' />
            </Card.IconBlock>
            <Card.Text classNames='truncate'>{doc?.name ?? 'Untitled Note'}</Card.Text>
          </Card.Toolbar>
          <Card.Content>
            {record.calendarEvent?.title && (
              <Card.Row icon='ph--calendar--regular'>
                <Card.Text variant='description'>{record.calendarEvent.title}</Card.Text>
              </Card.Row>
            )}
            {record.attendees && record.attendees.length > 0 && (
              <Card.Row icon='ph--users--regular'>
                <Card.Text variant='description'>
                  {record.attendees.map((attendee) => attendee.name ?? attendee.email).join(', ')}
                </Card.Text>
              </Card.Row>
            )}
            {published && (
              <Card.Row icon='ph--clock--regular'>
                <Card.Text variant='description'>{published}</Card.Text>
              </Card.Row>
            )}
          </Card.Content>
        </Card.Root>
      </Focus.Item>
    </Mosaic.Tile>
  );
});

NoteTile.displayName = 'NoteTile';

type MatchTileData = {
  match: MatchResult;
  index: number;
};

type MatchTileProps = Pick<MosaicTileProps<MatchTileData>, 'data' | 'location' | 'current'>;

const MatchTile = forwardRef<HTMLDivElement, MatchTileProps>(({ data, location, current }, forwardedRef) => {
  const { match, index } = data;
  const { setCurrentId } = useMosaicContainer('MatchTile');
  const matchId = `match-${index}`;

  const confidenceIcon = match.confidence === 'high'
    ? 'ph--check-circle--regular'
    : match.confidence === 'medium'
      ? 'ph--warning-circle--regular'
      : 'ph--question--regular';

  return (
    <Mosaic.Tile asChild classNames='dx-hover dx-current' id={matchId} data={data} location={location}>
      <Focus.Item asChild current={current} onCurrentChange={() => setCurrentId(matchId)}>
        <Card.Root ref={forwardedRef}>
          <Card.Toolbar>
            <Card.IconBlock>
              <Card.Icon icon={confidenceIcon} />
            </Card.IconBlock>
            <Card.Text classNames='truncate'>{match.noteTitle || match.meetingTitle}</Card.Text>
            <Card.IconBlock>
              <Icon icon='ph--arrow-right--regular' size={4} />
            </Card.IconBlock>
            <Card.Text classNames='truncate'>{match.cardName}</Card.Text>
          </Card.Toolbar>
          <Card.Content>
            <Card.Row icon='ph--list-bullets--regular'>
              <Card.Text variant='description'>{match.cardListName}</Card.Text>
            </Card.Row>
            <Card.Row icon='ph--lightbulb--regular'>
              <Card.Text variant='description'>{match.reasoning}</Card.Text>
            </Card.Row>
          </Card.Content>
        </Card.Root>
      </Focus.Item>
    </Mosaic.Tile>
  );
});

MatchTile.displayName = 'MatchTile';

//
// Main article component.
//

export const GranolaArticle = ({ role, subject: account }: GranolaArticleProps) => {
  const db = Obj.getDatabase(account);
  const syncRecords: Granola.GranolaSyncRecord[] = useQuery(db, Filter.type(Granola.GranolaSyncRecord));
  const trelloCards: Trello.TrelloCard[] = useQuery(db, Filter.type(Trello.TrelloCard));
  const [syncing, setSyncing] = useState(false);
  const [matching, setMatching] = useState(false);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [noteViewport, setNoteViewport] = useState<HTMLElement | null>(null);
  const { invokePromise } = useOperationInvoker();

  const handleOpenDocument = useCallback((record: Granola.GranolaSyncRecord) => {
    const doc = record.document?.target;
    if (!doc) {
      return;
    }
    const docPath = getObjectPathFromObject(doc);
    void invokePromise(LayoutOperation.Open, { subject: [docPath] });
  }, [invokePromise]);

  const handleMatchToTrello = useCallback(async () => {
    setMatching(true);
    try {
      const uniqueByGranola = [...new Map(syncRecords.map((record) => [record.granolaId, record])).values()];
      const activeCards = trelloCards.filter((card) => !card.closed);
      const results = await aiMatch(uniqueByGranola, activeCards);
      setMatches(results);
    } catch (error) {
      log.catch(error);
    } finally {
      setMatching(false);
    }
  }, [syncRecords, trelloCards]);

  const handleSaveMatchReport = useCallback(() => {
    if (!db || matches.length === 0) {
      return;
    }

    const lines = [
      '# Granola → Trello Match Report',
      '',
      `Generated: ${new Date().toLocaleString()}`,
      `Matches found: ${matches.length}`,
      '',
    ];

    for (const match of matches) {
      lines.push(`## "${match.noteTitle}" → "${match.cardName}"`);
      lines.push(`- **Confidence:** ${match.confidence}`);
      lines.push(`- **Meeting:** ${match.meetingTitle || 'N/A'}`);
      lines.push(`- **Card list:** ${match.cardListName}`);
      lines.push(`- **Reasoning:** ${match.reasoning}`);
      lines.push('');
    }

    const doc = Markdown.make({ name: `Match Report ${new Date().toLocaleString()}`, content: lines.join('\n') });
    db.add(doc);

    setTimeout(() => {
      try {
        const docPath = getObjectPathFromObject(doc);
        void invokePromise(LayoutOperation.Open, { subject: [docPath] });
      } catch (error) {
        log.catch(error);
      }
    }, 500);
  }, [db, matches, invokePromise]);

  const handleSync = useCallback(async () => {
    if (!db || !account.apiKey) {
      return;
    }

    setSyncing(true);
    try {
      const headers = { Authorization: `Bearer ${account.apiKey}` };
      const existingByGranolaId = new Map(syncRecords.map((record) => [record.granolaId, record]));

      let cursor: string | undefined;
      let hasMore = true;
      const remoteNotes: any[] = [];

      while (hasMore) {
        const params = new URLSearchParams({ page_size: '30' });
        if (cursor) {
          params.set('cursor', cursor);
        }
        const response = await fetch(`${GRANOLA_API_BASE}/notes?${params}`, { headers });
        if (!response.ok) {
          throw new Error(`Granola API: ${response.status}`);
        }
        const data = await response.json();
        remoteNotes.push(...data.notes);
        hasMore = data.hasMore;
        cursor = data.cursor ?? undefined;
      }

      for (const summary of remoteNotes) {
        const detailRes = await fetch(`${GRANOLA_API_BASE}/notes/${summary.id}?include=transcript`, { headers });
        if (!detailRes.ok) {
          log.warn('Failed to fetch note detail', { noteId: summary.id, status: detailRes.status });
          continue;
        }

        const detail = await detailRes.json();
        const content = buildDocumentContent(detail);
        const title = detail.title ?? 'Untitled Meeting';

        const attendees = detail.attendees?.map((attendee: any) => ({
          name: attendee.name,
          email: attendee.email,
        }));

        const calendarEvent = detail.calendar_event
          ? {
              title: detail.calendar_event.title,
              eventId: detail.calendar_event.event_id,
              organizerEmail: detail.calendar_event.organizer_email,
              startTime: detail.calendar_event.start_time,
              endTime: detail.calendar_event.end_time,
            }
          : undefined;

        const existing = existingByGranolaId.get(summary.id);
        if (existing) {
          const doc = existing.document?.target;
          if (doc) {
            Obj.change(doc, (mutable) => { mutable.name = title; });
            const textObj = doc.content?.target;
            if (textObj) {
              Obj.change(textObj, (mutable) => { mutable.content = content; });
            }
          }
          Obj.change(existing, (mutable) => {
            mutable.attendees = attendees;
            mutable.calendarEvent = calendarEvent;
            mutable.ownerName = detail.owner?.name;
            mutable.ownerEmail = detail.owner?.email;
            mutable.updatedAt = detail.updated_at;
          });
        } else {
          const doc = Markdown.make({ name: title, content });
          db.add(doc);
          const syncRecord = Obj.make(Granola.GranolaSyncRecord, {
            granolaId: summary.id,
            document: Ref.make(doc),
            attendees,
            calendarEvent,
            ownerName: detail.owner?.name,
            ownerEmail: detail.owner?.email,
            createdAt: detail.created_at,
            updatedAt: detail.updated_at,
          });
          db.add(syncRecord);
        }
      }

      Obj.change(account, (mutable) => {
        mutable.lastSyncedAt = new Date().toISOString();
      });
    } catch (error) {
      log.catch(error);
    } finally {
      setSyncing(false);
    }
  }, [db, account, syncRecords]);

  const didAutoSync = useRef(false);
  useEffect(() => {
    if (!didAutoSync.current && account.apiKey && !account.lastSyncedAt) {
      didAutoSync.current = true;
      void handleSync();
    }
  }, [account.apiKey, account.lastSyncedAt, handleSync]);

  const uniqueRecords = [...new Map(syncRecords.map((record) => [record.granolaId, record])).values()];
  const sortedRecords = [...uniqueRecords].sort((recordA, recordB) => {
    const dateA = recordA.createdAt ? new Date(recordA.createdAt).getTime() : 0;
    const dateB = recordB.createdAt ? new Date(recordB.createdAt).getTime() : 0;
    return dateB - dateA;
  });

  const noteItems = useMemo(
    () => sortedRecords.map((record) => ({ record, onOpen: handleOpenDocument })),
    [sortedRecords, handleOpenDocument],
  );

  const matchItems = useMemo(
    () => matches.map((match, index) => ({ match, index })),
    [matches],
  );

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.Text>{account.name ?? 'Granola Notes'}</Toolbar.Text>
          <Toolbar.Separator />
          <Toolbar.IconButton
            label={syncing ? 'Syncing...' : 'Sync notes'}
            icon='ph--arrows-clockwise--regular'
            iconOnly
            disabled={syncing || !account.apiKey}
            onClick={handleSync}
          />
          {trelloCards.length > 0 && (
            <Toolbar.IconButton
              label={matching ? 'Matching...' : 'Match to Trello'}
              icon='ph--magnifying-glass--regular'
              iconOnly
              disabled={matching || syncRecords.length === 0}
              onClick={handleMatchToTrello}
            />
          )}
          {matches.length > 0 && (
            <Toolbar.IconButton
              label='Save match report'
              icon='ph--file-text--regular'
              iconOnly
              onClick={handleSaveMatchReport}
            />
          )}
          {account.lastSyncedAt && (
            <>
              <Toolbar.Separator />
              <Toolbar.Text>
                {new Date(account.lastSyncedAt).toLocaleTimeString()}
              </Toolbar.Text>
            </>
          )}
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content>
        {matches.length > 0 && (
          <div className='p-2'>
            <Focus.Group asChild>
              <Mosaic.Container withFocus>
                <Mosaic.VirtualStack
                  Tile={MatchTile}
                  classNames='my-2'
                  gap={8}
                  items={matchItems}
                  draggable={false}
                  getId={(item) => `match-${item.index}`}
                  getScrollElement={() => noteViewport}
                  estimateSize={() => 100}
                />
              </Mosaic.Container>
            </Focus.Group>
          </div>
        )}
        <Focus.Group asChild>
          <Mosaic.Container asChild withFocus autoScroll={noteViewport}>
            <ScrollArea.Root orientation='vertical' padding centered>
              <ScrollArea.Viewport ref={setNoteViewport}>
                <Mosaic.VirtualStack
                  Tile={NoteTile}
                  classNames='my-2'
                  gap={8}
                  items={noteItems}
                  draggable={false}
                  getId={(item) => item.record.granolaId}
                  getScrollElement={() => noteViewport}
                  estimateSize={() => 120}
                />
              </ScrollArea.Viewport>
            </ScrollArea.Root>
          </Mosaic.Container>
        </Focus.Group>
      </Panel.Content>
      {!account.apiKey && (
        <Panel.Statusbar>
          <p className='flex p-1 items-center text-warning-text'>Configure API key in account properties to enable sync.</p>
        </Panel.Statusbar>
      )}
    </Panel.Root>
  );
};
