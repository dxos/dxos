import { DXN, MemoryRegistryClient, createMockResourceRecord } from '@dxos/registry-client';

const TYPE_APP = '.dxos.type.App';

export const createMockRegistry = (apps) => {
  const resources = apps.map((app) => {
    const dxn = DXN.parse(app.name);

    return createMockResourceRecord({
      dxn,
      type: TYPE_APP,
      meta: {
        description: app.description
      },
      data: {
        hash: app.hash,
        displayName: app.displayName,
        keywords: app.tags || []
      }
    });
  });

  return new MemoryRegistryClient(resources);
};
