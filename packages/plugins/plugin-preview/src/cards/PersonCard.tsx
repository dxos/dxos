//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useCallback } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation, getObjectPathFromObject, getSpacePath } from '@dxos/app-toolkit';
import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { runAndForwardErrors } from '@dxos/effect';
import { Avatar } from '@dxos/react-ui';
import { Card } from '@dxos/react-ui';
import { type Person } from '@dxos/types';

export const PersonCard = ({ subject }: SurfaceComponentProps<Person.Person>) => {
  const { invoke } = useOperationInvoker();
  const { image, organization: { target: organization } = {}, emails = [] } = subject;

  const handleOrganizationClick = useCallback(() => {
    if (!organization) {
      return;
    }

    return Effect.gen(function* () {
      const organizationPath = getObjectPathFromObject(organization);
      const db = Obj.getDatabase(organization);
      yield* invoke(LayoutOperation.UpdatePopover, { state: false, anchorId: '' });
      yield* invoke(LayoutOperation.Open, {
        subject: [organizationPath],
        workspace: db ? getSpacePath(db.spaceId) : undefined,
      });
    }).pipe(runAndForwardErrors);
  }, [invoke, organization]);

  return (
    <Card.Content>
      <Avatar.Root>
        {image && (
          <Card.Row className='py-1'>
            <Avatar.Content
              imgSrc={image}
              icon='ph--user--regular'
              size={20}
              classNames={!image && 'opacity-50'}
              hue='neutral'
              variant='square'
            />
          </Card.Row>
        )}
        {organization?.name && (
          <Card.Action icon='ph--buildings--regular' label={organization.name} onClick={handleOrganizationClick} />
        )}
        {emails.map(({ value }) => (
          <Card.Row key={value} icon='ph--at--regular'>
            <Card.Text truncate className='text-primary-text'>
              {value}
            </Card.Text>
          </Card.Row>
        ))}
      </Avatar.Root>
    </Card.Content>
  );
};
