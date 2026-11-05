//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Option from 'effect/Option';
import * as Atom from 'effect/reactivity/Atom';
import { useCallback, useMemo } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Spec from '@dxos/compute/Spec';
import { Annotation, type Database, Obj } from '@dxos/echo';
import { Attention, useSelection, useSelectionActions } from '@dxos/react-ui-attention';
import * as UiHooks from '@dxos/react-ui/Hooks';

import { Feature, FeatureMap } from '#types';

import { ADD_FEATURE_DIALOG, FEATURE_COMPANION } from '../../constants.ts';
import { useFeatureEditing } from '../../hooks/index.ts';
import { CodeNamespace } from '../../namespace.ts';
import { type AddFeatureDialogProps } from '../AddFeatureDialog/index.ts';

const NONE: readonly string[] = [];

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

export type AddFeatureActionsProps = {
  db: Database.Database | undefined;
  /** The map's spec: where a new feature goes unless `parentId` names the feature to break down instead. */
  spec?: Spec.Spec;
  parentId?: string;
  attendableId?: string;
  /** Not offered when adding an existing feature, besides the map's own features: the features above it. */
  exclude?: readonly string[];
};

/** Adding a feature to the map at a point on its canvas: a new one, named in the companion, or an existing one. */
export const useAddFeature = ({ db, spec, parentId, attendableId, exclude = NONE }: AddFeatureActionsProps) => {
  const { t } = UiHooks.useTranslation(CodeNamespace.key);
  const { invokePromise } = Hooks.useOperationInvoker();
  const editing = useFeatureEditing(db, spec);
  const { select } = useFeatureSelection(attendableId);

  const createAt = useCallback(
    async (position: FeatureMap.Position) => {
      const id = await editing.createFeature(t('feature-map.new-feature.name'), parentId);
      if (id && spec && !parentId) {
        FeatureMap.setPosition(spec, id, position);
      }
      if (id) {
        select(id);
      }
    },
    [editing, spec, parentId, select, t],
  );
  const addAt = useCallback(
    (position: FeatureMap.Position) =>
      spec &&
      void invokePromise(LayoutOperation.UpdateDialog, {
        subject: ADD_FEATURE_DIALOG,
        blockAlign: 'start',
        props: { spec, parentId, exclude, position } satisfies AddFeatureDialogProps,
      }),
    [invokePromise, spec, parentId, exclude],
  );

  return { createAt, addAt };
};
