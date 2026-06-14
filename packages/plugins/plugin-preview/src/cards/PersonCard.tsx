//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useCallback } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation, getObjectPathFromObject, getSpacePath } from '@dxos/app-toolkit';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { Avatar } from '@dxos/react-ui';
import { Card, Icon } from '@dxos/react-ui';
import { type Person } from '@dxos/types';

export const PersonCard = ({ subject }: AppSurface.ObjectCardProps<Person.Person>) => {
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
    }).pipe(EffectEx.runAndForwardErrors);
  }, [invoke, organization]);

  return (
    <Card.Body>
      {image && (
        <Card.Row>
          <Avatar.Root>
            <Avatar.Content
              imgSrc={image}
              icon='ph--user--regular'
              size={20}
              classNames={[!image && 'opacity-50']}
              hue='neutral'
              variant='square'
            />
          </Avatar.Root>
        </Card.Row>
      )}
      {organization?.name && (
        <Card.Action icon='ph--buildings--regular' label={organization.name} onClick={handleOrganizationClick} />
      )}
      {emails.length > 0 && (
        <Card.Row>
          <Card.Block>
            <Icon icon='ph--at--regular' />
          </Card.Block>
          <Card.Text truncate className='text-primary-text text-sm'>
            {emails.map(({ value }) => (
              <div key={value}>{value}</div>
            ))}
          </Card.Text>
        </Card.Row>
      )}
    </Card.Body>
  );
};
