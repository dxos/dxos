//
// Copyright 2026 DXOS.org
//

import React, { createContext, forwardRef, useContext } from 'react';

import * as Card from '@dxos/react-ui/Card';
import * as Icon from '@dxos/react-ui/Icon';

/** Where a row's work stands: done, ended with an error, waiting to start, or running now. */
type StatusListStatus = 'success' | 'failed' | 'not-started' | 'working';

type StatusStyle = Pick<Icon.IconProps, 'icon' | 'valence' | 'tone' | 'spin'> & {
  /** Lowers the title's emphasis, so the row being worked on is the brightest. */
  muted?: boolean;
};

const STATUS: Record<StatusListStatus, StatusStyle> = {
  'success': { icon: 'ph--check-circle--fill', valence: 'success', muted: true },
  'failed': { icon: 'ph--x-circle--fill', valence: 'error', muted: true },
  'not-started': { icon: 'ph--circle-dashed--regular', tone: 'muted', muted: true },
  'working': { icon: 'ph--circle-notch--regular', spin: true },
};

// Lets the Root choose the icons' colouring once for every Item.
const MonochromeContext = createContext(false);

//
// Root
//

type StatusListRootProps = Omit<Card.RootProps, 'grid'> & {
  /** Draws every status icon in the text colours, so shape alone tells the statuses apart. */
  monochrome?: boolean;
};

/** A `grid` Card that is a list: each Item's status icon sits in its start rail and a trailing control in its end rail. */
const StatusListRoot = forwardRef<HTMLDivElement, StatusListRootProps>(
  ({ monochrome = false, ...props }, forwardedRef) => (
    <MonochromeContext.Provider value={monochrome}>
      <Card.Root role='list' {...props} grid data-monochrome={monochrome ? '' : undefined} ref={forwardedRef} />
    </MonochromeContext.Provider>
  ),
);

StatusListRoot.displayName = 'StatusList.Root';

//
// Item
//

type StatusListItemProps = Omit<Card.RowProps, 'icon' | 'leading'> & {
  status: StatusListStatus;
  /** Names the status for assistive tech; without it the status icon is decorative. */
  statusLabel?: string;
};

/**
 * One row: a status icon in the card's start rail, then its title, which truncates. `trailing` and `end` place a
 * control in the end rail, as on a `Card.Row`.
 */
const StatusListItem = forwardRef<HTMLDivElement, StatusListItemProps>(
  ({ status, statusLabel, children, ...props }, forwardedRef) => {
    const monochrome = useContext(MonochromeContext);
    const { muted, valence, tone, ...icon } = STATUS[status];
    return (
      <Card.Row
        role='listitem'
        {...props}
        data-status={status}
        leading={
          <Icon.Icon
            {...icon}
            valence={monochrome ? undefined : valence}
            tone={monochrome && muted ? 'muted' : tone}
            label={statusLabel}
          />
        }
        ref={forwardedRef}
      >
        <Card.Text variant={muted ? 'muted' : 'default'} truncate>
          {children}
        </Card.Text>
      </Card.Row>
    );
  },
);

StatusListItem.displayName = 'StatusList.Item';

/**
 * A card of rows that each show a status (a run's tasks, a job's steps): a Card's rails, so icons, titles and trailing
 * controls line up, with the row being worked on the brightest.
 */
export const StatusList: {
  Root: typeof StatusListRoot;
  Item: typeof StatusListItem;
} = {
  Root: StatusListRoot,
  Item: StatusListItem,
};

export type { StatusListItemProps, StatusListRootProps, StatusListStatus };
