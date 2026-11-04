//
// Copyright 2026 DXOS.org
//

import React, {
  type KeyboardEvent,
  type PropsWithChildren,
  type ReactNode,
  type RefObject,
  createContext,
  useCallback,
  useContext,
  useMemo,
} from 'react';

import { Type } from '@dxos/echo';
import { Form, type FormFieldOverride, type FormFieldRendererProps, type FormUpdateMeta } from '@dxos/react-ui-form';
import { MarkdownEditable, type MarkdownEditableController, type MarkdownEditableProps } from '@dxos/react-ui-markdown';
import { ActionMenu } from '@dxos/react-ui-menu';
import * as Button from '@dxos/react-ui/Button';
import * as Field from '@dxos/react-ui/Field';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Input from '@dxos/react-ui/Input';
import * as Layout from '@dxos/react-ui/Layout';
import * as SystemButton from '@dxos/react-ui/SystemButton';
import { type Actor, type Person, Task } from '@dxos/types';

import { translationKey } from '#translations';

import { useAssigneeDisplay } from '../../hooks/index.ts';
import { UNASSIGNED_ICON } from '../../util/assignee.ts';
import { type TaskMember, assigneeMenuActions, pickAssignee } from '../../util/property-menus.ts';
import { ESTIMATE_ICON, UNSET_ICON } from '../../util/status-icons.ts';

export type TaskEditorValues = {
  title: string;
  description?: string;
  status?: Task.Status;
  priority?: Task.Priority;
  estimate?: Task.Estimate;
  assignee?: Actor.Actor;
  delegate?: Actor.Actor;
};

export type TaskTitleBehavior = {
  placeholder: string;
  canSave: boolean;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onBlur: () => void;
  onSave: () => void;
};

export type TaskDescriptionBehavior = {
  editorKey: string;
  controllerRef: RefObject<MarkdownEditableController | null>;
  placeholder: string;
  extensions: MarkdownEditableProps['extensions'];
};

export type TaskEditorFormProps = PropsWithChildren<{
  values: TaskEditorValues;
  showAssignee?: boolean;
  members: readonly TaskMember[];
  people: readonly Person.Person[];
  title: TaskTitleBehavior;
  description?: TaskDescriptionBehavior;
  end?: ReactNode;
  onChange: (patch: Task.Edit) => void;
}>;

const TASK_SCHEMA = Type.getSchema(Task.Task);

const PROPERTY_FIELDS = ['status', 'priority', 'assignee', 'estimate'];

export const TaskEditorForm = ({
  children,
  values,
  showAssignee = true,
  members,
  people,
  title,
  description,
  end,
  onChange,
}: TaskEditorFormProps) => {
  const { t } = Hooks.useTranslation(translationKey);
  const fieldOverrides = useMemo<Record<string, FormFieldOverride>>(
    () => ({
      status: { required: true },
      priority: { label: t('task-priority.label'), icon: UNSET_ICON },
      assignee: { label: t('task-assignee.label') },
      estimate: { label: t('task-estimate.label'), icon: ESTIMATE_ICON },
    }),
    [t],
  );
  const context = useMemo(
    () => ({ members, people, title, description, delegate: values.delegate }),
    [members, people, title, description, values.delegate],
  );
  const textFields = useMemo(() => (description ? ['title', 'description'] : ['title']), [description]);
  const propertyFields = useMemo(
    () => (showAssignee ? PROPERTY_FIELDS : PROPERTY_FIELDS.filter((field) => field !== 'assignee')),
    [showAssignee],
  );

  const handleValuesChanged = useCallback(
    (next: Partial<Task.Task>, { changed }: FormUpdateMeta<Task.Task>) => {
      const patch = Object.fromEntries(
        Object.keys(changed).map((key) => [key, next[key as keyof Task.Task] ?? null]),
      ) as Task.Edit;
      onChange('assignee' in changed ? { ...patch, ...pickAssignee(patch.assignee ?? null, next.delegate) } : patch);
    },
    [onChange],
  );

  return (
    <TaskEditorContext.Provider value={context}>
      <Form.Root
        schema={TASK_SCHEMA}
        values={{ ...values, status: values.status ?? 'todo' }}
        fieldOverrides={fieldOverrides}
        fieldMap={FIELD_MAP}
        onValuesChanged={handleValuesChanged}
      >
        <Form.Fields include={textFields} sort={textFields} />
        {children}
        <Layout.Flex wrap align='center' gap='xs' classNames='min-w-0' data-testid='taskList.edit.properties'>
          <Form.Fields include={propertyFields} sort={propertyFields} layout='pill' />
          {end}
        </Layout.Flex>
      </Form.Root>
    </TaskEditorContext.Provider>
  );
};

const TaskEditorContext = createContext<
  | (Pick<TaskEditorFormProps, 'members' | 'people' | 'title' | 'description'> & Pick<TaskEditorValues, 'delegate'>)
  | undefined
>(undefined);

const useTaskEditorContext = () => {
  const context = useContext(TaskEditorContext);
  if (!context) {
    throw new Error('A task editor field must render inside TaskEditorForm.');
  }
  return context;
};

const TitleField = ({ type, getValue, onValueChange }: FormFieldRendererProps<string>) => {
  const { title } = useTaskEditorContext();
  return (
    <Field.Root classNames='min-w-0'>
      <Input.Root
        classNames='grow text-ellipsis'
        data-testid='taskList.edit.title'
        placeholder={title.placeholder}
        value={getValue() ?? ''}
        onChange={(event) => onValueChange(type, event.target.value)}
        onKeyDown={title.onKeyDown}
        onBlur={title.onBlur}
        end={
          title.canSave && (
            <SystemButton.Save
              variant='primary'
              data-testid='taskList.edit.save'
              tabIndex={-1}
              onClick={title.onSave}
              onMouseDown={(event) => event.preventDefault()}
            />
          )
        }
      />
    </Field.Root>
  );
};

const DescriptionField = ({ type, getValue, onValueChange }: FormFieldRendererProps<string | undefined>) => {
  const { description } = useTaskEditorContext();
  if (!description) {
    return null;
  }

  return (
    <Input.Frame rows={2} data-testid='taskList.edit.description' classNames='min-w-0'>
      <MarkdownEditable
        key={description.editorKey}
        ref={description.controllerRef}
        // A long description scrolls within the field rather than growing the pane past the list it edits from: eight
        // lines, with the scroller's line-height set to the lines' (CodeMirror's base theme gives it a smaller one) so
        // `lh` measures a real line.
        classNames='[&_.cm-scroller]:!leading-normal [&_.cm-scroller]:max-h-[8lh] [&_.cm-scroller]:overflow-y-auto'
        editing
        multiline
        placeholder={description.placeholder}
        extensions={description.extensions}
        autoFocus={false}
        value={getValue() ?? ''}
        onValueChange={(next) => onValueChange(type, next)}
      />
    </Input.Frame>
  );
};

const AssigneePill = ({
  type,
  label,
  jsonPath,
  getValue,
  onValueChange,
}: FormFieldRendererProps<Actor.Actor | undefined>) => {
  const { t } = Hooks.useTranslation(translationKey);
  const { members, people, delegate } = useTaskEditorContext();
  const assignee = getValue();
  const current = useAssigneeDisplay(assignee);
  const worker = useAssigneeDisplay(delegate);
  return (
    <ActionMenu
      deferUntilOpen
      actions={() =>
        assigneeMenuActions({
          assignee,
          current,
          delegate: delegate && worker,
          members,
          people,
          onChange: ({ assignee }) => onValueChange(type, assignee ?? undefined),
          t,
        })
      }
    >
      <Button.Root
        pill
        icon={assignee ? current.icon : delegate ? worker.icon : UNASSIGNED_ICON}
        label={(assignee ? current.label : delegate && worker.label) || label}
        data-placeholder-shown={assignee || delegate ? undefined : ''}
        data-testid={jsonPath}
      />
    </ActionMenu>
  );
};

const FIELD_MAP = { assignee: AssigneePill, description: DescriptionField, title: TitleField };
