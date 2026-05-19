//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { SpecView } from '@dxos/plugin-code/containers';

import { type PluginSpecSubject } from '#meta';

export type PluginSpecArticleProps = {
  role?: string;
  subject: PluginSpecSubject;
  attendableId?: string;
};

/**
 * Read-only renderer for a plugin's bundled `PLUGIN.mdl` spec. Mounted as the
 * article surface for the virtual `root/{REGISTRY_ID}/{pluginId}/spec` graph
 * node — see `app-graph-builder.ts` for the connector that emits it.
 */
export const PluginSpecArticle = ({ role, subject, attendableId }: PluginSpecArticleProps) => (
  <SpecView role={role} attendableId={attendableId} content={subject.content} readOnly />
);
