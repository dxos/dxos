//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import { Avatar } from '@dxos/react-ui';
import { Card } from '@dxos/react-ui-mosaic';
import { type Person } from '@dxos/types';

export const PersonCard = ({ subject }: SurfaceComponentProps<Person.Person>) => {
  const { image, organization: { target: organization } = {}, emails = [] } = subject;

  return (
    <Avatar.Root>
      <Card.Content>
        {image && (
          <Card.Row className='py-1'>
            <Avatar.Content
              imgSrc={image}
              icon='ph--user--regular'
              size={16}
              classNames={!image && 'opacity-50'}
              hue='neutral'
              variant='square'
            />
          </Card.Row>
        )}
        {organization?.name && (
          <Card.Action
            icon='ph--buildings--regular'
            label={organization.name}
            // onClick={onSelect ? () => onSelect(organization) : undefined}
          />
        )}
        {emails.map(({ value }) => (
          <Card.Row key={value} icon='ph--at--regular'>
            <Card.Text truncate className='text-primaryText'>
              {value}
            </Card.Text>
          </Card.Row>
        ))}
      </Card.Content>
    </Avatar.Root>
  );
};
