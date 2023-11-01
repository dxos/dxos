//
// Copyright 2023 DXOS.org
//

import type { Plugin } from '../PluginHost';

export type Metadata = Record<string, any>;

export type MetadataRecordsProvides = {
  metadata: {
    records: Record<string, Metadata>;
  };
};

export type MetadataResolver = (type: string) => Metadata;

export type MetadataResolverProvides = {
  metadata: {
    resolver: MetadataResolver;
  };
};

export const parseMetadataRecordsPlugin = (plugin: Plugin) => {
  return (plugin.provides as any).metadata?.records ? (plugin as Plugin<MetadataRecordsProvides>) : undefined;
};

export const parseMetadataResolverPlugin = (plugin: Plugin) => {
  return (plugin.provides as any).metadata?.resolver ? (plugin as Plugin<MetadataResolverProvides>) : undefined;
};
