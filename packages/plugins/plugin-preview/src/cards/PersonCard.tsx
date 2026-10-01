//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useCallback, useRef } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { Attention } from '@dxos/react-ui-attention/types';
import { Next } from '@dxos/react-ui/next';
import { type Person } from '@dxos/types';

export const PersonCard = ({ subject }: AppSurface.ObjectCardProps<Person.Person>) => {
  const { invoke } = useOperationInvoker();
  // Card.Action's onClick carries no event, so resolve the origin plank from the card element itself.
  const cardRef = useRef<HTMLDivElement>(null);
  const { image, organization: { target: organization } = {}, emails = [] } = subject;

  const handleOrganizationClick = useCallback(() => {
    if (!organization) {
      return;
    }

    const pivotId = cardRef.current ? Attention.getRootAttendableId(cardRef.current) : undefined;
    return Effect.gen(function* () {
      const organizationPath = GraphPath.getObjectPathFromObject(organization);
      const db = Obj.getDatabase(organization);
      yield* invoke(LayoutOperation.UpdatePopover, { state: false, anchorId: '' });
      yield* invoke(LayoutOperation.Open, {
        subject: [organizationPath],
        pivotId,
        disposition: 'add',
        workspace: db ? GraphPath.getSpacePath(db.spaceId) : undefined,
      });
    }).pipe(EffectEx.runAndForwardErrors);
  }, [invoke, organization]);

  return (
    <Next.Card.Body ref={cardRef}>
      {image && (
        <Next.Card.Row>
          <Next.Avatar.Root
            src={image}
            icon='ph--user--regular'
            size={20}
            classNames={[!image && 'opacity-50']}
            hue='neutral'
            variant='square'
          />
        </Next.Card.Row>
      )}
      {organization?.name && (
        <Next.Card.Action icon='ph--buildings--regular' label={organization.name} onClick={handleOrganizationClick} />
      )}
      {emails.length > 0 && (
        <Next.Card.Row>
          <Next.Block>
            <Next.Icon icon='ph--at--regular' />
          </Next.Block>
          <Next.Card.Text truncate classNames='text-sky-text text-sm'>
            {emails.map(({ value }) => (
              <div key={value}>{value}</div>
            ))}
          </Next.Card.Text>
        </Next.Card.Row>
      )}
    </Next.Card.Body>
  );
};
