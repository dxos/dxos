//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useRef, useState } from 'react';

import { Filter } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import type { SqliteDatabase } from '@dxos/echo-sqlite';
import * as Button from '@dxos/react-ui/Button';
import * as Panel from '@dxos/react-ui/Panel';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { Organization, Person } from '../schema.ts';
import { CodeView } from './CodeView.tsx';
import { CreateForm } from './CreateForm.tsx';
import { generate } from './generate.ts';
import { GraphView } from './GraphView.tsx';
import { ListView } from './ListView.tsx';
import { sync } from './sync.ts';

/** Two-way sync runs on its own; this is how often it checks. */
const SYNC_INTERVAL_MS = 2_000;

type View = 'list' | 'graph' | 'code';

/**
 * The shell: a toolbar, a scrolling body and a status row.
 *
 * `Panel.Root` is a grid of `auto 1fr auto`, so the body absorbs the slack and the toolbar and
 * footer hug their content — which is what makes the views expand and scroll with no height
 * plumbing here.
 */
export const App = ({ db, slug }: { db: SqliteDatabase; slug: string }) => {
  const [view, setView] = useState<View>('list');
  const [status, setStatus] = useState<string>();
  const [expiresAt, setExpiresAt] = useState<number>();
  const [online, setOnline] = useState(navigator.onLine);
  const syncing = useRef(false);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

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
    const timer = setInterval(() => void runSync(), SYNC_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [runSync]);

  const handleGenerate = useCallback(() => {
    void generate(db).then((count) => setStatus(`generated ${count} objects`));
  }, [db]);

  const handleCopy = useCallback(() => {
    void navigator.clipboard?.writeText(window.location.href);
    setStatus('link copied');
  }, []);

  // The list reports the row's id; resolve it back to the object before removing.
  const handleRemove = useCallback(
    (id: string) => {
      const obj = [...organizations, ...people].find((candidate) => candidate.id === id);
      if (obj) {
        db.remove(obj);
      }
    },
    [db, organizations, people],
  );

  return (
    <Panel.Root size='md'>
      <Panel.Header>
        <Toolbar.Root>
          <Toolbar.Text>ECHO on Cloudflare</Toolbar.Text>
          <Button.Root
            icon='ph--list-bullets--regular'
            label='List'
            iconOnly
            variant={view === 'list' ? 'primary' : 'ghost'}
            onClick={() => setView('list')}
          />
          <Button.Root
            icon='ph--graph--regular'
            label='Graph'
            iconOnly
            variant={view === 'graph' ? 'primary' : 'ghost'}
            onClick={() => setView('graph')}
          />
          <Button.Root
            icon='ph--code--regular'
            label='Code'
            iconOnly
            variant={view === 'code' ? 'primary' : 'ghost'}
            onClick={() => setView('code')}
          />
          <Button.Root icon='ph--sparkle--regular' label='Generate' iconOnly onClick={handleGenerate} />
          <Button.Root icon='ph--link--regular' label='Copy link' iconOnly onClick={handleCopy} />
        </Toolbar.Root>
        {view === 'list' && <CreateForm db={db} organizations={organizations} />}
      </Panel.Header>

      <Panel.Body classNames='min-h-0 grid'>
        {/*
          Each view owns its body. `Listbox` and `Syntax` bring their own ScrollArea, so wrapping
          them in another one nests two scrollers of equal height and neither scrolls; the graph
          needs to fill rather than scroll.
        */}
        {view === 'list' && <ListView organizations={organizations} people={people} onRemove={handleRemove} />}
        {view === 'graph' && <GraphView organizations={organizations} people={people} />}
        {view === 'code' && <CodeView />}
      </Panel.Body>

      <Panel.Footer>
        <Toolbar.Root>
          <Toolbar.Text>
            {online ? 'online' : 'offline'} · /g/{slug} · {organizations.length} organizations · {people.length} people
          </Toolbar.Text>
          {status && <Toolbar.Text>{status}</Toolbar.Text>}
          {expiresAt && <Toolbar.Text>expires {new Date(expiresAt).toLocaleTimeString()}</Toolbar.Text>}
        </Toolbar.Root>
      </Panel.Footer>
    </Panel.Root>
  );
};
