//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj } from '@dxos/echo';
import { Mailbox } from '@dxos/plugin-inbox';
import { useQuery } from '@dxos/react-client/echo';

import { ModuleProps } from '../testing';

/** LEFT: the mailbox article (includes the connect/sync auth button). */
export const MailboxModule = ({ space, attendableId }: ModuleProps) => {
  const [mailbox] = useQuery(space.db, Filter.type(Mailbox.Mailbox));
  // Scope the article's selection to the mailbox object rather than this cell's positional
  // attendableId, so the sibling MessageModule cell (a separate ModuleContainer attention target)
  // reads the same selection context and can open the selected thread.
  const selectionId = mailbox ? Obj.getURI(mailbox).toString() : attendableId;
  return <Surface.Surface type={AppSurface.Article} data={{ subject: mailbox, attendableId: selectionId }} limit={1} />;
};
