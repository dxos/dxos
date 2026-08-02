//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface, useActiveSpace } from '@dxos/app-toolkit/ui';
import { Filter } from '@dxos/echo';
import { Cursor } from '@dxos/link';
import { isCursorForTarget } from '@dxos/plugin-connector';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import { type Space, useQuery } from '@dxos/react-client/echo';

/** The connection bound to the mailbox (once connected). */
export const ConnectorModule = ({ data }: { data?: { attendableId?: string } }) => {
  const space = useActiveSpace();
  if (!space) {
    return null;
  }
  return <ConnectorModuleContainer space={space} attendableId={data?.attendableId} />;
};

const ConnectorModuleContainer = ({ space, attendableId }: { space: Space; attendableId?: string }) => {
  const [mailbox] = useQuery(space.db, Filter.type(Mailbox.Mailbox));
  const cursors = useQuery(space.db, Filter.type(Cursor.Cursor));
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
