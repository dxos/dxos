//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { type Organization, type Person } from '@dxos/types';

import { OrganizationCard, PersonCard } from '../cards';

export type OrganizationCardContentProps = AppSurface.ObjectCardData<Organization.Organization> & {
  role: string;
};

/** Organization and Person cards append a nested `Related` surface, so they compose rather than map. */
export const OrganizationCardContent = ({ role, ...data }: OrganizationCardContentProps) => (
  <>
    <OrganizationCard role={role} subject={data.subject} />
    <Surface.Surface type={AppSurface.Related} data={data} limit={1} />
  </>
);

export type PersonCardContentProps = AppSurface.ObjectCardData<Person.Person> & {
  role: string;
};

export const PersonCardContent = ({ role, ...data }: PersonCardContentProps) => (
  <>
    <PersonCard role={role} subject={data.subject} />
    <Surface.Surface type={AppSurface.Related} data={data} limit={1} />
  </>
);
