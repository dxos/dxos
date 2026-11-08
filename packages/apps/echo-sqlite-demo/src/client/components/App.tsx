//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { addEventListener, combine, interval } from '@dxos/async';
import { Filter, Type } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import type { SqliteDatabase } from '@dxos/echo-sqlite';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Panel from '@dxos/react-ui/Panel';
import * as Splitter from '@dxos/react-ui/Splitter';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { sync } from '../../core/index.ts';
import { Organization, Person } from '../../schema.ts';
import { generate } from '../generate.ts';
import { DetailForm } from './DetailForm.tsx';
import { type MasterTab, MasterView } from './MasterView.tsx';

/** Two-way sync runs on its own; this is how often it checks. */
const SYNC_INTERVAL_MS = 2_000;

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
  const [expiresAt, setExpiresAt] = useState<number>();
  const [online, setOnline] = useState(navigator.onLine);
  const syncing = useRef(false);

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
  const people = useQuery(db, Filter.type(Person));
  const organizations = useQuery(db, Filter.type(Organization));

  const runSync = useCallback(async () => {
    // One round trip at a time; a slow one must not pile up behind the interval.
    if (syncing.current || !navigator.onLine) {
      return;
    }
    syncing.current = true;
    try {
      const { sent, received, expiresAt: expiry } = await sync(db, slug);
      setExpiresAt(expiry);
      if (sent || received) {
        setStatus(`synced ↑${sent} ↓${received}`);
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      syncing.current = false;
    }
  }, [db, slug]);

  // Two-way by default: no buttons, just a loop.
  useEffect(() => {
    void runSync();
    return interval(() => void runSync(), SYNC_INTERVAL_MS);
  }, [runSync]);

  const handleGenerate = useCallback(() => {
    void generate(db).then((count) => setStatus(`generated ${count} objects`));
  }, [db]);

  const handleCopyLink = useCallback(() => {
    void navigator.clipboard?.writeText(window.location.href);
    setStatus('link copied');
  }, []);

  // The views report a row's id; the form needs the object itself.
  const subject = useMemo(
    () => [...organizations, ...people].find((candidate) => candidate.id === selected),
    [organizations, people, selected],
  );

  const handleRemove = useCallback(
    (id: string) => {
      const obj = [...organizations, ...people].find((candidate) => candidate.id === id);
      if (obj) {
        db.remove(obj);
        setSelected(undefined);
      }
    },
    [db, organizations, people],
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
              organizations={organizations}
              people={people}
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
              organizations={organizations}
              selected={subject}
              onDone={() => setSelected(undefined)}
              onDelete={handleDelete}
            />
          </Splitter.Panel>
        </Splitter.Root>
      </Panel.Body>

      <Panel.Footer>
        <Toolbar.Root>
          <Toolbar.Text>{online ? 'online' : 'offline'}</Toolbar.Text>
          {status && <Toolbar.Text classNames='text-end'>{status}</Toolbar.Text>}
          {expiresAt && (
            <Toolbar.Text classNames='text-end'>expires {new Date(expiresAt).toLocaleTimeString()}</Toolbar.Text>
          )}
        </Toolbar.Root>
      </Panel.Footer>
    </Panel.Root>
  );
};
