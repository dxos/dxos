//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/reactivity/Atom';
import * as Schema from 'effect/Schema';
import React, { type PropsWithChildren, useCallback, useMemo, useState } from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Hooks from '@dxos/app-framework/Hooks';
import type * as Instructions from '@dxos/compute/Instructions';
import type * as Project from '@dxos/compute/Project';
import { type Database } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import * as SchemaAST from '@dxos/effect/SchemaAST';
import * as SchemaEx from '@dxos/effect/SchemaEx';
import * as InstructionsEditor from '@dxos/plugin-routine/InstructionsEditor';
import { Form, type FormFieldOverride, type FormUpdateMeta, useCreateObject } from '@dxos/react-ui-form';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Theme from '@dxos/react-ui/Theme';

import { ProjectCapabilities } from '#types';

import { useDataExtensions } from '../../hooks/index.ts';
import { ProjectsNamespace } from '../../namespace.ts';

const CONTEXT_FIELDS: readonly string[] = ['objects'];

export type ConfigSectionProps = {
  db: Database.Database;
  project: Project.Project;
  instructions?: Instructions.Instructions;
};

export const ConfigSection = ({ db, project, instructions }: ConfigSectionProps) => {
  const { t } = UiHooks.useTranslation(ProjectsNamespace.key);
  const groups = useConfigGroups();
  const agentFields = groups.find(({ id }) => id === ProjectCapabilities.AgentConfigGroupId)?.fields ?? [];
  const [skills = []] = useObject(instructions, 'skills');
  const [objects = []] = useObject(instructions, 'objects');
  const agentSummary = summarize([
    [t('skills.label'), skills],
    [t('context.label'), objects],
  ]);
  // The other peers' carets in the instructions' text, which is a `Ref<Text>` its editor binds itself.
  const presence = useDataExtensions(instructions, { text: false });

  return (
    <Form.FieldSet label={t('config.label')} data-testid='projectsPlugin.config'>
      <ConfigGroupFieldSet
        id={ProjectCapabilities.AgentConfigGroupId}
        label={t('agent-config.label')}
        summary={agentSummary}
      >
        {instructions && (
          <InstructionsEditor.InstructionsEditor db={db} instructions={instructions} extensions={presence} />
        )}
        {/* Standing context (inputs bound into every project session), kept apart from Artifacts (outputs the project owns). */}
        {instructions && (
          <Form.FieldSet label={t('context.label')}>
            <InstructionsEditor.InstructionsEditor db={db} instructions={instructions} fields={CONTEXT_FIELDS} />
          </Form.FieldSet>
        )}
        {agentFields.length > 0 && <ConfigFields db={db} project={project} fields={agentFields} />}
      </ConfigGroupFieldSet>

      {groups
        .filter(({ id }) => id !== ProjectCapabilities.AgentConfigGroupId)
        .map((group) => (
          <ContributedGroup key={group.id} db={db} project={project} group={group} />
        ))}
    </Form.FieldSet>
  );
};

const useConfigGroups = (): readonly ProjectCapabilities.ConfigGroup[] => {
  const contributed = Hooks.useCapabilities(ProjectCapabilities.ConfigGroup);
  return useMemo(() => mergeGroups(contributed), [contributed]);
};

export const mergeGroups = (
  contributed: readonly ProjectCapabilities.ConfigGroup[],
): ProjectCapabilities.ConfigGroup[] => {
  const groups = new Map<string, ProjectCapabilities.ConfigGroup>();
  for (const group of contributed) {
    const merged = groups.get(group.id);
    groups.set(
      group.id,
      merged
        ? {
            ...merged,
            order: Math.min(merged.order ?? 0, group.order ?? 0),
            fields: [...merged.fields, ...group.fields],
          }
        : group,
    );
  }

  const byOrder = <T extends { order?: number }>(a: T, b: T) => (a.order ?? 0) - (b.order ?? 0);
  return [...groups.values()].map((group) => ({ ...group, fields: [...group.fields].sort(byOrder) })).sort(byOrder);
};

/** A folded group's line: the count of each list, a string as itself, nothing for what is empty. */
export const summarize = (entries: readonly (readonly [label: string, value: unknown])[]): string | undefined => {
  const parts = entries.flatMap(([label, value]) => {
    if (Array.isArray(value)) {
      return value.length > 0 ? [`${label} (${value.length})`] : [];
    }
    if (typeof value === 'string') {
      return value.length > 0 ? [value] : [];
    }
    if (typeof value === 'number') {
      return [`${label}: ${value}`];
    }
    return value === true ? [label] : [];
  });

  return parts.length > 0 ? parts.join(', ') : undefined;
};

type ConfigGroupFieldSetProps = PropsWithChildren<{ id: string; label: string; summary?: string }>;

const ConfigGroupFieldSet = ({ id, label, summary, children }: ConfigGroupFieldSetProps) => {
  const [open, setOpen] = useState(false);
  return (
    <Form.FieldSet
      nested
      collapsible
      label={label}
      description={open ? undefined : summary}
      open={open}
      onOpenChange={setOpen}
      data-testid={`projectsPlugin.config.${id}`}
    >
      {children}
    </Form.FieldSet>
  );
};

type ContributedGroupProps = {
  db: Database.Database;
  project: Project.Project;
  group: ProjectCapabilities.ConfigGroup;
};

const ContributedGroup = ({ db, project, group }: ContributedGroupProps) => {
  const { t } = UiHooks.useTranslation(ProjectsNamespace.key);
  const state = useConfigFieldValues(project, group.fields);
  const shown = group.fields.filter(({ key }) => !state.hidden.includes(key));
  if (shown.length === 0) {
    return null;
  }

  const summary = summarize(shown.map((field) => [fieldTitle(field), state.values[field.key]]));
  return (
    <ConfigGroupFieldSet id={group.id} label={Theme.toLocalizedString(group.label, t)} summary={summary}>
      <ConfigForm db={db} project={project} fields={group.fields} {...state} />
    </ConfigGroupFieldSet>
  );
};

type ConfigFieldsProps = {
  db: Database.Database;
  project: Project.Project;
  fields: readonly ProjectCapabilities.ConfigField[];
};

const ConfigFields = ({ db, project, fields }: ConfigFieldsProps) => {
  const state = useConfigFieldValues(project, fields);
  return <ConfigForm db={db} project={project} fields={fields} {...state} />;
};

type ConfigFormProps = ConfigFieldsProps & ConfigFieldValues;

const ConfigForm = ({ db, project, fields, values, hidden }: ConfigFormProps) => {
  const registry = Hooks.useCapability(Capabilities.AtomRegistry);
  const schema = useMemo(
    () =>
      Schema.make<Schema.Codec<Record<string, unknown>, any>>(
        Schema.Struct(Object.fromEntries(fields.map((field) => [field.key, field.schema]))).ast,
      ),
    [fields],
  );
  const fieldOverrides = useMemo(
    () =>
      Object.fromEntries(
        fields.flatMap(({ key, action }): [string, FormFieldOverride][] =>
          hidden.includes(key) ? [[key, { hidden: true }]] : action ? [[key, { action }]] : [],
        ),
      ),
    [fields, hidden],
  );
  const handleCreate = useCreateObject(db);

  const handleValuesChanged = useCallback(
    (next: Record<string, unknown>, { changed, isValid }: FormUpdateMeta<Record<string, unknown>>) => {
      // An empty slot an array field just added is invalid; the write lands once it is filled.
      if (!isValid) {
        return;
      }

      const edited = new Set(
        Object.entries(changed)
          .filter(([, edited]) => edited)
          .map(([key]) => key),
      );
      for (const field of fields) {
        if (edited.has(field.key)) {
          registry.set(field.value(project), next[field.key]);
        }
      }
    },
    [fields, project, registry],
  );

  return (
    <Form.Root
      db={db}
      schema={schema}
      values={values}
      fieldOverrides={fieldOverrides}
      onValuesChanged={handleValuesChanged}
      onCreate={handleCreate}
    >
      <Form.Fields />
    </Form.Root>
  );
};

type ConfigFieldValues = {
  /** The project's value for every field, applicable or not, so the form validates. */
  values: Record<string, unknown>;
  hidden: readonly string[];
};

const useConfigFieldValues = (
  project: Project.Project,
  fields: readonly ProjectCapabilities.ConfigField[],
): ConfigFieldValues => {
  const valuesAtom = useMemo(
    () => Atom.make((get) => Object.fromEntries(fields.map((field) => [field.key, get(field.value(project))]))),
    [project, fields],
  );
  // Reads only the `enabled` atoms, so the list keeps its identity while values are edited.
  const hiddenAtom = useMemo(
    () => Atom.make((get) => fields.filter((field) => field.enabled && !get(field.enabled)).map(({ key }) => key)),
    [fields],
  );

  return { values: useAtomValue(valuesAtom), hidden: useAtomValue(hiddenAtom) };
};

const fieldTitle = (field: ProjectCapabilities.ConfigField): string =>
  SchemaEx.getAnnotation<string>(SchemaAST.TitleAnnotationId)(field.schema.ast) ?? field.key;
