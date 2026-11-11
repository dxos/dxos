//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as Layer from 'effect/Layer';
import React, {
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { type Identity, type Invitation, Space } from '@dxos/halo';
import { type SpaceId } from '@dxos/keys';

import { type Halo } from '../client.ts';
import { contacts, removeContact } from '../contacts.ts';
import { addDevice, devices, joinIdentity } from '../devices.ts';
import { authenticate, invite, join, progress } from '../invitations.ts';
import { createIdentity, me, rename } from '../profile.ts';
import { type Stage, reached } from '../progress.ts';
import {
  createRecoveryCode,
  recover,
  recoveryCodes,
  revokeRecoveryCode,
} from '../recovery.ts';
import { createSpace, spaces } from '../spaces.ts';
import { useStream, useStreamResult } from './useStream.ts';

export type ContactBookProps = {
  /** Provides the HALO services of this device's client. */
  halo: Layer.Layer<Halo>;
  stage: Stage;
};

type Run = <A, E>(effect: Effect.Effect<A, E, Halo>) => Promise<A>;

/** The contact book on one device, with what `stage` has built. */
export const ContactBook = ({ halo, stage }: ContactBookProps) => {
  const run: Run = (effect) =>
    // eslint-disable-next-line @dxos/rules/no-effect-run-promise -- readers run Effects with the published API.
    Effect.runPromise(effect.pipe(Effect.provide(halo)));
  const [identity, loaded] = useStreamResult(halo, me);
  if (!loaded) {
    return <p className='cb-muted cb-pad'>Starting…</p>;
  }
  return identity ? (
    <Signedin halo={halo} run={run} stage={stage} identity={identity} />
  ) : (
    <Welcome halo={halo} run={run} stage={stage} />
  );
};

//
// Before there is an identity.
//

const Welcome = ({
  halo,
  run,
  stage,
}: {
  halo: Layer.Layer<Halo>;
  run: Run;
  stage: Stage;
}) => {
  const [mode, setMode] = useState<'new' | 'device' | 'recover'>('new');
  return (
    <div className='cb-welcome'>
      {mode === 'new' && (
        <Prompt
          label="What's your name?"
          action='Start'
          onSubmit={(name) => run(createIdentity(name))}
        />
      )}
      {mode === 'device' && (
        <Guest
          halo={halo}
          run={run}
          label='Code from your other device'
          start={joinIdentity}
        />
      )}
      {mode === 'recover' && (
        <Prompt
          label='Your recovery code'
          action='Recover'
          multiline
          onSubmit={(code) => run(recover(code.trim()))}
        />
      )}
      <div className='cb-row cb-links'>
        {mode !== 'new' && (
          <button className='cb-link' onClick={() => setMode('new')}>
            Start a new contact book
          </button>
        )}
        {reached(stage, 'devices') && mode !== 'device' && (
          <button className='cb-link' onClick={() => setMode('device')}>
            Join your other device
          </button>
        )}
        {reached(stage, 'recovery') && mode !== 'recover' && (
          <button className='cb-link' onClick={() => setMode('recover')}>
            Recover with a code
          </button>
        )}
      </div>
    </div>
  );
};

//
// With an identity.
//

type Tab = 'people' | 'devices' | 'recovery';

const Signedin = ({
  halo,
  run,
  stage,
  identity,
}: {
  halo: Layer.Layer<Halo>;
  run: Run;
  stage: Stage;
  identity: Identity.Info;
}) => {
  const spaceList = useStream(
    halo,
    reached(stage, 'spaces') ? spaces : undefined,
  );
  const [selected, setSelected] = useState<SpaceId>();
  const current =
    spaceList?.find((space) => space.id === selected) ?? spaceList?.[0];
  const [tab, setTab] = useState<Tab>('people');
  const tabs: { value: Tab; label: string; at: Stage }[] = [
    {
      value: 'people',
      label: reached(stage, 'contacts') ? 'Contacts' : 'People',
      at: 'invite',
    },
    { value: 'devices', label: 'Devices', at: 'devices' },
    { value: 'recovery', label: 'Recovery', at: 'recovery' },
  ];
  const shown = tabs.filter((tab) => reached(stage, tab.at));

  return (
    <div className='cb-book'>
      <header className='cb-header'>
        <ProfileChip
          name={identity.displayName}
          onRename={(name) => run(rename(name))}
        />
        {reached(stage, 'spaces') && (
          <SpacePicker
            spaces={spaceList ?? []}
            current={current?.id}
            onSelect={setSelected}
            onCreate={(name) =>
              run(createSpace(name)).then((space) => setSelected(space.id))
            }
          />
        )}
      </header>
      {reached(stage, 'invite') && (
        <InviteBar halo={halo} run={run} spaceId={current?.id} />
      )}
      {shown.length > 1 && (
        <nav className='cb-tabs'>
          {shown.map(({ value, label }) => (
            <button
              key={value}
              className='cb-tab'
              aria-pressed={tab === value}
              onClick={() => setTab(value)}
            >
              {label}
            </button>
          ))}
        </nav>
      )}
      <main className='cb-main'>
        {!reached(stage, 'spaces') && (
          <p className='cb-muted'>
            Hello, {identity.displayName}. This device holds your identity.
          </p>
        )}
        {reached(stage, 'spaces') && !reached(stage, 'invite') && (
          <p className='cb-muted'>
            {current
              ? `You're in ${current.name}.`
              : 'No spaces yet. Make one with New space.'}
          </p>
        )}
        {reached(stage, 'invite') &&
          tab === 'people' &&
          (reached(stage, 'contacts') ? (
            <Contacts halo={halo} run={run} me={identity} />
          ) : (
            current && <Members halo={halo} spaceId={current.id} />
          ))}
        {tab === 'devices' && reached(stage, 'devices') && (
          <Devices halo={halo} run={run} />
        )}
        {tab === 'recovery' && reached(stage, 'recovery') && (
          <Recovery halo={halo} run={run} />
        )}
      </main>
    </div>
  );
};

const ProfileChip = ({
  name,
  onRename,
}: {
  name?: string;
  onRename: (name: string) => Promise<unknown>;
}) => {
  const [editing, setEditing] = useState(false);
  return editing ? (
    <Prompt
      label='Your name'
      action='Save'
      initial={name}
      compact
      onSubmit={(name) => onRename(name).then(() => setEditing(false))}
    />
  ) : (
    <button
      className='cb-chip'
      title='Change your name'
      onClick={() => setEditing(true)}
    >
      <span className='cb-avatar'>{initial(name)}</span>
      {name ?? 'Anonymous'}
    </button>
  );
};

const SpacePicker = ({
  spaces,
  current,
  onSelect,
  onCreate,
}: {
  spaces: readonly Space.Info[];
  current?: SpaceId;
  onSelect: (id: SpaceId) => void;
  onCreate: (name: string) => Promise<unknown>;
}) => {
  const [creating, setCreating] = useState(false);
  if (creating) {
    return (
      <Prompt
        label='Space name'
        action='Create'
        compact
        onSubmit={(name) => onCreate(name).then(() => setCreating(false))}
      />
    );
  }
  return (
    <div className='cb-row'>
      {spaces.length > 0 && (
        <select
          className='cb-select'
          aria-label='Space'
          value={current}
          onChange={(event) => {
            const space = spaces.find((s) => s.id === event.target.value);
            space && onSelect(space.id);
          }}
        >
          {spaces.map((space) => (
            <option key={space.id} value={space.id}>
              {space.name}
            </option>
          ))}
        </select>
      )}
      <button className='cb-button' onClick={() => setCreating(true)}>
        New space
      </button>
    </div>
  );
};

//
// Invitations.
//

const InviteBar = ({
  halo,
  run,
  spaceId,
}: {
  halo: Layer.Layer<Halo>;
  run: Run;
  spaceId?: SpaceId;
}) => {
  const [open, setOpen] = useState<'invite' | 'join'>();
  return (
    <div className='cb-invite'>
      <div className='cb-row'>
        <button
          className='cb-button'
          disabled={!spaceId}
          aria-pressed={open === 'invite'}
          onClick={() => setOpen(open === 'invite' ? undefined : 'invite')}
        >
          Invite
        </button>
        <button
          className='cb-button'
          aria-pressed={open === 'join'}
          onClick={() => setOpen(open === 'join' ? undefined : 'join')}
        >
          Join
        </button>
      </div>
      {open === 'invite' && spaceId && (
        <Host
          key={spaceId}
          halo={halo}
          start={() => run(invite(spaceId))}
          send='Send this invitation code to the person you invite:'
        />
      )}
      {open === 'join' && (
        <Guest
          halo={halo}
          run={run}
          label='Invitation code'
          start={join}
          onDone={() => setOpen(undefined)}
        />
      )}
    </div>
  );
};

type Flow = { flow: Invitation.Flow; code: string };

/** The host's side of an invitation: the code to send, then the authorization code to tell. */
const Host = ({
  halo,
  start,
  send,
}: {
  halo: Layer.Layer<Halo>;
  start: () => Promise<Flow>;
  send: string;
}) => {
  const [flow, setFlow] = useState<Flow>();
  const [error, setError] = useState<string>();
  const started = useRef(false);
  useEffect(() => {
    if (!started.current) {
      started.current = true;
      start().then(setFlow, (error) => setError(String(error)));
    }
  }, []);
  const events = useMemo(() => flow && progress(flow.flow), [flow]);
  const event = useStream(halo, events);
  if (error) {
    return <p className='cb-error'>{error}</p>;
  }
  if (!flow) {
    return <p className='cb-muted'>Starting the invitation…</p>;
  }
  return (
    <div className='cb-panel'>
      <p>{send}</p>
      <Copyable value={flow.code} />
      <Status event={event} host />
    </div>
  );
};

/** The guest's side of an invitation: paste the code, then type the authorization code. */
const Guest = ({
  halo,
  run,
  label,
  start,
  onDone,
}: {
  halo: Layer.Layer<Halo>;
  run: Run;
  label: string;
  start: (code: string) => Effect.Effect<Invitation.Flow, unknown, Halo>;
  onDone?: () => void;
}) => {
  const [flow, setFlow] = useState<Invitation.Flow>();
  const events = useMemo(() => flow && progress(flow), [flow]);
  const event = useStream(halo, events);
  useEffect(() => {
    if (event?._tag === 'success' && onDone) {
      const timeout = setTimeout(onDone, 1500);
      return () => clearTimeout(timeout);
    }
  }, [event]);
  if (!flow) {
    return (
      <Prompt
        label={label}
        action='Join'
        onSubmit={(code) => run(start(code.trim())).then(setFlow)}
      />
    );
  }
  if (event?._tag === 'readyForAuthentication') {
    return (
      <Prompt
        label='Authorization code the host sees'
        action='Send'
        onSubmit={(code) => run(authenticate(flow, code.trim()))}
      />
    );
  }
  return (
    <div className='cb-panel'>
      <Status event={event} />
    </div>
  );
};

const STATUS: Record<Invitation.Event['_tag'], string> = {
  connecting: 'Waiting for the other side to connect…',
  connected: 'Connected.',
  readyForAuthentication: 'Waiting for the authorization code…',
  authenticating: 'Checking the code…',
  success: 'Joined.',
  cancelled: 'Cancelled.',
  error: 'The invitation failed.',
};

const Status = ({
  event,
  host,
}: {
  event?: Invitation.Event;
  host?: boolean;
}) => {
  if (!event) {
    return null;
  }
  if (host && event._tag === 'readyForAuthentication' && event.authCode) {
    return (
      <p>
        Tell them this authorization code:{' '}
        <strong className='cb-code'>{event.authCode}</strong>
      </p>
    );
  }
  return (
    <p className={event._tag === 'error' ? 'cb-error' : 'cb-muted'}>
      {event._tag === 'error'
        ? `${STATUS.error} ${event.message}`
        : STATUS[event._tag]}
    </p>
  );
};

//
// People.
//

const Members = ({
  halo,
  spaceId,
}: {
  halo: Layer.Layer<Halo>;
  spaceId: SpaceId;
}) => {
  const stream = useMemo(() => Space.members(spaceId), [spaceId]);
  const members = useStream(halo, stream) ?? [];
  return (
    <ul className='cb-list'>
      {members.map((member) => (
        <li key={member.did ?? member.identityKey} className='cb-item'>
          <Person name={member.displayName} online={member.online} />
        </li>
      ))}
    </ul>
  );
};

const Contacts = ({
  halo,
  run,
  me,
}: {
  halo: Layer.Layer<Halo>;
  run: Run;
  me: Identity.Info;
}) => {
  const stream = useMemo(() => contacts(me.did), [me.did]);
  const list = useStream(halo, stream);
  if (!list) {
    return null;
  }
  if (list.length === 0) {
    return (
      <p className='cb-muted'>
        No contacts yet. Invite someone to one of your spaces.
      </p>
    );
  }
  return (
    <ul className='cb-list'>
      {list.map((contact) => (
        <li key={contact.did} className='cb-item'>
          <Person name={contact.name} online={contact.online} />
          <span className='cb-spaces'>
            {contact.spaces.map((space) => (
              <span key={space.id} className='cb-tag'>
                {space.name}
                <button
                  className='cb-remove'
                  title={`Remove ${contact.name ?? 'them'} from ${space.name}`}
                  onClick={() => run(removeContact(space.id, contact.did))}
                >
                  ×
                </button>
              </span>
            ))}
          </span>
        </li>
      ))}
    </ul>
  );
};

const Person = ({ name, online }: { name?: string; online: boolean }) => (
  <span className='cb-person'>
    <span className='cb-avatar'>{initial(name)}</span>
    {name ?? 'Anonymous'}
    <span
      className='cb-dot'
      data-online={online}
      title={online ? 'Online' : 'Offline'}
    />
  </span>
);

//
// Devices and recovery.
//

const Devices = ({ halo, run }: { halo: Layer.Layer<Halo>; run: Run }) => {
  const list = useStream(halo, devices) ?? [];
  const [adding, setAdding] = useState(false);
  return (
    <>
      <ul className='cb-list'>
        {list.map((device) => (
          <li key={device.key} className='cb-item'>
            <span>
              {device.label ?? device.platform ?? device.kind ?? 'Device'}
              {device.current && (
                <span className='cb-muted'> (this device)</span>
              )}
            </span>
            <span className='cb-muted'>{device.presence}</span>
          </li>
        ))}
      </ul>
      {adding ? (
        <Host
          halo={halo}
          start={() => run(addDevice)}
          send='Open the contact book on your other device, choose Join your other device, and paste:'
        />
      ) : (
        <button className='cb-button' onClick={() => setAdding(true)}>
          Add a device
        </button>
      )}
    </>
  );
};

const Recovery = ({ halo, run }: { halo: Layer.Layer<Halo>; run: Run }) => {
  const codes = useStream(halo, recoveryCodes) ?? [];
  const [created, setCreated] = useState<string>();
  const [error, setError] = useState<string>();
  return (
    <>
      {created && (
        <div className='cb-panel'>
          <p>Write this down. It is shown only once:</p>
          <Copyable value={created} />
        </div>
      )}
      <ul className='cb-list'>
        {codes.map(({ lookupKey, label, kind, issuanceDate }) => (
          <li key={lookupKey} className='cb-item'>
            <span>
              {label ?? kind}
              {issuanceDate && (
                <span className='cb-muted'>
                  {' '}
                  made {issuanceDate.toLocaleString()}
                </span>
              )}
            </span>
            {lookupKey && (
              <button
                className='cb-button'
                onClick={() =>
                  run(revokeRecoveryCode(lookupKey)).then(
                    () => setError(undefined),
                    (error) =>
                      setError(
                        codes.length === 1
                          ? 'HALO will not revoke your last recovery code. Make another one first.'
                          : String(error),
                      ),
                  )
                }
              >
                Revoke
              </button>
            )}
          </li>
        ))}
      </ul>
      {error && <p className='cb-error'>{error}</p>}
      <button
        className='cb-button'
        onClick={() =>
          run(createRecoveryCode).then((code) => {
            setError(undefined);
            setCreated(code);
          })
        }
      >
        Make a recovery code
      </button>
    </>
  );
};

//
// Small pieces.
//

const Prompt = ({
  label,
  action,
  initial = '',
  multiline,
  compact,
  onSubmit,
}: {
  label: string;
  action: string;
  initial?: string;
  multiline?: boolean;
  compact?: boolean;
  onSubmit: (value: string) => Promise<unknown>;
}) => {
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!value.trim()) {
      return;
    }
    setBusy(true);
    setError(undefined);
    onSubmit(value).then(
      () => setBusy(false),
      (error) => {
        setBusy(false);
        setError(String(error));
      },
    );
  };
  const field = multiline ? (
    <textarea
      className='cb-input'
      rows={3}
      value={value}
      autoFocus
      onChange={(event) => setValue(event.target.value)}
    />
  ) : (
    <input
      className='cb-input'
      value={value}
      autoFocus
      onChange={(event) => setValue(event.target.value)}
    />
  );
  return (
    <form
      className={compact ? 'cb-prompt cb-compact' : 'cb-prompt'}
      onSubmit={handleSubmit}
    >
      <label className='cb-label'>
        {!compact && <span>{label}</span>}
        {field}
      </label>
      <button
        className='cb-button cb-primary'
        disabled={busy}
        aria-label={compact ? label : undefined}
      >
        {action}
      </button>
      {error && <p className='cb-error'>{error}</p>}
    </form>
  );
};

const Copyable = ({ value }: { value: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <div className='cb-row'>
      <input
        className='cb-input cb-code'
        readOnly
        value={value}
        onFocus={(event) => event.target.select()}
      />
      <button
        className='cb-button'
        onClick={() =>
          navigator.clipboard.writeText(value).then(() => setCopied(true))
        }
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
};

const initial = (name?: string) => (name?.trim()[0] ?? '?').toUpperCase();
