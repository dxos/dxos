//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/reactivity/Atom';
import React, { useCallback, useMemo } from 'react';

import * as PluginManagerProvider from '@dxos/app-framework/PluginManagerProvider';
import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import { type Database, Filter, Obj } from '@dxos/echo';
import {
  Attention,
  useSelection,
  useSelectionActions,
  useViewState,
  useViewStateActions,
} from '@dxos/react-ui-attention';
import { type ActionGroupBuilderFn } from '@dxos/react-ui-menu';
import * as Button from '@dxos/react-ui/Button';
import * as UiHooks from '@dxos/react-ui/Hooks';

import { Feature, FeatureMapView, type Spec } from '#types';

import { ObjectAddPicker } from '../../components/ObjectAddPicker/index.ts';
import { FEATURE_COMPANION } from '../../constants.ts';
import { useFeatureEditing } from '../../hooks/index.ts';
import { ProjectsNamespace } from '../../namespace.ts';

const NONE: readonly string[] = [];

const MODES: { mode: FeatureMapView.Mode; icon: string }[] = [
  { mode: 'canvas', icon: 'ph--graph--regular' },
  { mode: 'kanban', icon: 'ph--kanban--regular' },
  { mode: 'document', icon: 'ph--file-text--regular' },
];

/** plugin-code, which renders a spec document; named by id since neither plugin depends on the other. */
const SPEC_EDITOR_PLUGIN = 'org.dxos.plugin.code';

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

/** The map's view mode, held under `viewId`; the document view needs plugin-code, so it falls back to the canvas. */
export const useSpecMapMode = (viewId: string, attendableId: string | undefined) => {
  const { mode } = useViewState(FeatureMapView.aspect, viewId);
  const { update } = useViewStateActions(FeatureMapView.aspect, viewId);
  const enabledPlugins = useAtomValue(PluginManagerProvider.usePluginManager().enabled);
  const documentAvailable = !!attendableId && enabledPlugins.includes(SPEC_EDITOR_PLUGIN);
  const setMode = useCallback((mode: FeatureMapView.Mode) => update((prev) => ({ ...prev, mode })), [update]);
  return {
    mode: mode === 'document' && !documentAvailable ? ('canvas' as const) : mode,
    modes: documentAvailable ? MODES : MODES.filter(({ mode }) => mode !== 'document'),
    setMode,
  };
};

export type SpecMapActionsProps = {
  db: Database.Database | undefined;
  /** The map's spec: where a new feature goes unless `parentId` names the feature to break down instead. */
  spec?: Spec.Spec;
  parentId?: string;
  /** Keys the view mode, so levels sharing it keep the reader's choice. */
  viewId: string;
  attendableId?: string;
  /** Left out of the add picker besides the map's own features: the features above it. */
  exclude?: readonly string[];
};

/** The map's toolbar actions — view mode, new feature, add an existing one — for a host toolbar to place. */
export const useSpecMapActions = ({
  db,
  spec,
  parentId,
  viewId,
  attendableId,
  exclude = NONE,
}: SpecMapActionsProps) => {
  const { t } = UiHooks.useTranslation(ProjectsNamespace.key);
  const { mode, modes, setMode } = useSpecMapMode(viewId, attendableId);
  const ids = useLevelIds(parentId ? undefined : spec);
  const editing = useFeatureEditing(db, spec);
  const { select } = useFeatureSelection(attendableId);

  // A new feature is named in the companion, where its other fields are too.
  const handleNew = useCallback(
    () => void editing.createFeature(t('feature-map.new-feature.name'), parentId).then((id) => id && select(id)),
    [editing, parentId, select, t],
  );
  const handleAdd = useCallback((id: string) => editing.moveFeature(id, parentId), [editing, parentId]);

  const actions = useCallback<ActionGroupBuilderFn>(
    (group) => {
      group.group(
        'mode',
        {
          label: ['feature-map.mode.label', { ns: ProjectsNamespace.key }],
          variant: 'toggleGroup',
          selectCardinality: 'single',
          value: mode,
        },
        (modeGroup) =>
          modes.forEach(({ mode, icon }) =>
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
      );
      if (mode === 'document') {
        return;
      }
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
        .custom('add-feature', { label: ['feature-map.add-feature.label', { ns: ProjectsNamespace.key }] }, () => (
          <ObjectAddPicker
            db={db}
            filter={Filter.type(Feature.Feature)}
            exclude={[...ids, ...exclude]}
            onSelect={handleAdd}
            onCreate={(name) => editing.createFeature(name, parentId)}
            trigger={
              <Button.Root
                icon='ph--list-plus--regular'
                iconOnly
                label={t('feature-map.add-feature.label')}
                data-testid='feature-map.add-feature'
              />
            }
          />
        ));
    },
    [mode, modes, setMode, handleNew, handleAdd, db, ids, exclude, editing, parentId, t],
  );

  return { mode, actions };
};
