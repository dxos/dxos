//
// Copyright 2025 DXOS.org
//

import { ResearchOn } from '@dxos/assistant-testing';
import { Filter, Obj, Query, Ref, Type } from '@dxos/echo';
import { Mailbox } from '@dxos/plugin-inbox/types';
import { Markdown } from '@dxos/plugin-markdown/types';
import { type Space } from '@dxos/react-client/echo';
import { DataType, createView } from '@dxos/schema';

export const orgResearchTemplate = async (space: Space, name?: string): Promise<DataType.Project> => {
  const mailbox = await space.db.query(Filter.type(Mailbox.Mailbox)).first();

  // TODO(wittjosiah): Move filter to a tag.
  const contactsQuery = Query.select(Filter.type(DataType.Person, { jobTitle: 'investor' }));
  const organizationsQuery = contactsQuery.reference('organization');
  const notesQuery = organizationsQuery.targetOf(ResearchOn).source();

  const contactsQueryString = 'Query.select(Filter.type(DataType.Person, { jobTitle: "investor" }))';
  const organizationsQueryString = `${contactsQueryString}.reference("organization")`;
  const notesQueryString = `${organizationsQueryString}.targetOf(ResearchOn).source()`;

  const mailboxView = createView({
    name: 'Mailbox',
    query: Query.select(Filter.type(DataType.Message, { properties: { labels: Filter.contains('investor') } })).options(
      {
        queues: [mailbox.queue.dxn.toString()],
      },
    ),
    queryRaw: 'Query.select(Filter.type(DataType.Message, { properties: { labels: Filter.contains("investor") } }))',
    jsonSchema: Type.toJsonSchema(DataType.Message),
    presentation: Obj.make(DataType.Collection, { objects: [] }),
  });
  const contactsView = createView({
    name: 'Contacts',
    query: contactsQuery,
    queryRaw: contactsQueryString,
    jsonSchema: Type.toJsonSchema(DataType.Person),
    presentation: Obj.make(DataType.Collection, { objects: [] }),
  });
  const organizationsView = createView({
    name: 'Organizations',
    query: organizationsQuery,
    queryRaw: organizationsQueryString,
    jsonSchema: Type.toJsonSchema(DataType.Organization),
    presentation: Obj.make(DataType.Collection, { objects: [] }),
  });
  const notesView = createView({
    name: 'Notes',
    query: notesQuery,
    queryRaw: notesQueryString,
    jsonSchema: Type.toJsonSchema(Markdown.Document),
    presentation: Obj.make(DataType.Collection, { objects: [] }),
  });

  return DataType.makeProject({
    name: name ?? 'Investor Research',
    collections: [mailboxView, contactsView, organizationsView, notesView].map((view) => Ref.make(view)),
  });
};
