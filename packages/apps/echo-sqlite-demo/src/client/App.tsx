//
// Copyright 2026 DXOS.org
//

import React, { type FormEvent, useCallback, useEffect, useState } from 'react';

import { Filter, Obj, Ref } from '@dxos/echo';
import { useQuery, useResolveRef } from '@dxos/echo-react';
import type { SqliteDatabase } from '@dxos/echo-sqlite';

import { Organization, Person } from '../schema.ts';
import { pull, push } from './sync.ts';

/**
 * The whole app. Everything below `useQuery` is ordinary React — the database is on the device, so
 * there is no loading state, no fetch, and no network in the path of a read or a write.
 */
export const App = ({
  db,
  checkpoint,
  release,
}: {
  db: SqliteDatabase;
  checkpoint: () => Promise<void>;
  release: () => void;
}) => {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>();
  const [online, setOnline] = useState(navigator.onLine);

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
      db.add(Obj.make(Person, { name, email, ...(employer ? { employer: Ref.make(employer) } : {}) }));
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
        db.add(Obj.make(Organization, { name }));
        event.currentTarget.reset();
      }
    },
    [db],
  );

  const run = useCallback(async (label: string, action: () => Promise<number>, reload: boolean) => {
    setStatus(`${label}…`);
    try {
      const bytes = await action();
      setStatus(`${label}: ${(bytes / 1024).toFixed(0)} KB`);
      if (reload) {
        window.location.reload();
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    }
  }, []);

  return (
    <main>
      <header>
        <h1>ECHO on Cloudflare</h1>
        <p>
          A graph database in your browser. Reads and writes are local — <strong>no network</strong> — and a Durable
          Object holds the authoritative copy.
        </p>
        <div className='row'>
          <span className={online ? 'pill online' : 'pill offline'}>{online ? 'online' : 'offline'}</span>
          <button onClick={() => void run('Pushed', () => push(checkpoint), false)}>Push to cloud</button>
          <button onClick={() => void run('Pulled', () => pull(release), true)}>Pull from cloud</button>
          {status && <span className='status'>{status}</span>}
        </div>
        <p className='note'>
          Turn off the network and keep typing: everything still works. Push and pull move the whole database, so this
          is persistence, not replication — a concurrent edit elsewhere is overwritten.
        </p>
      </header>

      <section>
        <h2>Organizations</h2>
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

      <section>
        <h2>People</h2>
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
        {people.length === 0 && <p className='note'>No matches.</p>}
      </section>
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
