//
// Copyright 2025 DXOS.org
//

import type { Meta } from '@storybook/react-vite';
import React, { type FC } from 'react';

import { Obj, Ref } from '@dxos/echo';
import { faker } from '@dxos/random';
import { CardContainer } from '@dxos/react-ui-stack/testing';
import { DataType } from '@dxos/schema';

import type { PreviewProps } from '../types';

faker.seed(1234);

export type StoryProps = {
  Component: FC<PreviewProps<any>>;
  icon?: string;
  withImage?: boolean;
  subject: 'project' | 'contact' | 'organization';
  role: 'popover' | 'card--intrinsic' | 'card--extrinsic' | 'transclusion';
};

export const render: Meta<StoryProps>['render'] = ({
  Component,
  icon = 'ph--placeholder--regular',
  role,
  withImage,
  subject,
  ...args
}) => {
  return (
    <CardContainer icon={icon} role={role}>
      <Component {...args} subject={withImage ? data[subject] : omitImage(data[subject])} role={role} />
    </CardContainer>
  );
};

export const omitImage = ({ image, ...rest }: any) => rest;

export const data = (() => {
  const organization = Obj.make(DataType.Organization, {
    name: faker.company.name(),
    image:
      'https://plus.unsplash.com/premium_photo-1672116452571-896980a801c8?q=80&w=2671&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    website: faker.internet.url(),
    description: faker.lorem.paragraph(),
  });

  const contact = Obj.make(DataType.Person, {
    fullName: faker.person.fullName(),
    image:
      'https://plus.unsplash.com/premium_photo-1664536392779-049ba8fde933?q=80&w=2574&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    organization: Ref.make(organization),
    emails: [
      {
        label: 'Work',
        value: faker.internet.email(),
      },
      {
        label: 'Work',
        value: faker.internet.email(),
      },
      {
        label: 'Work',
        value: faker.internet.email(),
      },
    ],
  });

  const project = Obj.make(DataType.Project, {
    name: faker.person.fullName(),
    image: 'https://dxos.network/dxos-logotype-blue.png',
    description: faker.lorem.paragraph(),
  });

  return { organization, contact, project };
})();
