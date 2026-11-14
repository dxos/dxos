//
// Copyright 2026 DXOS.org
//

import { useAtom, useAtomValue } from '@effect/atom-react';
import * as Atom from 'effect/reactivity/Atom';
import React, { useMemo } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as Surface from '@dxos/app-framework/Surface';
import * as Project from '@dxos/compute/Project';
import * as Spec from '@dxos/compute/Spec';
import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { useViewState } from '@dxos/react-ui-attention';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Panel from '@dxos/react-ui/Panel';
import * as Status from '@dxos/react-ui/Status';
import * as Theme from '@dxos/react-ui/Theme';
import * as ToggleGroup from '@dxos/react-ui/ToggleGroup';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { ProjectCapabilities, ProjectSurface, ProjectView } from '#types';

import { useSpecNesting } from '../../hooks/index.ts';
import { ProjectsNamespace } from '../../namespace.ts';
import * as SpecSession from '../../SpecSession.ts';
import { specTree } from '../../util/spec-tree.ts';

export type SpecCompanionProps = {
  /** The spec, or the project whose Specs tab shows one of its specs. */
  companionTo: Spec.Spec | Project.Project;
  group: SpecSession.Group;
  /** The plank the companion accompanies. */
  attendableId?: string;
};

/** One companion tab of a spec: a switch between the views contributed to its group, and the view picked. */
export const SpecCompanion = ({ companionTo, group, attendableId }: SpecCompanionProps) => {
  const spec = useCompanionSpec(companionTo);
  return spec ? (
    <SpecCompanionPanel
      subject={spec}
      group={group}
      project={Obj.instanceOf(Project.Project, companionTo) ? companionTo : undefined}
      attendableId={attendableId ?? spec.id}
    />
  ) : null;
};

export type SpecCompanionPanelProps = ProjectSurface.SpecCompanionData;

export const SpecCompanionPanel = ({ subject: spec, group, project, attendableId }: SpecCompanionPanelProps) => {
  const { t } = UiHooks.useTranslation(ProjectsNamespace.key);
  const views = useGroupViews(spec, group);
  const [session, setSession] = useAtom(SpecSession.session(spec.id));
  const view = views.find(({ id }) => id === session.views[group])?.id ?? views[0]?.id;
  return (
    <Panel.Root>
      <Panel.Header>
        <Toolbar.Root>
          {views.length > 1 && (
            <Toolbar.ToggleGroup
              type='single'
              value={view}
              onValueChange={(next) =>
                next && setSession((current) => ({ ...current, views: { ...current.views, [group]: next } }))
              }
              aria-label={t(`spec-companion.${group}.label`)}
            >
              {views.map(({ id, label, icon }) => (
                <ToggleGroup.Item
                  key={id}
                  value={id}
                  icon={icon}
                  label={Theme.toLocalizedString(label, t)}
                  // Only the open view is labelled, so the toolbar fits a narrow companion.
                  iconOnly={id !== view}
                  data-testid={`spec-companion.view.${id}`}
                />
              ))}
            </Toolbar.ToggleGroup>
          )}
          <Surface.Surface type={ProjectSurface.SpecToolbar} data={{ subject: spec }} limit={1} />
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body classNames='relative' data-testid={`spec-companion.${group}`} data-view={view}>
        {view ? (
          <Surface.Surface
            type={ProjectSurface.SpecView}
            data={{ subject: spec, view, project, attendableId }}
            limit={1}
          />
        ) : (
          <Status.Empty classNames='dx-fill'>{t('spec-companion.empty.message')}</Status.Empty>
        )}
      </Panel.Body>
    </Panel.Root>
  );
};

/** The views contributed to `group` for the dialects the spec uses, in the order they were contributed. */
const useGroupViews = (spec: Spec.Spec, group: SpecSession.Group): ProjectCapabilities.SpecView[] => {
  const contributed = Hooks.useCapabilities(ProjectCapabilities.SpecView);
  const [dialects] = useObject(spec, 'dialects');
  return useMemo(
    () =>
      contributed.filter(
        (view) => view.group === group && view.dialects.every((dialect) => dialects?.includes(dialect)),
      ),
    [contributed, dialects, group],
  );
};

/** The spec itself, or the spec its project's Specs tab has picked at any depth (the first while none is picked). */
const useCompanionSpec = (subject: Spec.Spec | Project.Project): Spec.Spec | undefined => {
  const project = Obj.instanceOf(Project.Project, subject) ? subject : undefined;
  const { spec: picked } = useViewState(ProjectView.aspect, project?.id);
  const [refs] = useObject(project, 'specs');
  // Through `ref.atom`, which tracks loading, since a snapshot's refs carry no resolver.
  const specs = useAtomValue(
    useMemo(() => Atom.make((get) => (refs ?? []).map((ref) => get(ref.atom)).filter(Spec.instanceOf)), [refs]),
  );
  const nesting = useSpecNesting(specs);
  const tree = useMemo(() => specTree(specs, nesting), [specs, nesting]);
  return Spec.instanceOf(subject) ? subject : (tree.find(({ spec }) => spec.id === picked) ?? tree[0])?.spec;
};
