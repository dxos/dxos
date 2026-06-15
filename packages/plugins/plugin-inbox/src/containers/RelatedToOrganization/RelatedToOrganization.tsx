//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useCallback } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation, getObjectPathFromObject, getSpacePath } from '@dxos/app-toolkit';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Type } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { useQuery } from '@dxos/react-client/echo';
import { Table } from '@dxos/react-ui-table/types';
import { getTypeURIFromQuery } from '@dxos/schema';
import { type Organization, Person } from '@dxos/types';

import { RelatedContacts } from '#components';

export const RelatedToOrganization = ({
  subject: organization,
}: AppSurface.ObjectArticleProps<Organization.Organization>) => {
  const { invoke } = useOperationInvoker();
  const db = Obj.getDatabase(organization);

  const contacts = useQuery(db, Filter.type(Person.Person));
  const related = contacts.filter((contact) =>
    typeof contact.organization === 'string' ? false : contact.organization?.target === organization,
  );

  const spaceViews = useQuery(db, Filter.type(Table.Table));
  const spaceContactTable = spaceViews.find(
    (table) => getTypeURIFromQuery(table.view.target?.query?.ast) === Type.getURI(Person.Person),
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
      }).pipe(EffectEx.runAndForwardErrors),
    [invoke, db, contacts, spaceContactTable],
  );

  return <RelatedContacts contacts={related} onContactClick={handleContactClick} />;
};
