//
// Copyright 2026 DXOS.org
//

import React, { Fragment } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { linkifyText } from './linkify';
import { TaskLink } from './TaskLink';

export type TaskTitleProps = ThemedClassName<{ title?: string }>;

/**
 * A task's title as it appears in a row: plain text, with any URL in it rendered as a link.
 *
 * Titles are a string rather than markdown — the quick-entry field and the agents that write tasks
 * both paste addresses straight in ("Review https://github.com/…/pull/12924"), and without this the
 * reader can see the address but not follow it.
 */
export const TaskTitle = ({ title, classNames }: TaskTitleProps) => {
  const runs = title ? linkifyText(title) : [];
  return (
    <span className={mx(classNames)}>
      {runs.map(({ text, href }, index) => (
        <Fragment key={index}>
          {href ? (
            // `break-all` so a long address wraps inside the row instead of forcing the grid wider
            // than the pane; the row's own truncation still governs the single-line case.
            <TaskLink href={href} classNames='break-all'>
              {text}
            </TaskLink>
          ) : (
            text
          )}
        </Fragment>
      ))}
    </span>
  );
};

TaskTitle.displayName = 'TaskList.Title';
