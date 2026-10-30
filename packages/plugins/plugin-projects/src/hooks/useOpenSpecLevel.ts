//
// Copyright 2026 DXOS.org
//

import { useCallback } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import type * as Project from '@dxos/compute/Project';
import * as Spec from '@dxos/compute/Spec';
import { Obj } from '@dxos/echo';

import { type Feature, FeatureMap } from '#types';

import { getSpecLevelPath } from '../paths.ts';

/**
 * Opens one level of the project's specs the way the nav tree does, beside `pivotId` when the deck already slides: a
 * spec the project owns, or the breakdown of a feature beneath one; `subfeatureId` opens a feature on that level's map.
 */
export const useOpenSpecLevel = (project: Project.Project, pivotId: string | undefined) => {
  const { invokePromise } = Hooks.useOperationInvoker();
  return useCallback(
    (level: Spec.Spec | Feature.Feature, subfeatureId?: string) => {
      const spaceId = Obj.getDatabase(project)?.spaceId;
      const root = Spec.instanceOf(level) ? level : FeatureMap.findRoot(level);
      if (!spaceId || !root) {
        return;
      }
      const lineage = Spec.instanceOf(level) ? [] : FeatureMap.getLineage(level).map(({ id }) => id);
      void invokePromise(LayoutOperation.Open, {
        subject: [
          getSpecLevelPath(spaceId, project.id, root.id, [...lineage, ...(subfeatureId ? [subfeatureId] : [])]),
        ],
        pivotId,
        disposition: 'auto',
      });
    },
    [invokePromise, project, pivotId],
  );
};
