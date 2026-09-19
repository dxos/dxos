//
// Copyright 2026 DXOS.org
//

import type * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import type * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as TypeSection from '@dxos/app-toolkit/TypeSection';

/**
 * The path under which the nav tree shows an object surfaced by a type section
 * (`TypeSection.createTypeSectionExtension`): the objects binding's path plus the object id. Found from
 * the graph builder's registered extensions rather than per-plugin wiring, so the section declaration
 * already answers "where does this type live in the tree". Returns undefined when no active extension
 * declares a section for the typename.
 */
export const findTypeSectionPath = (
  extensions: Iterable<Pick<AppGraphBuilder.BuilderExtension, 'id' | 'meta'>>,
  { spaceId, typename, objectId }: { spaceId: string; typename: string; objectId: string },
): string | undefined => {
  for (const extension of extensions) {
    if (extension.meta && TypeSection.isSectionObjectsExtension(extension.id, typename)) {
      return GraphPath.getSpacePath(spaceId, ...extension.meta.path, objectId);
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
