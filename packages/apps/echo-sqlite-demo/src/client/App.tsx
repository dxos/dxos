//
// Copyright 2026 DXOS.org
//

import React, { type FormEvent, useCallback, useEffect, useRef, useState } from 'react';

import { Filter, Obj, Ref } from '@dxos/echo';
import { useQuery, useResolveRef } from '@dxos/echo-react';
import type { SqliteDatabase } from '@dxos/echo-sqlite';

import { Organization, Person } from '../schema.ts';
import { generate } from './generate.ts';
import { GraphView } from './GraphView.tsx';
import { foreignKey, sync } from './sync.ts';

/** Two-way sync runs on its own; this is how often it checks. */
const SYNC_INTERVAL_MS = 2_000;

/**
 * The whole app. Everything below `useQuery` is ordinary React — the database is on the device, so
 * there is no loading state and no network in the path of a read or a write. Sync happens beside
 * it, not in front of it.
 */
export const App = ({ db, slug }: { db: SqliteDatabase; slug: string }) => {
  const [view, setView] = useState<'list' | 'graph'>('list');
  const [search, setSearch] = useState('');
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

  // Reactive and compiled to one SQL statement. A text query goes through the trigram FTS5 index.
  const people = useQuery(db, search.length > 0 ? Filter.text(search) : Filter.type(Person));
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
      setStatus(sent || received ? `synced ↑${sent} ↓${received}` : undefined);
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

  const addPerson = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const name = String(form.get('name') ?? '').trim();
      const email = String(form.get('email') ?? '').trim();
      const employerId = String(form.get('employer') ?? '');
      if (name.length === 0) {
        return;
      }
      const employer = organizations.find((org) => org.id === employerId);
      db.add(
        Obj.make(Person, {
          [Obj.Meta]: { keys: [foreignKey(crypto.randomUUID())] },
          name,
          email,
          ...(employer ? { employer: Ref.make(employer) } : {}),
        }),
      );
      event.currentTarget.reset();
    },
    [db, organizations],
  );

  const addOrganization = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const name = String(form.get('name') ?? '').trim();
      if (name.length > 0) {
        db.add(Obj.make(Organization, { [Obj.Meta]: { keys: [foreignKey(crypto.randomUUID())] }, name }));
        event.currentTarget.reset();
      }
    },
    [db],
  );

  return (
    <main>
      <header>
        <h1>ECHO on Cloudflare</h1>
        <p>
          A graph database in your browser. Reads and writes are local — <strong>no network</strong> — and a Durable
          Object per graph syncs them both ways.
        </p>
        <div className='row'>
          <span className={online ? 'pill online' : 'pill offline'}>{online ? 'online' : 'offline'}</span>
          <code className='slug'>/g/{slug}</code>
          <button
            onClick={() => {
              void navigator.clipboard?.writeText(window.location.href);
              setStatus('link copied');
            }}
          >
            Copy link
          </button>
          <button onClick={() => void generate(db).then((count) => setStatus(`generated ${count} objects`))}>
            Generate graph
          </button>
          <button onClick={() => setView(view === 'list' ? 'graph' : 'list')}>
            {view === 'list' ? 'Graph view' : 'List view'}
          </button>
          {status && <span className='status'>{status}</span>}
        </div>
        <p className='note'>
          Open that link in another window and the two converge. Go offline and keep typing — the writes land when you
          come back. Conflicts are last-writer-wins per object, in the order the Durable Object assigns.
          {expiresAt && ` This graph is deleted ${new Date(expiresAt).toLocaleString()}.`}
        </p>
      </header>

      {view === 'graph' && <GraphView organizations={organizations} people={people} />}

      {view === 'list' && (
        <section>
          <h2>Organizations · {organizations.length}</h2>
          <form onSubmit={addOrganization} className='row'>
            <input name='name' placeholder='Organization name' aria-label='Organization name' />
            <button type='submit'>Add</button>
          </form>
          <ul>
            {organizations.map((org) => (
              <li key={org.id}>{org.name}</li>
            ))}
          </ul>
        </section>
      )}

      {view === 'list' && (
        <section>
          <h2>People · {people.length}</h2>
          <form onSubmit={addPerson} className='row'>
            <input name='name' placeholder='Name' aria-label='Name' />
            <input name='email' placeholder='Email' aria-label='Email' />
            <select name='employer' aria-label='Employer' defaultValue=''>
              <option value=''>No employer</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
            <button type='submit'>Add</button>
          </form>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder='Full-text search (FTS5, in the browser)'
            aria-label='Search'
            className='search'
          />

          <ul>
            {people.map((person) => (
              <PersonRow key={person.id} person={person} />
            ))}
          </ul>
          {people.length === 0 && <p className='note'>Nothing here yet — generate a graph, or add someone.</p>}
        </section>
      )}
    </main>
  );
};

/** One row, and the reference traversal that makes this a graph rather than two tables. */
const PersonRow = ({ person }: { person: Person }) => {
  // Resolves the ref and re-renders when its target changes — one row loaded, not the space.
  const employer = useResolveRef(person.employer);

  return (
    <li>
      <span
        contentEditable
        suppressContentEditableWarning
        onBlur={(event) => {
          const name = event.currentTarget.textContent?.trim();
          if (name && name !== person.name) {
            Obj.update(person, (draft) => {
              draft.name = name;
            });
          }
        }}
      >
        {person.name}
      </span>
      <span className='email'>{person.email}</span>
      {employer && <span className='pill'>{employer.name}</span>}
    </li>
  );
};
