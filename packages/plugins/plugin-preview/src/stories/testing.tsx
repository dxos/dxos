//
// Copyright 2025 DXOS.org
//

import React, { type FC, useMemo } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, Ref } from '@dxos/echo';
import { random } from '@dxos/random';
import { Card } from '@dxos/react-ui';
import { CardContainer, type CardContainerProps } from '@dxos/react-ui-mosaic/testing';
import { Organization, Person, Pipeline, Task } from '@dxos/types';

export type DefaultStoryProps<T extends Obj.Any> = {
  Component: FC<AppSurface.ObjectCardProps<T>>;
  createObject: () => T;
  image?: boolean;
};

export const DefaultStory = <T extends Obj.Any>({ Component, createObject, image }: DefaultStoryProps<T>) => {
  const object = useMemo(() => createObject(), [createObject]);
  const roles: CardContainerProps['role'][] = ['intrinsic', 'popover'];

  return (
    <div className='h-full w-full grid grid-cols-2 py-16 gap-8'>
      {roles.map((role, i) => (
        <div key={i} className='flex h-full justify-center overflow-hidden'>
          <div className='flex flex-col gap-4 w-full items-center'>
            <span className='text-sm text-description'>{role}</span>
            <CardContainer role={role}>
              <Card.Root border={false}>
                <Card.Toolbar>
                  <Card.DragHandle />
                  <Card.Title>{Obj.getLabel(object)}</Card.Title>
                  <Card.Menu />
                </Card.Toolbar>
                <Component role={role ?? 'card--content'} subject={image ? object : omitImage(object)} />
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
export const createOrganization = (): Organization.Organization => {
  return Obj.make(Organization.Organization, {
    name: random.company.name(),
    image:
      'https://plus.unsplash.com/premium_photo-1672116452571-896980a801c8?q=80&w=2671&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    website: random.internet.url(),
    description: random.lorem.paragraph(),
  });
};

export const createPerson = (): Person.Person => {
  const organization = createOrganization();
  return Obj.make(Person.Person, {
    fullName: random.person.fullName(),
    image:
      'https://plus.unsplash.com/premium_photo-1664536392779-049ba8fde933?q=80&w=2574&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    organization: Ref.make(organization),
    emails: [
      { label: 'Work', value: random.internet.email() },
      { label: 'Work', value: random.internet.email() },
      { label: 'Work', value: random.internet.email() },
    ],
  });
};

export const createProject = (): Pipeline.Pipeline => {
  return Obj.make(Pipeline.Pipeline, {
    name: random.person.fullName(),
    image: 'https://dxos.network/dxos-logotype-blue.png',
    description: random.lorem.paragraph(),
    columns: [],
  });
};

export const createTask = (): Task.Task => {
  return Obj.make(Task.Task, {
    title: random.lorem.sentence(),
    status: random.helpers.arrayElement(['todo', 'in-progress', 'done'] as const),
  });
};
