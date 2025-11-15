//
// Copyright 2025 DXOS.org
//

import { Filter, Query, Ref, Type } from '@dxos/echo';
import { Mailbox } from '@dxos/plugin-inbox/types';
import { Markdown } from '@dxos/plugin-markdown/types';
import { type Space } from '@dxos/react-client/echo';
import { View } from '@dxos/schema';
import { Message, Organization, Person, Project } from '@dxos/types';

export const createResearchProject = async (space: Space, name?: string): Promise<Project.Project | null> => {
  const { objects: mailboxes } = await space.db.query(Filter.type(Mailbox.Mailbox)).run();
  if (!mailboxes.length) {
    return null;
  }

  const mailbox = mailboxes[0];
  const mailboxView = View.make({
    query: Query.select(Filter.type(Message.Message)).options({
      queues: [mailbox.queue.dxn.toString()],
    }),
    jsonSchema: Type.toJsonSchema(Message.Message),
  });

  const contactsQuery = Query.select(Filter.type(Person.Person));
  const contactsView = View.make({
    query: contactsQuery,
    jsonSchema: Type.toJsonSchema(Person.Person),
  });

  const organizationsQuery = Query.select(Filter.type(Organization.Organization));
  const organizationsView = View.make({
    query: organizationsQuery,
    jsonSchema: Type.toJsonSchema(Organization.Organization),
  });

  const notesQuery = Query.select(Filter.type(Markdown.Document));
  const notesView = View.make({
    query: notesQuery,
    jsonSchema: Type.toJsonSchema(Markdown.Document),
  });

  return Project.make({
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
