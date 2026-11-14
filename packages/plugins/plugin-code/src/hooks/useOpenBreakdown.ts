//
// Copyright 2026 DXOS.org
//

import { useCallback } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import type * as Project from '@dxos/compute/Project';
import * as Spec from '@dxos/compute/Spec';
import { Obj, Ref } from '@dxos/echo';
import * as ProjectHooks from '@dxos/plugin-projects/ProjectHooks';

import { CodeOperation, type Feature } from '#types';

/** Shows the spec breaking a feature down on the project's Specs tab, making it (named after the feature) first. */
export const useOpenBreakdown = (project: Project.Project) => {
  const { invokePromise } = Hooks.useOperationInvoker();
  const selectSpec = ProjectHooks.useSelectSpec(project);
  return useCallback(
    async (feature: Feature.Feature) => {
      const spaceId = Obj.getDatabase(feature)?.spaceId;
      const { error } = await invokePromise(
        CodeOperation.CreateSpec,
        { name: feature.name, feature: Ref.make(feature) },
        { spaceId },
      );
      const breakdown = error ? undefined : await feature.spec?.load();
      if (Spec.instanceOf(breakdown)) {
        selectSpec(breakdown);
      }
    },
    [invokePromise, selectSpec],
  );
};
