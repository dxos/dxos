//
// Copyright 2026 DXOS.org
//

import React, { useEffect } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { NotFound, Paths } from '@dxos/app-toolkit';
import { AppSurface, useAppGraph } from '@dxos/app-toolkit/ui';
import { Filter } from '@dxos/echo';
import { Mailbox } from '@dxos/plugin-inbox';
import { useQuery } from '@dxos/react-client/echo';
import { type ModuleProps } from '@dxos/story-modules';

/** LEFT: the mailbox article (includes the connect/sync auth button). */
export const MailboxModule = ({ space, attendableId }: ModuleProps) => {
  const [mailbox] = useQuery(space.db, Filter.type(Mailbox.Mailbox));
  const { graph } = useAppGraph();
  // Scope the article's selection to the mailbox object rather than this cell's positional
  // attendableId, so the sibling MessageModule cell (a separate ModuleContainer attention target)
  // reads the same selection context and can open the selected thread.
  const selectionId = mailbox ? Paths.getObjectPathFromObject(mailbox) : attendableId;
  useEffect(() => {
    // This story renders the article outside the NavTree, whose traversal normally materializes the
    // mailbox's graph node as a side effect. Without that, graph.actions(id) — which the connector
    // plugin's "Connect" action depends on — always returns empty.
    if (mailbox) {
      NotFound.expandPath(graph, Paths.getObjectPathFromObject(mailbox));
    }
  }, [graph, mailbox]);
  return <Surface.Surface type={AppSurface.Article} data={{ subject: mailbox, attendableId: selectionId }} limit={1} />;
};
