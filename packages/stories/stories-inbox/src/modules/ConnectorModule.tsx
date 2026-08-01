//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface, useActiveSpace } from '@dxos/app-toolkit/ui';
import { Filter, Ref } from '@dxos/echo';
import { Cursor } from '@dxos/link';
import { isCursorForTarget } from '@dxos/plugin-connector';
import { Mailbox } from '@dxos/plugin-inbox';
import { type Space, useQuery } from '@dxos/react-client/echo';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';

/** The connection bound to the mailbox (once connected). */
export const ConnectorModule = ({ data }: { data?: { attendableId?: string } }) => {
  const space = useActiveSpace();
  if (!space) {
    return null;
  }
  return <ConnectorModuleContainer space={space} attendableId={data?.attendableId} />;
};

const ConnectorModuleContainer = ({ space, attendableId }: { space: Space; attendableId?: string }) => {
  const mailboxes = useQuery(space.db, Filter.type(Mailbox.Mailbox));
  const [mailbox] = mailboxes;
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
    // Report which half of the lookup failed rather than a bare "not connected": a cursor whose
    // `spec.target` doesn't match this mailbox (a second, materialized Mailbox is the usual cause)
    // looks identical to having no cursor at all.
    <div className='h-full grid place-items-center p-2 text-sm text-description'>
      <JsonHighlighter
        data={{
          connected: false,
          mailboxes: mailboxes.length,
          mailbox: mailbox && Ref.make(mailbox).uri,
          cursors: cursors.map((cursor) => ({
            id: cursor.id,
            external: Cursor.isExternal(cursor),
            target: Cursor.isExternal(cursor) ? cursor.spec.target.uri : undefined,
          })),
        }}
      />
    </div>
  );
};
