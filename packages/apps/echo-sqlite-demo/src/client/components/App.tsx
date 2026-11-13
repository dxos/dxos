//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { addEventListener, combine } from '@dxos/async';
import { Filter, Order, Query, Type } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import type { SqliteDatabase } from '@dxos/echo-sqlite';
import { SpaceSync, connectSocket, socketPath } from '@dxos/echo-sqlite/sync';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Panel from '@dxos/react-ui/Panel';
import * as Splitter from '@dxos/react-ui/Splitter';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { Event, Organization, Person } from '../../schema.ts';
import { OBJECT_LIMIT, generate } from '../generate.ts';
import { DetailForm } from './DetailForm.tsx';
import { type MasterTab, MasterView } from './MasterView.tsx';

/** The detail pane's share of the split; the master takes the rest. */
const DETAIL_FRACTION = 0.4;

/**
 * Master/detail over one ECHO graph.
 *
 * `Panel.Root` is a grid of `auto 1fr auto`, so the body absorbs the slack and the status row hugs. The body is the
 * master/detail grid: the form stacks under the records on a phone and moves to a fixed right-hand column from `lg`
 * up. There is no app toolbar — the master pane carries its own.
 */
export const App = ({ db }: { db: SqliteDatabase }) => {
  const [tab, setTab] = useState<MasterTab>('list');
  const [typename, setTypename] = useState<string>(Type.getTypename(Organization)!);
  const [selected, setSelected] = useState<string>();
  const [status, setStatus] = useState<string>();
  // What the status light says: green once a round trip succeeds, red while one is failing.
  const [connection, setConnection] = useState<{ ok: boolean; message: string }>({
    ok: false,
    message: 'Connecting…',
  });
  const [online, setOnline] = useState(navigator.onLine);

  // Side by side on a laptop, stacked on a phone.
  const [wide] = Hooks.useMediaQuery('md', { fallback: [true] });
  const splitRef = useRef<HTMLDivElement>(null);
  // The splitter sizes in rem, so 60/40 is measured from the pane once it is laid out.
  const [detailSize, setDetailSize] = useState(0);
  useLayoutEffect(() => {
    const element = splitRef.current;
    if (element) {
      const extent = wide ? element.clientWidth : element.clientHeight;
      setDetailSize((extent * DETAIL_FRACTION) / Number.parseFloat(getComputedStyle(element).fontSize));
    }
  }, [wide]);

  useEffect(
    () =>
      combine(
        addEventListener(window, 'online', () => setOnline(true)),
        addEventListener(window, 'offline', () => setOnline(false)),
      ),
    [],
  );

  // Reactive, and compiled to one SQL statement each; ordered by the property each type is named by,
  // so every view lists its records the way a reader expects rather than in insertion order.
  const organizations = useQuery(
    db,
    Query.select(Filter.type(Organization)).orderBy(Order.property<Organization>('name', 'asc')),
  );
  const people = useQuery(db, Query.select(Filter.type(Person)).orderBy(Order.property<Person>('name', 'asc')));
  const events = useQuery(db, Query.select(Filter.type(Event)).orderBy(Order.property<Event>('title', 'asc')));

  /** Every record, whatever its type: what the views filter and the graph draws whole. */
  const objects = useMemo(() => [...organizations, ...people, ...events], [organizations, people, events]);

  // The socket is the sync: every local commit starts a round, and the server announces other peers'
  // writes as they land, so nothing here asks on a timer.
  useEffect(() => {
    const url = new URL(socketPath(db.spaceId), import.meta.env.VITE_SYNC_URL ?? window.location.origin);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    const transport = connectSocket(url.toString());
    const sync = new SpaceSync(db, transport);
    const unsubscribe = transport.onConnectionChange((connected) =>
      setConnection(connected ? { ok: true, message: 'Connected' } : { ok: false, message: 'Reconnecting…' }),
    );
    return () => {
      unsubscribe();
      sync.close();
      transport.close();
    };
  }, [db]);

  const handleSaved = useCallback(() => setSelected(undefined), []);

  const handleGenerate = useCallback(() => {
    // A demo bound: past it the views stop being readable.
    const budget = OBJECT_LIMIT - objects.length;
    if (budget <= 0) {
      setStatus(`limit reached (${OBJECT_LIMIT} objects)`);
      return;
    }
    void generate(db, { budget }).then((count) => setStatus(`generated ${count} objects`));
  }, [db, objects.length]);

  const handleCopyLink = useCallback(() => {
    void navigator.clipboard?.writeText(window.location.href);
    setStatus('link copied');
  }, []);

  // The views report a row's id; the form needs the object itself.
  const subject = useMemo(() => objects.find((candidate) => candidate.id === selected), [objects, selected]);

  const handleRemove = useCallback(
    (id: string) => {
      const obj = objects.find((candidate) => candidate.id === id);
      if (obj) {
        db.remove(obj);
        // Only the record being removed leaves the detail pane; removing another one is not a selection change.
        setSelected((current) => (current === id ? undefined : current));
      }
    },
    [db, objects],
  );

  const handleDelete = useCallback(() => {
    if (selected) {
      handleRemove(selected);
    }
  }, [handleRemove, selected]);

  // Switching type drops a selection that belongs to the other one.
  const handleTypenameChange = useCallback((next: string) => {
    setTypename(next);
    setSelected(undefined);
  }, []);

  /** Everything the status light has to say, since it is the only thing in the status bar. */
  const tooltip = [online ? connection.message : 'Offline', status].filter(Boolean).join(' · ');

  return (
    <Panel.Root size='md' classNames='sm:rounded-md sm:border sm:border-separator'>
      <Panel.Body asChild>
        <Splitter.Root
          orientation={wide ? 'horizontal' : 'vertical'}
          anchor='end'
          size={detailSize}
          onSizeChange={setDetailSize}
          minSize={12}
          resizable
          ref={splitRef}
        >
          <Splitter.Panel position='start'>
            <MasterView
              typename={typename}
              onTypenameChange={handleTypenameChange}
              tab={tab}
              onTabChange={setTab}
              objects={objects}
              selected={selected}
              onSelect={setSelected}
              onRemove={handleRemove}
              onNew={() => setSelected(undefined)}
              onGenerate={handleGenerate}
              onCopyLink={handleCopyLink}
            />
          </Splitter.Panel>

          <Splitter.ResizeTrigger aria-label='Resize' />

          <Splitter.Panel position='end'>
            <DetailForm
              db={db}
              typename={typename}
              objects={objects}
              selected={subject}
              onDone={handleSaved}
              onDelete={handleDelete}
            />
          </Splitter.Panel>
        </Splitter.Root>
      </Panel.Body>

      {/* Not `asChild`: a Toolbar's root is its scroller, and the footer's own row would land on the scroller's child. */}
      <Panel.Footer>
        <Toolbar.Root>
          <Toolbar.Separator variant='gap' />
          {/* The whole status bar: one light, whose tooltip is the detail. */}
          <Button.Root
            icon='ph--circle--fill'
            iconSize='xs'
            label={tooltip}
            tooltipSide='top'
            iconOnly
            variant='ghost'
            classNames={online && connection.ok ? 'text-success-text' : 'text-error-text'}
          />
        </Toolbar.Root>
      </Panel.Footer>
    </Panel.Root>
  );
};
