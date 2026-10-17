//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useCallback } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { Filter, Obj, Query } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import * as EffectEx from '@dxos/effect/EffectEx';
import * as Card from '@dxos/react-ui/Card';
import { type Organization, Person } from '@dxos/types';

import { RelatedContacts } from '#components';

export const RelatedToOrganization = ({
  subject: organization,
}: AppSurface.ObjectArticleProps<Organization.Organization>) => {
  const { invoke } = Hooks.useOperationInvoker();
  const [cardRef, pivotId] = ToolkitHooks.useCardPivot();
  const db = Obj.getDatabase(organization);

  const related = useQuery(db, Query.select(Filter.id(organization.id)).referencedBy(Person.Person, 'organization'));

  // TODO(wittjosiah): Generalized way of handling related objects navigation.
  const handleContactClick = useCallback(
    (contact: Person.Person) =>
      Effect.gen(function* () {
        const contactPath = GraphPath.getObjectPathFromObject(contact);
        yield* invoke(LayoutOperation.UpdatePopover, { state: false, anchorId: '' });
        yield* invoke(LayoutOperation.Open, {
          subject: [contactPath],
          pivotId,
          disposition: 'add',
          workspace: db ? GraphPath.getSpacePath(db.spaceId) : undefined,
        });
      }).pipe(EffectEx.runAndForwardErrors),
    [invoke, db, pivotId],
  );

  return (
    <Card.Body ref={cardRef}>
      <RelatedContacts contacts={related} onContactClick={handleContactClick} />
    </Card.Body>
  );
};

RelatedToOrganization.displayName = 'RelatedToOrganization';
