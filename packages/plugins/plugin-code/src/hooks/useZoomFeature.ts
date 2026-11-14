//
// Copyright 2026 DXOS.org
//

import { useCallback } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as Spec from '@dxos/compute/Spec';
import { Obj, Ref } from '@dxos/echo';

import { CodeOperation } from '#types';

import { type FeatureModel } from '../components/FeatureCard/index.ts';
import { findSpec } from '../util/find-spec.ts';

/** Zooms into a feature of `spec`: its breakdown, which a feature without one gets first, named after it. */
export const useZoomFeature = (spec: Spec.Spec, onZoom: (breakdown: Spec.Spec) => void) => {
  const { invokePromise } = Hooks.useOperationInvoker();
  return useCallback(
    async (feature: FeatureModel) => {
      const db = Obj.getDatabase(spec);
      if (!db) {
        return;
      }
      if (feature.breakdown) {
        const target = await findSpec(db, feature.breakdown);
        target && onZoom(target);
        return;
      }
      const { data } = await invokePromise(
        CodeOperation.CreateSpec,
        { name: feature.name, breaks: { spec: Ref.make(spec), item: feature.id } },
        { spaceId: db.spaceId },
      );
      data && Spec.instanceOf(data.spec) && onZoom(data.spec);
    },
    [spec, invokePromise, onZoom],
  );
};
