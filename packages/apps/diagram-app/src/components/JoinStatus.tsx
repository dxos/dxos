//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useRef, useState } from 'react';

import { type AuthenticatingInvitationObservable, type Invitation } from '@dxos/client/invitations';
import { log } from '@dxos/log';
import { AlreadyJoinedError } from '@dxos/react-client';
import * as Button from '@dxos/react-ui/Button';
import * as Card from '@dxos/react-ui/Card';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import * as Typography from '@dxos/react-ui/Typography';

import { Invitation_State, JOIN_FAILED_STATES } from '../model/index.ts';

type Phase = 'accepting' | 'syncing';

export type JoinStatusProps = {
  invitation: AuthenticatingInvitationObservable;
  /** Resolves once the joined space is open; the card shows "Syncing" until then. */
  onJoined: (invitation: Invitation) => Promise<void>;
  onFailed: () => void;
};

const Step = ({ done, label }: { done: boolean; label: string }) => (
  <Layout.Flex gap='sm' align='center'>
    <Icon.Icon icon={done ? 'ph--check-circle--regular' : 'ph--circle-notch--regular'} size='sm' />
    <Typography.Text>{label}</Typography.Text>
  </Layout.Flex>
);

/** The card shown while an invitation link is redeemed (spec F-6.2). */
export const JoinStatus = ({ invitation, onJoined, onFailed }: JoinStatusProps) => {
  const [phase, setPhase] = useState<Phase>('accepting');
  const settledRef = useRef(false);

  useEffect(() => {
    const succeed = (current: Invitation) => {
      settledRef.current = true;
      setPhase('syncing');
      void onJoined(current).catch((err) => {
        log.error('joined space did not open', { err });
        onFailed();
      });
    };
    const subscription = invitation.subscribe(
      (current) => {
        if (settledRef.current) {
          return;
        }
        if (current.state === Invitation_State.SUCCESS) {
          succeed(current);
        } else if (JOIN_FAILED_STATES.has(current.state)) {
          settledRef.current = true;
          onFailed();
        }
      },
      (err) => {
        if (settledRef.current) {
          return;
        }
        if (err instanceof AlreadyJoinedError) {
          succeed(invitation.get());
          return;
        }
        log.error('join failed', { err });
        settledRef.current = true;
        onFailed();
      },
    );
    return () => subscription.unsubscribe();
  }, [invitation, onJoined, onFailed]);

  return (
    <Layout.Flex center classNames='dx-cover z-40 bg-base-surface' role='status' data-testid='diagram-app.join-status'>
      <Card.Root classNames='w-[min(24rem,calc(100%-2rem))]'>
        <Card.Header>
          <Card.Title>Joining a shared space…</Card.Title>
        </Card.Header>
        <Card.Row>
          <Layout.Flex column gap='sm'>
            <Step done label='Created an anonymous identity in this browser' />
            <Step done={phase === 'syncing'} label='Invitation accepted' />
            <Step done={false} label={phase === 'syncing' ? 'Syncing the space' : 'Waiting for a member or EDGE'} />
          </Layout.Flex>
        </Card.Row>
        <Card.Row>
          <Button.Root
            variant='ghost'
            data-testid='diagram-app.join-status.cancel'
            onClick={() => {
              settledRef.current = true;
              void invitation.cancel();
              onFailed();
            }}
          >
            Cancel
          </Button.Root>
        </Card.Row>
      </Card.Root>
    </Layout.Flex>
  );
};
