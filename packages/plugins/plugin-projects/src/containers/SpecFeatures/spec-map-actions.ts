//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/reactivity/Atom';
import { useCallback, useMemo } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { type Database, Obj } from '@dxos/echo';
import {
  Attention,
  useSelection,
  useSelectionActions,
  useViewState,
  useViewStateActions,
} from '@dxos/react-ui-attention';
import { type ActionGroupBuilderFn } from '@dxos/react-ui-menu';
import * as UiHooks from '@dxos/react-ui/Hooks';

import { Feature, FeatureMapView, type Spec } from '#types';

import { ADD_FEATURE_DIALOG, FEATURE_COMPANION } from '../../constants.ts';
import { useFeatureEditing } from '../../hooks/index.ts';
import { ProjectsNamespace } from '../../namespace.ts';
import { type AddFeatureDialogProps } from '../AddFeatureDialog/index.ts';

const NONE: readonly string[] = [];

// The document first: it is the spec, and the map and board are views of the features drawn from it.
const MODES: { mode: FeatureMapView.Mode; icon: string }[] = [
  { mode: 'document', icon: 'ph--file-text--regular' },
  { mode: 'canvas', icon: 'ph--graph--regular' },
  { mode: 'kanban', icon: 'ph--kanban--regular' },
];

/** The ids of the features on `spec`'s map, by name; read through atoms, so an agent's add or a peer's rename lands. */
export const useLevelIds = (spec: Spec.Spec | undefined): readonly string[] => {
  const idsAtom = useMemo(
    () =>
      Atom.make((get) => {
        if (!spec) {
          return '';
        }
        return get(Obj.atomReactive(get(Obj.atom(spec)).features))
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

/** The map's view mode, held under `viewId`, so levels sharing it keep the reader's choice. */
export const useSpecMapMode = (viewId: string) => {
  const { mode } = useViewState(FeatureMapView.aspect, viewId);
  const { update } = useViewStateActions(FeatureMapView.aspect, viewId);
  const setMode = useCallback((mode: FeatureMapView.Mode) => update((prev) => ({ ...prev, mode })), [update]);
  return { mode, setMode };
};

export type SpecMapActionsProps = {
  db: Database.Database | undefined;
  /** The map's spec: where a new feature goes unless `parentId` names the feature to break down instead. */
  spec?: Spec.Spec;
  parentId?: string;
  /** Keys the view mode, so levels sharing it keep the reader's choice. */
  viewId: string;
  attendableId?: string;
  /** Not offered when adding an existing feature, besides the map's own features: the features above it. */
  exclude?: readonly string[];
};

/**
 * The map's actions for a host toolbar to place: `actions` switch the view mode, and `featureActions` (new feature,
 * add an existing one) belong in its overflow menu, since they are occasional next to reading the map.
 */
export const useSpecMapActions = ({
  db,
  spec,
  parentId,
  viewId,
  attendableId,
  exclude = NONE,
}: SpecMapActionsProps) => {
  const { t } = UiHooks.useTranslation(ProjectsNamespace.key);
  const { invokePromise } = Hooks.useOperationInvoker();
  const { mode, setMode } = useSpecMapMode(viewId);
  const editing = useFeatureEditing(db, spec);
  const { select } = useFeatureSelection(attendableId);

  // A new feature is named in the companion, where its other fields are too.
  const handleNew = useCallback(
    () => void editing.createFeature(t('feature-map.new-feature.name'), parentId).then((id) => id && select(id)),
    [editing, parentId, select, t],
  );
  const handleAdd = useCallback(
    () =>
      spec &&
      void invokePromise(LayoutOperation.UpdateDialog, {
        subject: ADD_FEATURE_DIALOG,
        blockAlign: 'start',
        props: { spec, parentId, exclude } satisfies AddFeatureDialogProps,
      }),
    [invokePromise, spec, parentId, exclude],
  );

  const actions = useCallback<ActionGroupBuilderFn>(
    (group) =>
      group.group(
        'mode',
        {
          label: ['feature-map.mode.label', { ns: ProjectsNamespace.key }],
          variant: 'toggleGroup',
          selectCardinality: 'single',
          value: mode,
        },
        (modeGroup) =>
          MODES.forEach(({ mode, icon }) =>
            modeGroup.action(
              mode,
              {
                label: [`feature-map.mode.${mode}.label`, { ns: ProjectsNamespace.key }],
                icon,
                testId: `projectsPlugin.featureMap.${mode}`,
              },
              () => setMode(mode),
            ),
          ),
      ),
    [mode, setMode],
  );

  const featureActions = useCallback<ActionGroupBuilderFn>(
    (group) =>
      group
        .action(
          'new-feature',
          {
            label: ['feature-map.new-feature.label', { ns: ProjectsNamespace.key }],
            icon: 'ph--plus--regular',
            testId: 'feature-map.new-feature',
          },
          handleNew,
        )
        .action(
          'add-feature',
          {
            label: ['feature-map.add-feature.label', { ns: ProjectsNamespace.key }],
            icon: 'ph--list-plus--regular',
            testId: 'feature-map.add-feature',
          },
          handleAdd,
        ),
    [handleNew, handleAdd],
  );

  return { mode, actions, featureActions: mode === 'document' ? undefined : featureActions };
};
