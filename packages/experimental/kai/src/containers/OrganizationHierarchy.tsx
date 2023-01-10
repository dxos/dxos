//
// Copyright 2023 DXOS.org
//

import { Buildings } from 'phosphor-react';
import React from 'react';

import { id } from '@dxos/echo-schema';
import { useQuery, withReactor } from '@dxos/react-client';

import { Card, FolderHierarchy, FolderHierarchyItem } from '../components';
import { useSpace } from '../hooks';
import { Organization } from '../proto';
import { mapProjectToItem } from './ProjectHierarchy';

export const mapOrganizationToItem = (organization: Organization): FolderHierarchyItem => ({
  id: organization[id],
  title: organization.name,
  Icon: Buildings,
  items: organization.projects?.map((project) => mapProjectToItem(project))
});

export const OrganizationHierarchy = withReactor(() => {
  const { space } = useSpace();
  // TODO(burdon): useQuery should not return undefined.
  // TODO(burdon): Need subscription for children.
  const organizations = useQuery(space, Organization.filter()) ?? [];
  const items = organizations.map((organization) => mapOrganizationToItem(organization));

  return (
    <Card scrollbar>
      <div className='mt-2'>
        <FolderHierarchy items={items} highlightClassName='bg-slate-200' />
      </div>
    </Card>
  );
});
