//
// Copyright 2026 DXOS.org
//

import { type CapabilityManager } from '@dxos/app-framework';
import { AppCapabilities, GraphPath } from '@dxos/app-toolkit';
import { type GraphBuilder } from '@dxos/plugin-graph';

/**
 * The path under which the nav tree shows an object surfaced by a type section
 * (`TypeSection.createTypeSectionExtension`): `root/<space>/[<group>/]<typename>/<id>`. Derived from
 * the graph builder's registered url bindings rather than per-plugin wiring — a type section declares
 * a static `path` ending in its typename, so the declaration every section already makes for URL
 * resolution also answers "where does this type live in the tree". Returns undefined when no active
 * extension declares a section for the typename.
 */
export const findTypeSectionPath = (
  extensions: Iterable<Pick<GraphBuilder.BuilderExtension, 'url'>>,
  { spaceId, typename, objectId }: { spaceId: string; typename: string; objectId: string },
): string | undefined => {
  for (const extension of extensions) {
    const url = extension.url;
    // Only item bindings with a static path locate objects at a fixed depth; dynamic resolvers
    // (nested collections) and singletons (settings pages) address other shapes.
    if (url?.kind === 'item' && Array.isArray(url.path) && url.path.at(-1) === typename) {
      return GraphPath.getSpacePath(spaceId, ...url.path, objectId);
    }
  }
  return undefined;
};

/** {@link findTypeSectionPath} against the app graph's live extension registry, absent-graph safe. */
export const resolveTypeSectionPath = (
  capabilities: CapabilityManager.CapabilityManager,
  params: { spaceId: string; typename: string; objectId: string },
): string | undefined => {
  const builder = capabilities.getAll(AppCapabilities.AppGraph).at(0);
  return builder ? findTypeSectionPath(Object.values(builder.getExtensions()), params) : undefined;
};
