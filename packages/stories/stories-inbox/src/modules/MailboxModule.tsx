//
// Copyright 2026 DXOS.org
//

import React, { useEffect } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { GraphPath, NotFound } from '@dxos/app-toolkit';
import { AppSurface, useActiveSpace, useAppGraph } from '@dxos/app-toolkit/ui';
import { Filter } from '@dxos/echo';
import { Mailbox } from '@dxos/plugin-inbox';
import { type Space, useQuery } from '@dxos/react-client/echo';
import { AttendableContainer } from '@dxos/react-ui-attention';

/** LEFT: the mailbox article (includes the connect/sync auth button). */
export const MailboxModule = ({ data }: { data?: { attendableId?: string } }) => {
  const space = useActiveSpace();
  if (!space) {
    return null;
  }
  return <MailboxModuleContainer space={space} attendableId={data?.attendableId} />;
};

const MailboxModuleContainer = ({ space, attendableId }: { space: Space; attendableId?: string }) => {
  const [mailbox] = useQuery(space.db, Filter.type(Mailbox.Mailbox));
  const { graph } = useAppGraph();
  // Scope the article's selection to the mailbox object rather than this cell's positional
  // attendableId, so the sibling MessageModule cell (a separate ModuleContainer attention target)
  // reads the same selection context and can open the selected thread.
  const selectionId = mailbox ? GraphPath.getObjectPathFromObject(mailbox) : attendableId;
  useEffect(() => {
    // This story renders the article outside the NavTree, whose traversal normally materializes the
    // mailbox's graph node as a side effect. Without that, graph.actions(id) — which the connector
    // plugin's "Connect" action depends on — always returns empty.
    if (mailbox) {
      NotFound.expandPath(graph, GraphPath.getObjectPathFromObject(mailbox));
    }
  }, [graph, mailbox]);

  const surface = (
    <Surface.Surface type={AppSurface.Article} data={{ subject: mailbox, attendableId: selectionId }} limit={1} />
  );

  // `ModuleContainer` makes each cell attendable under its *positional* id, but the article advertises
  // the mailbox object path (above), so without this the article is never the attended entity and
  // anything gated on attention — toolbar menus, selection — stays inert. `contents` keeps the
  // attendable out of the layout so the cell's height chain is unaffected.
  return selectionId ? (
    <AttendableContainer id={selectionId} classNames='contents'>
      {surface}
    </AttendableContainer>
  ) : (
    surface
  );
};
