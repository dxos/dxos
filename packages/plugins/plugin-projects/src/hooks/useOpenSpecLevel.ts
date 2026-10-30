//
// Copyright 2026 DXOS.org
//

import { useCallback } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import type * as Project from '@dxos/compute/Project';
import { Obj } from '@dxos/echo';

import { type Feature, Spec } from '#types';

import { getSpecLevelPath } from '../paths.ts';

/**
 * Opens one level of the project's spec the way the nav tree does, beside `pivotId` when the deck already slides: the
 * breakdown of `feature`, or of `subfeatureId` beneath it (a feature on the project's own spec without `feature`).
 */
export const useOpenSpecLevel = (project: Project.Project, pivotId: string | undefined) => {
  const { invokePromise } = Hooks.useOperationInvoker();
  return useCallback(
    (feature: Feature.Feature | undefined, subfeatureId?: string) => {
      const spaceId = Obj.getDatabase(project)?.spaceId;
      if (!spaceId) {
        return;
      }
      void invokePromise(LayoutOperation.Open, {
        subject: [
          getSpecLevelPath(spaceId, project.id, [
            ...(feature ? Spec.getLineage(feature).map(({ id }) => id) : []),
            ...(subfeatureId ? [subfeatureId] : []),
          ]),
        ],
        pivotId,
        disposition: 'auto',
      });
    },
    [invokePromise, project, pivotId],
  );
};
