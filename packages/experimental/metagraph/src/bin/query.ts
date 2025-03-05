import { ServiceType } from '@dxos/plugin-automation/types';
import { RegistryClient } from '../registry/client';
import { REGISTRY_URL } from './config';
import { getSchemaDXN } from '@dxos/echo-schema';

const client = new RegistryClient(REGISTRY_URL);

console.log(
  await client.query({
    type: getSchemaDXN(ServiceType)?.toString(),
  }),
);
