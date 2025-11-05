//
// Copyright 2025 DXOS.org
//

import { Filter, Obj, Query, Ref, Type } from '@dxos/echo';
import { Mailbox } from '@dxos/plugin-inbox/types';
import { Markdown } from '@dxos/plugin-markdown/types';
import { type Space } from '@dxos/react-client/echo';
import { DataType } from '@dxos/schema';

export const createResearchProject = async (space: Space, name?: string): Promise<DataType.Project.Project | null> => {
  const { objects: mailboxes } = await space.db.query(Filter.type(Mailbox.Mailbox)).run();
  if (!mailboxes.length) {
    return null;
  }

  const mailbox = mailboxes[0];
  const mailboxView = DataType.View.make({
    name: 'Mailbox',
    query: Query.select(Filter.type(DataType.Message.Message)).options({
      queues: [mailbox.queue.dxn.toString()],
    }),
    jsonSchema: Type.toJsonSchema(DataType.Message.Message),
    presentation: Obj.make(DataType.Collection.Collection, { objects: [] }),
  });

  const contactsQuery = Query.select(Filter.type(DataType.Person.Person));
  const contactsView = DataType.View.make({
    name: 'Contacts',
    query: contactsQuery,
    jsonSchema: Type.toJsonSchema(DataType.Person.Person),
    presentation: Obj.make(DataType.Collection.Collection, { objects: [] }),
  });

  const organizationsQuery = Query.select(Filter.type(DataType.Organization.Organization));
  const organizationsView = DataType.View.make({
    name: 'Organizations',
    query: organizationsQuery,
    jsonSchema: Type.toJsonSchema(DataType.Organization.Organization),
    presentation: Obj.make(DataType.Collection.Collection, { objects: [] }),
  });

  const notesQuery = Query.select(Filter.type(Markdown.Document));
  const notesView = DataType.View.make({
    name: 'Notes',
    query: notesQuery,
    jsonSchema: Type.toJsonSchema(Markdown.Document),
    presentation: Obj.make(DataType.Collection.Collection, { objects: [] }),
  });

  return DataType.Project.make({
    name: name ?? 'Research',
    collections: [mailboxView, contactsView, organizationsView, notesView].map((view) => Ref.make(view)),
  });
};
