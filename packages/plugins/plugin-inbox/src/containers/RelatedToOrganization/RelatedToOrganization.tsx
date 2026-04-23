//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useCallback } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation, getObjectPathFromObject, getSpacePath } from '@dxos/app-toolkit';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj } from '@dxos/echo';
import { runAndForwardErrors } from '@dxos/effect';
import { useDatabase, useQuery } from '@dxos/react-client/echo';
import { Table } from '@dxos/react-ui-table/types';
import { getTypenameFromQuery } from '@dxos/schema';
import { type Organization, Person } from '@dxos/types';

import { RelatedContacts } from '#components';

export const RelatedToOrganization = ({
  subject: organization,
}: AppSurface.ObjectArticleProps<Organization.Organization>) => {
  const { invoke } = useOperationInvoker();
  const db = Obj.getDatabase(organization);
  const defaultDb = useDatabase();
  const currentSpaceContacts = useQuery(db, Filter.type(Person.Person));
  const defaultSpaceContacts = useQuery(defaultDb === db ? undefined : defaultDb, Filter.type(Person.Person));
  const contacts = [...(currentSpaceContacts ?? []), ...(defaultSpaceContacts ?? [])];
  const related = contacts.filter((contact) =>
    typeof contact.organization === 'string' ? false : contact.organization?.target === organization,
  );

  const currentSpaceViews = useQuery(db, Filter.type(Table.Table));
  const defaultSpaceViews = useQuery(defaultDb, Filter.type(Table.Table));
  const currentSpaceContactTable = currentSpaceViews.find(
    (table) => getTypenameFromQuery(table.view.target?.query.ast) === Person.Person.typename,
  );
  const defaultSpaceContactTable = defaultSpaceViews.find(
    (table) => getTypenameFromQuery(table.view.target?.query.ast) === Person.Person.typename,
  );

  // TODO(wittjosiah): Generalized way of handling related objects navigation.
  const handleContactClick = useCallback(
    (contact: Person.Person) =>
      Effect.gen(function* () {
        const contactPath = getObjectPathFromObject(contact);
        yield* invoke(LayoutOperation.UpdatePopover, { state: false, anchorId: '' });
        yield* invoke(LayoutOperation.Open, {
          subject: [contactPath],
          workspace: db ? getSpacePath(db.spaceId) : undefined,
        });
      }).pipe(runAndForwardErrors),
    [invoke, currentSpaceContacts, currentSpaceContactTable, defaultSpaceContactTable, db, defaultDb],
  );

  return <RelatedContacts contacts={related} onContactClick={handleContactClick} />;
};
