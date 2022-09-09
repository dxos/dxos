//
// Copyright 2021 DXOS.org
//

import { useEffect, useState } from 'react';
import 'setimmediate';
import hash from 'string-hash';

import { useRegistry } from '@dxos/react-registry-client';
import { App, RegistryRecord, ResourceSet } from '@dxos/registry-client';

import { SHOWCASE_APPS } from '../data';

const BASE_URL = 'https://ipfs1.kube.dxos.network/ipfs/';

export interface ShowcaseDemo {
  id: string
  location: string
  title: string
  description: string
  tags: string[]
  image: string
}

const imageGallery = [
  'banner-0.jpg',
  'banner-1.jpg',
  'banner-2.jpg',
  'banner-3.jpg',
  'banner-4.jpg',
  'banner-5.jpg',
  'banner-6.jpg',
  'banner-7.jpg',
  'banner-8.jpg',
  'banner-9.jpg'
];

const getDefaultImage = (hashParam: Uint8Array) => {
  const hashString = hashParam.toString();
  const number = hash(hashString); // number
  return `/img/showcase/${imageGallery[number % imageGallery.length]}`;
};

// TODO(zarco): use random images provided by Rich.
export const useShowcaseDemos = () => {
  const [demos, setDemos] = useState<ShowcaseDemo[]>([]);
  const registry = useRegistry();

  useEffect(() => {
    setImmediate(async () => {
      const resources = await registry.listResources();
      const resourceRecords = await Promise.all(
        resources.map(async resource => {
          // TODO(wittjosiah): Factor out filtering of bad data to registry-client.
          try {
            const record = await registry.getRecordByName(resource.name.with({ tag: 'latest' }));
            return { resource, record };
          } catch (error: any) {
            console.log(`Failed to get record [${resource.name.toString()}]: ${error.message}`);
          }
        })
      );

      const demos: ShowcaseDemo[] = resourceRecords
        .filter((resourceRecord): resourceRecord is { resource: ResourceSet, record: RegistryRecord<App> } => !!resourceRecord)
        .filter(({ record }) => SHOWCASE_APPS.includes(record.cid.toString()))
        .map(({ resource, record }) => {
          const id = resource.name.toString();
          return { // TODO(zarco): Add a `imageHash` property for record inside `data`.
            id,
            title: record.displayName ?? id,
            description: record.description ?? '',
            location: `${BASE_URL}${record.cid.toString()}`,
            tags: [],
            // TODO(zarco): Assume that an app will have the image in `${BASE_URL}${cid}/preview.png`.
            image: getDefaultImage(record.cid.value)
          };
        });

      setDemos(demos);
    });
  }, []);

  return demos;
};
