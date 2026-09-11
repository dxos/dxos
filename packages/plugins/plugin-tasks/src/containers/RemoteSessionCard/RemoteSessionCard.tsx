//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Card, Clipboard, Icon } from '@dxos/react-ui';
import { RemoteSession } from '@dxos/types';

export type RemoteSessionCardProps = AppSurface.ObjectCardProps<RemoteSession.RemoteSession>;

/** Resuming by id is a CLI invocation, so the card offers the command rather than a link. */
const resumeCommand = (sessionId: string): string => `claude --resume ${sessionId}`;

const stateOption = (state: RemoteSession.State) => RemoteSession.StateOptions.find(({ id }) => id === state);

/**
 * Relative age, to the coarsest unit that still says something. A session's heartbeat is only
 * meaningful as "how long since" — an absolute timestamp makes the reader do the subtraction that
 * decides whether a `running` session is actually alive.
 */
const since = (iso: string): string => {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) {
    return `${seconds}s ago`;
  } else if (seconds < 3600) {
    return `${Math.round(seconds / 60)}m ago`;
  } else if (seconds < 86_400) {
    return `${Math.round(seconds / 3600)}h ago`;
  } else {
    return `${Math.round(seconds / 86_400)}d ago`;
  }
};

/**
 * Card content for a coding-agent session: which harness it is, whether it is still alive, where it
 * is working, and what it last said.
 */
export const RemoteSessionCard = ({ subject }: RemoteSessionCardProps) => {
  const { state, title, lastMessage, started, lastCheckedIn, repo, branch, worktree } = subject;
  const option = stateOption(state);
  const harness = RemoteSession.harnessName(subject);
  const harnessIcon = RemoteSession.harnessIcon(subject);
  const sessionId = RemoteSession.getSessionId(subject);
  // The worktree is an absolute path; its last segment is the part that identifies the checkout.
  const worktreeName = worktree?.split('/').filter(Boolean).at(-1);

  return (
    <Clipboard.Provider>
      <Card.Body>
        <Card.Row>
          <div className='flex justify-between items-center gap-2 text-sm'>
            <span className='flex items-center gap-1 text-description'>
              {harnessIcon && <Icon icon={harnessIcon} size={4} />}
              {harness ?? 'Session'}
            </span>
            {option && (
              <span className='dx-tag' data-hue={option.color}>
                {option.title}
              </span>
            )}
          </div>
        </Card.Row>
        {title && (
          <Card.Row>
            <Card.Title classNames='line-clamp-2'>{title}</Card.Title>
          </Card.Row>
        )}
        {(repo || branch || worktreeName) && (
          <Card.Row>
            <div className='flex items-center gap-2 text-sm text-description min-w-0'>
              {repo && <span className='truncate'>{repo}</span>}
              {branch && (
                <span className='dx-tag' data-hue='neutral'>
                  {branch}
                </span>
              )}
              {!repo && worktreeName && <span className='truncate'>{worktreeName}</span>}
            </div>
          </Card.Row>
        )}
        <Card.Row>
          <div className='flex items-center gap-2 text-sm text-subdued'>
            <span>started {since(started)}</span>
            {/* Only meaningful while the session might still be working; a closed one has an end. */}
            {lastCheckedIn && !RemoteSession.isTerminal(subject) && <span>· seen {since(lastCheckedIn)}</span>}
          </div>
        </Card.Row>
        {lastMessage && (
          <Card.Row>
            <Card.Text classNames='line-clamp-3 text-description'>{lastMessage}</Card.Text>
          </Card.Row>
        )}
        {sessionId && (
          <Card.Row>
            {/* The only reliable way back into a session: `claude-cli://open` takes no session id, and
              the web URL needs the bridge id, which the harness does not put in the hook payload. */}
            <div className='flex items-center gap-1 min-w-0'>
              <code className='text-xs text-subdued select-all truncate'>{resumeCommand(sessionId)}</code>
              <Clipboard.IconButton variant='ghost' size={4} value={resumeCommand(sessionId)} />
            </div>
          </Card.Row>
        )}
      </Card.Body>
    </Clipboard.Provider>
  );
};

RemoteSessionCard.displayName = 'RemoteSessionCard';
