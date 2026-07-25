//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useCallback, useMemo } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Project } from '@dxos/compute';
import { Obj, Ref, Type } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { InstructionsEditor } from '@dxos/plugin-routine/components';
import { Panel, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
import { Listbox } from '@dxos/react-ui-list';

import { meta } from '#meta';

// Pick the editable header fields from the Project schema rather than redeclaring them.
const HeaderValues = Type.getSchema(Project.Project).pipe(Schema.pick('name', 'description'));
type HeaderValues = Schema.Schema.Type<typeof HeaderValues>;

export type ProjectArticleProps = AppSurface.ObjectArticleProps<Project.Project>;

/**
 * Article surface for a {@link Project}: one form-styled body (header fields, the owned instructions
 * sub-form, and sections listing linked routines and artifacts). `Form.Viewport` owns the scroll and
 * gutter so fields stay inset from the panel edges. Creating routines/artifacts here is milestone 2.
 */
export const ProjectArticle = ({ role, subject }: ProjectArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const [project, updateProject] = useObject(subject);
  const db = Obj.getDatabase(subject);
  // Resolve reactively: on a cold load (deep link) the owned ref's target is not yet in memory, and a
  // sync `.target` read would leave the section permanently missing. The sub-editor mutates the
  // instructions in place, so unwrap the snapshot back to the live entity.
  const [instructionsSnapshot] = useObject(project.instructions);
  const instructions = Obj.getReactiveOrUndefined(instructionsSnapshot);
  const [artifacts] = useObject(project.artifacts);

  // Read once per project identity; the uncontrolled form owns edits after mount.
  const defaultValues = useMemo<Partial<HeaderValues>>(
    () => ({ name: project.name, description: project.description }),
    [subject],
  );

  const handleValuesChanged = useCallback(
    (values: Partial<HeaderValues>) => {
      updateProject((project) => {
        project.name = values.name;
        project.description = values.description;
      });
    },
    [updateProject],
  );

  if (!db) {
    return null;
  }

  return (
    <Panel.Root role={role}>
      <Panel.Content>
        <Form.Root schema={HeaderValues} defaultValues={defaultValues} onValuesChanged={handleValuesChanged}>
          <Form.Viewport scroll>
            <Form.Content>
              <Form.FieldSet />

              {instructions && <InstructionsEditor db={db} instructions={instructions} />}

              <Form.Section title={t('routines.label')}>
                <ObjectList label={t('routines.label')} refs={project.routines} />
              </Form.Section>

              <Form.Section title={t('artifacts.label')}>
                <ObjectList label={t('artifacts.label')} refs={artifacts?.objects ?? []} />
              </Form.Section>
            </Form.Content>
          </Form.Viewport>
        </Form.Root>
      </Panel.Content>
    </Panel.Root>
  );
};

ProjectArticle.displayName = 'ProjectArticle';

type ObjectListProps = {
  label: string;
  refs: ReadonlyArray<Ref.Ref<Obj.Unknown>>;
};

/** Read-only list of resolved object references. */
const ObjectList = ({ label, refs }: ObjectListProps) => (
  <Listbox.Root>
    <Listbox.Viewport>
      <Listbox.Content aria-label={label}>
        {refs.map((objectRef) => (
          <ObjectRow key={objectRef.uri} objectRef={objectRef} />
        ))}
      </Listbox.Content>
    </Listbox.Viewport>
  </Listbox.Root>
);

type ObjectRowProps = {
  objectRef: Ref.Ref<Obj.Unknown>;
};

/** One object row; resolves the reference reactively for its label and is omitted while unresolved. */
const ObjectRow = ({ objectRef }: ObjectRowProps) => {
  const [object] = useObject(objectRef);
  if (!object) {
    return null;
  }

  return (
    <Listbox.Item id={object.id}>
      <span className='truncate'>{Obj.getLabel(object) ?? object.id}</span>
    </Listbox.Item>
  );
};
