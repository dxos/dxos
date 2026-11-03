//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import React, { useCallback, useMemo } from 'react';

import type * as Project from '@dxos/compute/Project';
import { Annotation, Obj, Ref } from '@dxos/echo';
import { Form, useCreateObject } from '@dxos/react-ui-form';
import { Repo } from '@dxos/types';

const RepositoriesValues = Schema.Struct({
  repositories: Schema.Array(Ref.Ref(Repo.Repo)).annotate({
    title: 'Repositories',
    description: 'Checked out for coding agents that run in the cloud.',
  }),
});

type RepositoriesValues = Schema.Schema.Type<typeof RepositoriesValues>;

export type ProjectRepositoriesProps = { project: Project.Project };

/** The repositories the project's coding agents work on, kept as the project's `Repo.RepositoriesAnnotation`. */
export const ProjectRepositories = ({ project }: ProjectRepositoriesProps) => {
  const db = Obj.getDatabase(project);
  const stored = useAtomValue(useMemo(() => Annotation.atom(project, Repo.RepositoriesAnnotation), [project]));
  const values = useMemo<RepositoriesValues>(() => ({ repositories: Option.getOrElse(stored, () => []) }), [stored]);
  const handleCreate = useCreateObject(db);

  const handleValuesChanged = useCallback(
    (values: Partial<RepositoriesValues>, { isValid }: { isValid: boolean }) => {
      // An empty slot the array field just added is invalid; the write lands once it is filled.
      if (isValid) {
        Repo.setRepositories(project, values.repositories ?? []);
      }
    },
    [project],
  );

  return (
    <Form.Root
      db={db}
      schema={RepositoriesValues}
      values={values}
      onValuesChanged={handleValuesChanged}
      onCreate={handleCreate}
    >
      <Form.Fields />
    </Form.Root>
  );
};
