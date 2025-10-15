//
// Copyright 2025 DXOS.org
//

import { Filter, Obj, Query, Ref, Tag, Type } from '@dxos/echo';
import { Mailbox } from '@dxos/plugin-inbox/types';
import { Markdown } from '@dxos/plugin-markdown/types';
import { type Space } from '@dxos/react-client/echo';
import { DataType, createView } from '@dxos/schema';

export const orgResearchTemplate = async (space: Space, name?: string): Promise<DataType.Project> => {
  const mailbox = await space.db.query(Filter.type(Mailbox.Mailbox)).first();
  const tag = await space.db.query(Filter.type(Tag.Tag)).first();
  const tagDxn = Obj.getDXN(tag).toString();

  const contactsQuery = Query.select(Filter.type(DataType.Person)).select(Filter.tag(tagDxn));
  const organizationsQuery = Query.select(Filter.type(DataType.Organization)).select(Filter.tag(tagDxn));
  const notesQuery = Query.select(Filter.type(Markdown.Document)).select(Filter.tag(tagDxn));

  const mailboxView = createView({
    name: 'Mailbox',
    query: Query.select(Filter.type(DataType.Message, { properties: { labels: Filter.contains('investor') } })).options(
      {
        queues: [mailbox.queue.dxn.toString()],
      },
    ),
    jsonSchema: Type.toJsonSchema(DataType.Message),
    presentation: Obj.make(DataType.Collection, { objects: [] }),
  });
  const contactsView = createView({
    name: 'Contacts',
    query: contactsQuery,
    jsonSchema: Type.toJsonSchema(DataType.Person),
    presentation: Obj.make(DataType.Collection, { objects: [] }),
  });
  const organizationsView = createView({
    name: 'Organizations',
    query: organizationsQuery,
    jsonSchema: Type.toJsonSchema(DataType.Organization),
    presentation: Obj.make(DataType.Collection, { objects: [] }),
  });
  const notesView = createView({
    name: 'Notes',
    query: notesQuery,
    jsonSchema: Type.toJsonSchema(Markdown.Document),
    presentation: Obj.make(DataType.Collection, { objects: [] }),
  });

  return DataType.makeProject({
    name: name ?? 'Research',
    collections: [mailboxView, contactsView, organizationsView, notesView].map((view) => Ref.make(view)),
  });
};
