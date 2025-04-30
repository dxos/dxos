//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { List } from '@dxos/react-ui';

import { IntegrationDefinitionItem } from './IntegrationDefinitionItem';
import { useIntegrations } from '../hooks';
import { type IntegrationDefinition, type IntegrationQuery } from '../types';

export type IntegrationRegistryProps = {
  query?: IntegrationQuery;
  onConfigure?: (integration: IntegrationDefinition) => void;
};

export const IntegrationRegistry = ({ query, onConfigure }: IntegrationRegistryProps) => {
  const integrations = useIntegrations(query);

  return (
    <List classNames='container-max-width grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] auto-rows-[10rem] gap-3 p-3'>
      {integrations.map((integration) => (
        <div key={integration.serviceId} className='flex'>
          <IntegrationDefinitionItem integration={integration} onConfigure={onConfigure} />
        </div>
      ))}
    </List>
  );
};
