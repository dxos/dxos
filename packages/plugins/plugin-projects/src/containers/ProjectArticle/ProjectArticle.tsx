//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { type PropsWithChildren, useCallback, useMemo } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Project } from '@dxos/compute';
import { Obj, Ref, Type } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { InstructionsEditor } from '@dxos/plugin-routine/components';
import { Card, Panel, ScrollArea, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { meta } from '#meta';

export type ProjectArticleProps = AppSurface.ObjectArticleProps<Project.Project>;

// Pick the editable header fields from the Project schema rather than redeclaring them.
const HeaderSchema = Type.getSchema(Project.Project).pipe(Schema.pick('name', 'description'));
type HeaderValues = Schema.Schema.Type<typeof HeaderSchema>;

/**
 * Article surface for a {@link Project}: an editable header (name/description), the project's owned
 * instructions, and read-only rows for its linked routines and artifacts. Creating routines/artifacts
 * from this article is milestone 2 — here they are only listed.
 */
export const ProjectArticle = ({ role, subject }: ProjectArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const [project, updateProject] = useObject(subject);
  const db = Obj.getDatabase(subject);
  const instructions = project.instructions?.target;
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
      <Panel.Content asChild>
        <ScrollArea.Root orientation='vertical' padding thin>
          <ScrollArea.Viewport classNames='dx-document'>
            <Form.Root schema={HeaderSchema} defaultValues={defaultValues} onValuesChanged={handleValuesChanged}>
              <Form.FieldSet />
            </Form.Root>

            {instructions && (
              <Section title={t('instructions.label')}>
                <InstructionsEditor db={db} instructions={instructions} />
              </Section>
            )}

            <Card.Root fullWidth border={false}>
              <Card.Body>
                <Card.Section title={t('routines.label')}>
                  {project.routines.map((ref) => (
                    <ObjectLabelRow key={ref.uri} objectRef={ref} />
                  ))}
                </Card.Section>
                <Card.Section title={t('artifacts.label')}>
                  {(artifacts?.objects ?? []).map((ref) => (
                    <ObjectLabelRow key={ref.uri} objectRef={ref} />
                  ))}
                </Card.Section>
              </Card.Body>
            </Card.Root>
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Content>
    </Panel.Root>
  );
};

ProjectArticle.displayName = 'ProjectArticle';

/** Lightweight labelled grouping, matching the routine form's section idiom. */
const Section = ({ title, children }: PropsWithChildren<{ title: string }>) => (
  <div className='flex flex-col mbs-4'>
    <Form.Label standalone label={title} />
    {children}
  </div>
);

type ObjectLabelRowProps = {
  objectRef: Ref.Ref<Obj.Unknown>;
};

/** Read-only label row for a resolved routine/artifact reference; omitted while still unresolved. */
const ObjectLabelRow = ({ objectRef }: ObjectLabelRowProps) => {
  const [object] = useObject(objectRef);
  if (!object) {
    return null;
  }

  return (
    <Card.Row>
      <Card.Text>{Obj.getLabel(object) ?? object.id}</Card.Text>
    </Card.Row>
  );
};
