//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useEffect, useRef, useState } from 'react';

import { Invitation, Space } from '@dxos/halo';
import { useHaloServices, useInvitationFlow } from '@dxos/halo-react';
import { type SpaceId } from '@dxos/keys';

import { Copyable, Prompt } from './ui.tsx';

/** Invite someone to the current space, or join a space with a code. */
export const InviteBar = ({ spaceId }: { spaceId?: SpaceId }) => {
  const services = useHaloServices();
  const [open, setOpen] = useState<'invite' | 'join'>();

  // #region invite
  /** Starts an invitation to the space, and returns the flow and the code to send. */
  const handleInvite = (spaceId: SpaceId) =>
    Effect.gen(function* () {
      const flow = yield* Space.share(spaceId, {
        authMethod: 'shared-secret',
      });
      const code = yield* Invitation.code(flow);
      return { flow, code };
    }).pipe(Effect.provide(services), Effect.runPromise);
  // #endregion

  // #region join
  /** Redeems the invitation `code`, and returns the flow. */
  const handleJoin = (code: string) =>
    Space.join(code).pipe(Effect.provide(services), Effect.runPromise);
  // #endregion

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
          start={() => handleInvite(spaceId)}
          send='Send this invitation code to the person you invite:'
        />
      )}
      {open === 'join' && (
        <Guest
          label='Invitation code'
          join={handleJoin}
          onDone={() => setOpen(undefined)}
        />
      )}
    </div>
  );
};

type Flow = { flow: Invitation.Flow; code: string };

/** The host's side of an invitation: the code to send, then the authorization code to tell. */
export const Host = ({
  start,
  send,
}: {
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
  // #region events
  /** The flow's latest event, re-rendering as the handshake moves on. */
  const { event } = useInvitationFlow(flow?.flow);
  // #endregion
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
export const Guest = ({
  label,
  join,
  onDone,
}: {
  label: string;
  join: (code: string) => Promise<Invitation.Flow>;
  onDone?: () => void;
}) => {
  const services = useHaloServices();
  const [flow, setFlow] = useState<Invitation.Flow>();
  const { event } = useInvitationFlow(flow);
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
        onSubmit={(code) => join(code.trim()).then(setFlow)}
      />
    );
  }

  // #region authenticate
  /** Sends the authorization code the host shows. */
  const handleAuthenticate = (authCode: string) =>
    Invitation.authenticate(flow, authCode.trim()).pipe(
      Effect.provide(services),
      Effect.runPromise,
    );
  // #endregion

  if (event?._tag === 'readyForAuthentication') {
    return (
      <Prompt
        label='Authorization code the host sees'
        action='Send'
        onSubmit={handleAuthenticate}
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
