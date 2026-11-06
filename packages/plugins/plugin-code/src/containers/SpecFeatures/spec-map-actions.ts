//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Option from 'effect/Option';
import * as Atom from 'effect/reactivity/Atom';
import { useCallback, useMemo } from 'react';

import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import * as Spec from '@dxos/compute/Spec';
import { Annotation, Obj } from '@dxos/echo';
import { Attention, useSelection, useSelectionActions } from '@dxos/react-ui-attention';

import { Feature, FeatureMap } from '#types';

import { FEATURE_COMPANION } from '../../constants.ts';

/** The ids of the features on `spec`'s map, by name; read through atoms, so an agent's add or a peer's rename lands. */
export const useLevelIds = (spec: Spec.Spec | undefined): readonly string[] => {
  const idsAtom = useMemo(
    () =>
      Atom.make((get) => {
        if (!spec) {
          return '';
        }
        const refs = Option.getOrElse(get(Annotation.atom(spec, FeatureMap.FeaturesAnnotation)), () => []);
        return get(Obj.atomReactive(refs))
          .filter(Feature.instanceOf)
          .map((member) => get(Obj.atom(member)))
          .sort((left, right) => left.name.localeCompare(right.name))
          .map(({ id }) => id)
          .join(',');
      }),
    [spec],
  );
  // Joined, so an unchanged set keeps its identity across renders and the graph's subscriptions stay put.
  const key = useAtomValue(idsAtom);
  return useMemo(() => (key ? key.split(',') : []), [key]);
};

/** The plank's single selection, which the feature companion follows; selecting shows the companion. */
export const useFeatureSelection = (attendableId: string | undefined) => {
  const selectedId = useSelection(attendableId, 'single');
  const { clear } = useSelectionActions(attendableId);
  const showItem = ToolkitHooks.useShowItem();
  const select = useCallback(
    (id: string | undefined) => {
      if (!attendableId || id === selectedId) {
        return;
      }
      if (id) {
        void showItem({
          contextId: attendableId,
          selectionId: id,
          companion: Attention.linkedSegment(FEATURE_COMPANION),
        });
      } else {
        clear();
      }
    },
    [attendableId, selectedId, showItem, clear],
  );
  return { selectedId, select };
};
