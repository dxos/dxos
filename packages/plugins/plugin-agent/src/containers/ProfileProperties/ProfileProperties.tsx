//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { type Organization, type Person } from '@dxos/types';

import { ProfileGraph } from '#components';

import { useProfileKnowledge } from '../useProfileKnowledge.ts';

export type ProfilePropertiesProps = AppSurface.ObjectPropertiesProps<Person.Person | Organization.Organization>;

/** The goals and active memories autonomous agents hold about a person or organization. */
export const ProfileProperties = ({ subject }: ProfilePropertiesProps) => {
  const { goals, memories } = useProfileKnowledge(subject);
  return <ProfileGraph goals={goals} memories={memories} />;
};

ProfileProperties.displayName = 'ProfileProperties';
