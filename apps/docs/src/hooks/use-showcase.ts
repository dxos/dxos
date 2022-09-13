//
// Copyright 2021 DXOS.org
//

import { useEffect, useState } from 'react';

import { ResourceRecord, RegistryDataRecord, CID } from '@dxos/registry-client';
import { useRegistry } from '@dxos/react-registry-client';

import 'setimmediate';
import hash from 'string-hash';
import { SHOWCASE_APPS } from '../data';

// TODO(wittjosiah): Use proto definitions.
export interface App {
  hash: Uint8Array
  repository?: string
  repositoryVersion?: string
  license?: string
  keywords?: string[]
  displayName?: string
  contentType?: string[]
  extension?: any
}

export type AppResource = ResourceRecord<RegistryDataRecord<App>>;

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
]

const getDefaultImage = (hashParam: Uint8Array) => {
  const hashString = hashParam.toString();
  const number = hash(hashString) // number
  return `/img/showcase/${imageGallery[ number % imageGallery.length]}`
};

// TODO(zarco): use random images provided by Rich.
export const useShowcaseDemos = () => { 
  const [demos, setDemos] = useState<ShowcaseDemo[]>([]);
  const registry = useRegistry();

  useEffect(() => {
    setImmediate(async () => {
      const resources = await registry.queryResources();
      const resourceRecords = await Promise.all(
        resources.map(async resource => {
          // TODO(wittjosiah): Factor out filtering of bad data to registry-client.
          try {
            return await registry.getResourceRecord(resource.id, 'latest');
          } catch (error: any) {
            console.log(`Failed to get record [${resource.id.toString()}]: ${error.message}`);
          }
        })
      );
      
      const demos: ShowcaseDemo[] = resourceRecords
        .filter((resource): resource is AppResource => !!resource)
        .filter(({ resource }) => SHOWCASE_APPS.includes(resource.id.toString()))
        .map(({ resource, record }) => {
          const id = resource.id.toString();
          return { // TODO(zarco): Add a `imageHash` property for record inside `data`.
            id,
            title: record.data.displayName ?? id,
            description: record.meta.description ?? '',
            location: `${BASE_URL}${CID.from(record.data.hash).toString()}`,
            tags: record.data.keywords ?? [],
            // TODO(zarco): Assume that an app will have the image in `${BASE_URL}${cid}/preview.png`.
            image: getDefaultImage(record.data.hash)
          }
        });

      setDemos(demos);
    });
  }, []);

  return demos;
}