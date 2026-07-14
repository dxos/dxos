//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Cursor } from '@dxos/cursor';
import { Filter } from '@dxos/echo';
import { CursorsQuery, isCursorForTarget } from '@dxos/plugin-connector';
import { Mailbox } from '@dxos/plugin-inbox';
import { useQuery } from '@dxos/react-client/echo';
import { type ModuleProps } from '@dxos/story-modules';

/** The connection bound to the mailbox (once connected). */
export const ConnectorModule = ({ space, attendableId }: ModuleProps) => {
  const [mailbox] = useQuery(space.db, Filter.type(Mailbox.Mailbox));
  const cursors = useQuery(space.db, CursorsQuery);
  const binding = mailbox
    ? cursors.find(
        (candidate): candidate is Cursor.ExternalCursor =>
          Cursor.isExternal(candidate) && isCursorForTarget(candidate, mailbox),
      )
    : undefined;
  return binding ? (
    <Surface.Surface
      type={AppSurface.Article}
      data={{ subject: binding, companionTo: mailbox, attendableId }}
      limit={1}
    />
  ) : (
    <div className='h-full grid place-items-center text-description'>Not connected yet</div>
  );
};
