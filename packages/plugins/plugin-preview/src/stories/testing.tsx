//
// Copyright 2025 DXOS.org
//

import React, { type FC } from 'react';

import { Obj, Ref } from '@dxos/echo';
import { faker } from '@dxos/random';
import { CardContainer } from '@dxos/react-ui-stack/testing';
import { Organization, Person, Task } from '@dxos/types';
import { Project } from '@dxos/types';

import { FormCard, OrganizationCard, PersonCard, ProjectCard, TaskCard } from '../cards';
import { type CardPreviewProps } from '../types';

type CardProps<T extends Obj.Any> = {
  Component: FC<CardPreviewProps<T>>;
  subject: T;
  icon?: string;
  image?: boolean;
};

export type DefaultstoryProps = {
  role: 'card--popover' | 'card--intrinsic' | 'card--extrinsic' | 'card--transclusion';
  cards: CardProps<any>[];
};

export const Defaultstory = ({ role, cards }: DefaultstoryProps) => {
  return (
    <div className='flex bs-full'>
      <div className='flex shrink-0 gap-8 overflow-x-auto pbe-4'>
        {cards.map(({ Component, icon, image, subject }, i) => (
          <div key={i} className='flex is-[24rem] justify-center'>
            <CardContainer icon={icon} role={role}>
              <Component role={role} subject={image ? subject : omitImage(subject)} />
            </CardContainer>
          </div>
        ))}
      </div>
    </div>
  );
};

export const omitImage = ({ image: _, ...rest }: any) => rest;

// TODO(burdon): Test data should exercise the standard data generators.
export const createCards = (image = true): CardProps<any>[] => {
  const organization = Obj.make(Organization.Organization, {
    name: faker.company.name(),
    image:
      'https://plus.unsplash.com/premium_photo-1672116452571-896980a801c8?q=80&w=2671&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    website: faker.internet.url(),
    description: faker.lorem.paragraph(),
  });

  const contact = Obj.make(Person.Person, {
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

  const project = Project.make({
    name: faker.person.fullName(),
    image: 'https://dxos.network/dxos-logotype-blue.png',
    description: faker.lorem.paragraph(),
  });

  const task = Obj.make(Task.Task, {
    title: faker.lorem.sentence(),
    status: faker.helpers.arrayElement(['todo', 'in-progress', 'done']),
  });

  return [
    {
      Component: OrganizationCard,
      subject: organization,
      icon: 'ph--building-office--regular',
      image,
    },
    {
      Component: PersonCard,
      subject: contact,
      icon: 'ph--user--regular',
      image,
    },
    {
      Component: ProjectCard,
      subject: project,
      icon: 'ph--building--regular',
      image,
    },
    {
      Component: TaskCard,
      subject: task,
      icon: 'ph--list-checks--regular',
      image,
    },
    {
      Component: FormCard,
      subject: contact,
      icon: 'ph--user--regular',
      image,
    },
  ];
};
