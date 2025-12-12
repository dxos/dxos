//
// Copyright 2025 DXOS.org
//
//
//

import * as Effect from 'effect/Effect';
import React, { useCallback } from 'react';

import { LayoutAction, createIntent } from '@dxos/app-framework';
import { type SurfaceComponentProps, useIntentDispatcher } from '@dxos/app-framework/react';
import { Filter, Obj } from '@dxos/echo';
import { runAndForwardErrors } from '@dxos/effect';
import { AttentionAction } from '@dxos/plugin-attention/types';
import { ATTENDABLE_PATH_SEPARATOR, DeckAction } from '@dxos/plugin-deck/types';
import { useDatabase, useQuery } from '@dxos/react-client/echo';
import { Table } from '@dxos/react-ui-table/types';
import { getTypenameFromQuery } from '@dxos/schema';
import { type Organization, Person } from '@dxos/types';

import { RelatedContacts } from './RelatedContacts';

export const RelatedToOrganization = ({ subject: organization }: SurfaceComponentProps<Organization.Organization>) => {
  const { dispatch } = useIntentDispatcher();
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
        const view = currentSpaceContacts.includes(contact) ? currentSpaceContactTable : defaultSpaceContactTable;
        yield* dispatch(
          createIntent(LayoutAction.UpdatePopover, {
            part: 'popover',
            options: {
              state: false,
              anchorId: '',
            },
          }),
        );
        if (view) {
          const id = Obj.getDXN(view).toString();
          yield* dispatch(
            createIntent(LayoutAction.Open, {
              part: 'main',
              subject: [id],
              options: { workspace: db?.spaceId },
            }),
          );
          yield* dispatch(
            createIntent(DeckAction.ChangeCompanion, {
              primary: id,
              companion: [id, 'selected-objects'].join(ATTENDABLE_PATH_SEPARATOR),
            }),
          );
          yield* dispatch(
            createIntent(AttentionAction.Select, {
              contextId: id,
              selection: { mode: 'multi', ids: [contact.id] },
            }),
          );
        }
      }).pipe(runAndForwardErrors),
    [dispatch, currentSpaceContacts, currentSpaceContactTable, defaultSpaceContactTable, db, defaultDb],
  );

  return <RelatedContacts contacts={related} onContactClick={handleContactClick} />;
};
