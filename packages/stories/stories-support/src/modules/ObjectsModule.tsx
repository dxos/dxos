//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { Filter } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { Organization, Person } from '@dxos/types';

import { ListModule, type ListRow } from './ListModule.tsx';
import { useSupport } from './SupportContext.tsx';

/** The CRM graph: the people and organizations the messages came from, and the canonical documents. */
export const ObjectsModule = () => {
  const db = useSupport()?.space.db;
  const people = useQuery(db, Filter.type(Person.Person));
  const organizations = useQuery(db, Filter.type(Organization.Organization));
  const documents = useQuery(db, Filter.type(Markdown.Document));
  const rows = useMemo<ListRow[]>(
    () => [
      ...people.map((person) => ({
        id: person.id,
        label: person.fullName ?? person.emails?.[0]?.value ?? person.id,
        description: `Person: ${person.emails?.[0]?.value ?? 'no address'}`,
        icon: 'ph--user--regular',
      })),
      ...organizations.map((organization) => ({
        id: organization.id,
        label: organization.name ?? organization.id,
        description: `Organization: ${organization.website ?? 'no website'}`,
        icon: 'ph--building-office--regular',
      })),
      ...documents.map((document) => ({
        id: document.id,
        label: document.name ?? document.id,
        description: 'Canonical document',
        icon: 'ph--text-aa--regular',
      })),
    ],
    [people, organizations, documents],
  );
  return <ListModule title='Objects' rows={rows} empty='No objects yet.' testId='support.objects' />;
};
