//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useCallback, useRef } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import * as EffectEx from '@dxos/effect/EffectEx';
import { Attention } from '@dxos/react-ui-attention/types';
import * as Avatar from '@dxos/react-ui/Avatar';
import * as Card from '@dxos/react-ui/Card';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import { type Person } from '@dxos/types';

export const PersonCard = ({ subject }: AppSurface.ObjectCardProps<Person.Person>) => {
  const { invoke } = Hooks.useOperationInvoker();
  // Card.Action's onClick carries no event, so resolve the origin plank from the card element itself.
  const cardRef = useRef<HTMLDivElement>(null);
  const [{ image, organization: organizationRef, emails = [] }] = useObject(subject);
  const [organizationName] = useObject(organizationRef, 'name');

  const handleOrganizationClick = useCallback(() => {
    const organization = organizationRef?.target;
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
  }, [invoke, organizationRef]);

  return (
    <Card.Body ref={cardRef}>
      {image && (
        <Card.Row>
          <Avatar.Root
            src={image}
            icon='ph--user--regular'
            size='xl'
            classNames={[!image && 'opacity-50']}
            hue='neutral'
            variant='square'
          />
        </Card.Row>
      )}
      {organizationName && (
        <Card.Action icon='ph--buildings--regular' label={organizationName} onClick={handleOrganizationClick} />
      )}
      {emails.length > 0 && (
        <Card.Row>
          <Layout.Block>
            <Icon.Icon icon='ph--at--regular' />
          </Layout.Block>
          <Card.Text truncate classNames='text-sky-text text-sm'>
            {emails.map(({ value }) => (
              <div key={value}>{value}</div>
            ))}
          </Card.Text>
        </Card.Row>
      )}
    </Card.Body>
  );
};
