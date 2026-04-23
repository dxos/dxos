//
// Copyright 2025 DXOS.org
//

import { type Database, Filter, JsonSchema, Query, Ref } from '@dxos/echo';
import { Mailbox } from '@dxos/plugin-inbox/types';
import { Markdown } from '@dxos/plugin-markdown/types';
import { ViewModel } from '@dxos/schema';
import { Message, Organization, Person, Pipeline } from '@dxos/types';

export const createResearchProject = async (
  db: Database.Database,
  name?: string,
): Promise<Pipeline.Pipeline | null> => {
  const mailboxes = await db.query(Filter.type(Mailbox.Mailbox)).run();
  const mailbox = mailboxes[0];
  const feed = await mailbox?.feed?.tryLoad();
  if (!mailbox || !feed) {
    return null;
  }

  const mailboxView = ViewModel.make({
    query: Query.select(Filter.type(Message.Message)).from(feed),
    jsonSchema: JsonSchema.toJsonSchema(Message.Message),
  });

  const contactsQuery = Query.select(Filter.type(Person.Person));
  const contactsView = ViewModel.make({
    query: contactsQuery,
    jsonSchema: JsonSchema.toJsonSchema(Person.Person),
  });

  const organizationsQuery = Query.select(Filter.type(Organization.Organization));
  const organizationsView = ViewModel.make({
    query: organizationsQuery,
    jsonSchema: JsonSchema.toJsonSchema(Organization.Organization),
  });

  const notesQuery = Query.select(Filter.type(Markdown.Document));
  const notesView = ViewModel.make({
    query: notesQuery,
    jsonSchema: JsonSchema.toJsonSchema(Markdown.Document),
  });

  return Pipeline.make({
    name: name ?? 'Research',
    columns: [
      {
        name: 'Mailbox',
        view: Ref.make(mailboxView),
        order: [],
      },
      {
        name: 'Contacts',
        view: Ref.make(contactsView),
        order: [],
      },
      {
        name: 'Organizations',
        view: Ref.make(organizationsView),
        order: [],
      },
      {
        name: 'Notes',
        view: Ref.make(notesView),
        order: [],
      },
    ],
  });
};
