//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { Filter, Obj, Relation } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { DraftMessage, Message } from '@dxos/types';

import { Cites } from '../types/index.ts';
import { ListModule, type ListRow } from './ListModule.tsx';
import { useSupport } from './SupportContext.tsx';

/** The replies drafted for the mailbox, each with the document and section it cites. */
export const DraftsModule = () => {
  const support = useSupport();
  const messages = useQuery(support?.space.db, Filter.type(Message.Message));
  const citations = useQuery(support?.space.db, Filter.type(Cites.Cites));
  const rows = useMemo<ListRow[]>(() => {
    if (!support) {
      return [];
    }
    const mailbox = Obj.getURI(support.mailbox);
    const cited = new Map(
      citations.map((citation) => [
        Relation.getSource(citation).id,
        `${Obj.getLabel(Relation.getTarget(citation)) ?? 'Document'}: ${citation.heading}`,
      ]),
    );
    return messages
      .filter((message) => DraftMessage.belongsTo(message, mailbox))
      .sort((first, second) => second.created.localeCompare(first.created))
      .map((draft) => ({
        id: draft.id,
        label: String(draft.properties?.subject ?? 'Draft'),
        description: cited.has(draft.id) ? `Cites ${cited.get(draft.id)}` : Message.extractText(draft),
        icon: 'ph--pencil-simple-line--regular',
      }));
  }, [support, messages, citations]);
  return <ListModule title='Drafts' rows={rows} empty='No drafts yet.' testId='support.drafts' />;
};
