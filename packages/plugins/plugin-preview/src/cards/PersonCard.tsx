//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { type MouseEvent, useCallback } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import * as EffectEx from '@dxos/effect/EffectEx';
import { Attention } from '@dxos/react-ui-attention/types';
import * as Card from '@dxos/react-ui/Card';
import { type Person } from '@dxos/types';

export const PersonCard = ({ subject }: AppSurface.ObjectCardProps<Person.Person>) => {
  const { invoke } = Hooks.useOperationInvoker();
  const [{ fullName: name, image, emails = [], organization: organizationRef }] = useObject(subject);
  const [organizationName] = useObject(organizationRef, 'name');

  const handleOrganizationClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      // The row sits inside cards that are themselves clickable (e.g., Kanban); keep the click to the row.
      event.stopPropagation();
      const organization = organizationRef?.target;
      if (!organization) {
        return;
      }

      const pivotId = Attention.getRootAttendableId(event.currentTarget);
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
    },
    [invoke, organizationRef],
  );

  return (
    <Card.Body>
      {image && (
        <Card.Row>
          {/* A square headshot up to the poster cap, so a face is neither stretched nor cropped to a banner. */}
          <Card.Poster alt={name ?? ''} src={image} aspectRatio='1 / 1' classNames='w-full max-w-[200px] rounded-sm' />
        </Card.Row>
      )}
      {organizationName && (
        <Card.Row icon='ph--buildings--regular' onClick={handleOrganizationClick}>
          <Card.Text truncate>{organizationName}</Card.Text>
        </Card.Row>
      )}
      {emails.length > 0 && (
        <Card.Row icon='ph--at--regular'>
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
