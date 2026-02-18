//
// Copyright 2025 DXOS.org
//

import React, { type FC, useMemo } from 'react';

import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import { Obj, Ref } from '@dxos/echo';
import { faker } from '@dxos/random';
import { Card } from '@dxos/react-ui-mosaic';
import { CardContainer } from '@dxos/react-ui-mosaic/testing';
import { Organization, Person, Pipeline, Task } from '@dxos/types';

export type DefaultStoryProps<T extends Obj.Any> = {
  Component: FC<SurfaceComponentProps<T>>;
  createObject: () => T;
  image?: boolean;
};

export const DefaultStory = <T extends Obj.Any>({ Component, createObject, image }: DefaultStoryProps<T>) => {
  // TODO(wittjosiah): ECHO objects don't work when passed via Storybook args.
  const object = useMemo(() => createObject(), [createObject]);
  const roles: SurfaceComponentProps['role'][] = ['card--intrinsic', 'card--popover'];

  return (
    <div className='bs-full grid grid-rows-2 p-16 gap-16'>
      {roles.map((role, i) => (
        <div key={i} className='flex bs-full justify-center overflow-hidden'>
          <div className='flex flex-col gap-4 is-full items-center'>
            <label className='text-sm text-description'>{role}</label>
            <CardContainer role={role}>
              <Card.Root border={false}>
                <Component role={role} subject={image ? object : omitImage(object)} />
              </Card.Root>
            </CardContainer>
          </div>
        </div>
      ))}
    </div>
  );
};

export const omitImage = ({ image: _, ...rest }: any) => rest;

/**
 * Factory functions for creating test objects at render time.
 */
export const createOrganization = (): Organization.Organization =>
  Obj.make(Organization.Organization, {
    name: faker.company.name(),
    image:
      'https://plus.unsplash.com/premium_photo-1672116452571-896980a801c8?q=80&w=2671&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    website: faker.internet.url(),
    description: faker.lorem.paragraph(),
  });

export const createPerson = (): Person.Person => {
  const organization = createOrganization();
  return Obj.make(Person.Person, {
    fullName: faker.person.fullName(),
    image:
      'https://plus.unsplash.com/premium_photo-1664536392779-049ba8fde933?q=80&w=2574&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    organization: Ref.make(organization),
    emails: [
      { label: 'Work', value: faker.internet.email() },
      { label: 'Work', value: faker.internet.email() },
      { label: 'Work', value: faker.internet.email() },
    ],
  });
};

export const createProject = (): Pipeline.Pipeline =>
  Obj.make(Pipeline.Pipeline, {
    name: faker.person.fullName(),
    image: 'https://dxos.network/dxos-logotype-blue.png',
    description: faker.lorem.paragraph(),
    columns: [],
  });

export const createTask = (): Task.Task =>
  Obj.make(Task.Task, {
    title: faker.lorem.sentence(),
    status: faker.helpers.arrayElement(['todo', 'in-progress', 'done'] as const),
  });
