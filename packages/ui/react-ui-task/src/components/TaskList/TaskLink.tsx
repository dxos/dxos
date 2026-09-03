//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { Link, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

export type TaskLinkProps = ThemedClassName<PropsWithChildren<{ href?: string }>>;

/** Schemes that are safe to hand a new tab; a `javascript:` href would run in the app's origin. */
const SAFE_SCHEME = /^(https?|mailto):/i;

/**
 * A link inside a task row — in the title, or in the markdown of a description.
 *
 * The row is the selection target, so a bare anchor selected the task on the way to following the
 * link; the click stops here instead. Focus needs no such guard: the tree only follows focus that
 * lands on the row element itself.
 */
export const TaskLink = ({ href, children, classNames }: TaskLinkProps) => {
  if (!href || !SAFE_SCHEME.test(href)) {
    return <span className={mx(classNames)}>{children}</span>;
  }

  return (
    <Link
      href={href}
      target='_blank'
      rel='noopener noreferrer'
      classNames={classNames}
      onClick={(event) => event.stopPropagation()}
    >
      {children}
    </Link>
  );
};

TaskLink.displayName = 'TaskList.Link';
