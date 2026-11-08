//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { addEventListener, combine } from '@dxos/async';
import { Filter, Type } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import type { SqliteDatabase } from '@dxos/echo-sqlite';
import { type Connection, connect } from '@dxos/echo-worker';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Panel from '@dxos/react-ui/Panel';
import * as Splitter from '@dxos/react-ui/Splitter';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { Event, Organization, Person, types } from '../../schema.ts';
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
export const App = ({ db, slug }: { db: SqliteDatabase; slug: string }) => {
  const [tab, setTab] = useState<MasterTab>('list');
  const [typename, setTypename] = useState<string>(Type.getTypename(Organization)!);
  const [selected, setSelected] = useState<string>();
  const [status, setStatus] = useState<string>();
  // What the status light says: green once a round trip succeeds, red while one is failing.
  const [connection, setConnection] = useState<{ ok: boolean; message: string }>({
    ok: false,
    message: 'Connecting…',
  });
  const [expiresAt, setExpiresAt] = useState<number>();
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

  // Reactive, and compiled to one SQL statement each.
  const organizations = useQuery(db, Filter.type(Organization));
  const people = useQuery(db, Filter.type(Person));
  const events = useQuery(db, Filter.type(Event));

  /** Every record, whatever its type: what the views filter and the graph draws whole. */
  const objects = useMemo(() => [...organizations, ...people, ...events], [organizations, people, events]);

  // The socket is the sync: the store pushes a write as it happens, so nothing here asks on a timer.
  const socket = useRef<Connection>(undefined);
  useEffect(() => {
    const active = connect(db, slug, types, {
      onSync: ({ received, expiresAt: expiry }) => {
        setExpiresAt(expiry);
        setConnection({ ok: true, message: received > 0 ? `Received ${received}` : 'Connected' });
      },
      onError: (error) => setConnection({ ok: false, message: error.message }),
    });
    socket.current = active;
    return () => {
      active.close();
      socket.current = undefined;
    };
  }, [db, slug]);

  // A local write is what triggers a push: the queries re-execute on commit, so their results changing is the signal.
  useEffect(() => {
    void socket.current?.push();
  }, [objects]);

  const handleGenerate = useCallback(() => {
    // The store caps a graph at the same number, so the app says so rather than letting a sync 413.
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
  const tooltip = [
    online ? connection.message : 'Offline',
    status,
    expiresAt && `expires ${new Date(expiresAt).toLocaleTimeString()}`,
  ]
    .filter(Boolean)
    .join(' · ');

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
              onDone={() => setSelected(undefined)}
              onDelete={handleDelete}
            />
          </Splitter.Panel>
        </Splitter.Root>
      </Panel.Body>

      {/* Not `asChild`: a Toolbar's root is its scroller, and the footer's own row would land on the scroller's child. */}
      <Panel.Footer>
        <Toolbar.Root>
          <Toolbar.Separator variant='gap' />
          {/* The whole status bar: one light, whose tooltip is the detail. Clicking it syncs now rather than waiting. */}
          <Button.Root
            icon='ph--circle--fill'
            iconSize='xs'
            label={tooltip}
            tooltipSide='top'
            iconOnly
            variant='ghost'
            classNames={online && connection.ok ? 'text-success-text' : 'text-error-text'}
            onClick={() => void socket.current?.push()}
          />
        </Toolbar.Root>
      </Panel.Footer>
    </Panel.Root>
  );
};
