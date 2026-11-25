//
// Copyright 2026 DXOS.org
//

import React, {
  Fragment,
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
import { TaskField } from './TaskField.tsx';
import { type TaskColumn, TRACK, spanFromTitle } from './tracks.ts';

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
  /** Drops the field's well, for a list whose host already frames it. */
  subdued?: boolean;
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
  cells: readonly TaskColumn[];
  members: readonly TaskMember[];
  people: readonly Person.Person[];
  title: TaskTitleBehavior;
  description?: TaskDescriptionBehavior;
  /** The pane's one control, in the actions column where a row keeps its own menu. */
  save?: ReactNode;
  onChange: (patch: Task.Edit) => void;
}>;

const TASK_SCHEMA = Type.getSchema(Task.Task);

const PROPERTY_FIELDS: readonly TaskColumn[] = ['status', 'priority', 'assignee', 'estimate'];

export const TaskEditorForm = ({
  children,
  values,
  cells,
  members,
  people,
  title,
  description,
  save,
  onChange,
}: TaskEditorFormProps) => {
  const { t } = Hooks.useTranslation(translationKey);
  const fieldOverrides = useMemo<Record<string, FormFieldOverride>>(
    () => ({
      assignee: { label: t('task-assignee.label') },
      estimate: { label: t('task-estimate.label'), icon: ESTIMATE_ICON },
      priority: { label: t('task-priority.label'), icon: UNSET_ICON },
      status: { required: true },
    }),
    [t],
  );
  // The save button lives in the actions column; a list without one leaves the title to carry it.
  const hasActions = useMemo(() => cells.includes('actions'), [cells]);
  const context = useMemo(
    () => ({ members, people, title, description, hasActions, delegate: values.delegate }),
    [members, people, title, description, hasActions, values.delegate],
  );
  const textFields = useMemo(() => (description ? ['title', 'description'] : ['title']), [description]);
  // A property the list gives a column is edited under it; the rest keep their controls together at the end of the
  // last line, so a host that hides a column from its rows still reaches the value.
  const trailingFields = useMemo(
    () =>
      PROPERTY_FIELDS.filter(
        (field) => !cells.includes(field) && (field !== 'assignee' || members.length > 0 || !!values.delegate),
      ),
    [cells, members, values.delegate],
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
        {cells.map((cell) =>
          cell === 'title' ? (
            <Fragment key={cell}>
              <div className='row-start-1 min-w-0' style={{ gridColumn: spanFromTitle(cells, ['artifacts']) }}>
                <Form.Fields include={['title']} />
              </div>
              {description && (
                <div
                  className='row-start-2 min-w-0'
                  style={{ gridColumn: spanFromTitle(cells, ['artifacts', 'estimate']) }}
                >
                  <Form.Fields include={['description']} />
                </div>
              )}
            </Fragment>
          ) : PROPERTY_FIELDS.includes(cell) ? (
            <div key={cell} className={TRACK[cell]}>
              <Form.Fields include={[cell]} layout='tag' />
            </div>
          ) : cell === 'actions' && save ? (
            <div key={cell} className={TRACK.actions}>
              {save}
            </div>
          ) : null,
        )}
        {trailingFields.length > 0 && (
          <Layout.Flex
            align='center'
            gap='xs'
            classNames='min-w-0'
            style={{
              gridRow: description ? 3 : 2,
              gridColumn: spanFromTitle(cells, ['artifacts', 'estimate']),
            }}
            data-testid='taskList.edit.properties'
          >
            <Form.Fields include={trailingFields} sort={trailingFields} layout='tag' />
          </Layout.Flex>
        )}
        {children}
      </Form.Root>
    </TaskEditorContext.Provider>
  );
};

const TaskEditorContext = createContext<
  | (Pick<TaskEditorFormProps, 'members' | 'people' | 'title' | 'description'> & { hasActions: boolean } & Pick<
        TaskEditorValues,
        'delegate'
      >)
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
  const { title, hasActions } = useTaskEditorContext();
  return (
    <Field.Root classNames='min-w-0'>
      <Input.Root
        classNames='grow text-ellipsis'
        variant={title.subdued ? 'subdued' : 'default'}
        data-testid='taskList.edit.title'
        placeholder={title.placeholder}
        value={getValue() ?? ''}
        onChange={(event) => onValueChange(type, event.target.value)}
        onKeyDown={title.onKeyDown}
        onBlur={title.onBlur}
        // Only where the list gives the pane no actions column to put it in.
        end={
          !hasActions &&
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

const StatusGlyph = ({ type, jsonPath, getValue, onValueChange }: FormFieldRendererProps<Task.Status | undefined>) => (
  <TaskField field='status' value={getValue()} onChange={(value) => onValueChange(type, value)} testId={jsonPath} />
);

const PriorityGlyph = ({
  type,
  jsonPath,
  getValue,
  onValueChange,
}: FormFieldRendererProps<Task.Priority | undefined>) => (
  <TaskField field='priority' value={getValue()} onChange={(value) => onValueChange(type, value)} testId={jsonPath} />
);

const EstimateGlyph = ({
  type,
  jsonPath,
  getValue,
  onValueChange,
}: FormFieldRendererProps<Task.Estimate | undefined>) => (
  <TaskField field='estimate' value={getValue()} onChange={(value) => onValueChange(type, value)} testId={jsonPath} />
);

const AssigneeTag = ({
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
  const name = (assignee ? current.label : delegate && worker.label) || label;
  const icon = assignee ? current.icon : delegate ? worker.icon : UNASSIGNED_ICON;
  const tag = (
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
      <Button.Root variant='ghost' icon={icon} iconOnly label={name} data-testid={jsonPath} />
    </ActionMenu>
  );

  return <Layout.Block>{tag}</Layout.Block>;
};

AssigneeTag.displayName = 'TaskList.AssigneeTag';

/** One control per property wherever it sits: a glyph the narrow column tracks can hold, labelled by its tooltip. */
const FIELD_MAP = {
  assignee: AssigneeTag,
  description: DescriptionField,
  title: TitleField,
  estimate: EstimateGlyph,
  priority: PriorityGlyph,
  status: StatusGlyph,
};
