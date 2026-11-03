//
// Copyright 2026 DXOS.org
//

import { Obj, Ref } from '@dxos/echo';
import { type MenuAction, type MenuItem, createLineSeparator, createMenuAction } from '@dxos/react-ui-menu';
import { type Actor, type Person, Task } from '@dxos/types';

import { PERSON_ICON, shortDid } from './assignee.ts';
import { UNSET_ICON, priorityTextStyle, statusIcon, statusTextStyle } from './status-icons.ts';

/** A member of the task's space, offered as an assignee by identity. */
export type TaskMember = { did: string; name?: string };

type Translate = (key: string) => string;

export const statusMenuActions = ({
  status,
  onChange,
  t,
}: {
  status: Task.Status;
  onChange: (status: Task.Status) => void;
  t: Translate;
}): MenuAction[] =>
  Task.StatusOptions.map(({ id }) =>
    createMenuAction(`status-${id}`, () => onChange(id), {
      label: t(`status-${id}.label`),
      icon: statusIcon(id),
      iconClassNames: statusTextStyle(id),
      checked: status === id,
    }),
  );

export const priorityMenuActions = ({
  priority,
  onChange,
  t,
}: {
  priority?: Task.Priority;
  onChange: (priority: Task.Priority | null) => void;
  t: Translate;
}): MenuAction[] =>
  [Task.NullOption, ...Task.PriorityOptions].map(({ id, icon }) =>
    createMenuAction(`priority-${id}`, () => onChange(id === 'none' ? null : id), {
      label: t(`priority-${id}.label`),
      icon: icon ?? UNSET_ICON,
      iconClassNames: priorityTextStyle(id),
      checked: (priority ?? 'none') === id,
    }),
  );

export const estimateMenuActions = ({
  estimate,
  onChange,
}: {
  estimate?: Task.Estimate;
  onChange: (estimate: Task.Estimate | null) => void;
}): MenuAction[] =>
  [Task.NullOption, ...Task.EstimateOptions].map(({ id, title }) =>
    createMenuAction(`estimate-${id}`, () => onChange(id === 'none' ? null : id), {
      label: title,
      checked: (estimate ?? 'none') === id,
    }),
  );

export type AssigneePatch = Pick<Task.Edit, 'assignee' | 'delegate'>;

export type AssigneeMenuOptions = {
  assignee?: Actor.Actor;
  current?: { label?: string; icon: string };
  delegate?: { label?: string; icon: string };
  members: readonly TaskMember[];
  people: readonly Person.Person[];
  agents?: readonly MenuItem[];
  onChange: (patch: AssigneePatch) => void;
  t: Translate;
};

export const pickAssignee = (assignee: Actor.Actor | null, delegate: unknown): AssigneePatch => ({
  assignee,
  ...(delegate ? { delegate: null } : {}),
});

export const assigneeMenuActions = ({
  assignee,
  current,
  delegate,
  members,
  people,
  agents = [],
  onChange,
  t,
}: AssigneeMenuOptions): MenuItem[] => {
  const pick = (assignee: Actor.Actor | null) => onChange(pickAssignee(assignee, delegate));
  return [
    createMenuAction('assignee-none', () => pick(null), {
      label: t('assignee-none.label'),
      icon: UNSET_ICON,
      checked: !assignee && !delegate,
    }),
    ...(assignee &&
    !assignee.contact &&
    !members.some((member) => member.did === assignee.identityDid) &&
    current?.label
      ? [
          createMenuAction('assignee-current', () => {}, {
            label: current.label,
            icon: current.icon,
            checked: true,
            testId: 'taskList.assignee.current',
          }),
        ]
      : []),
    ...members.map((member) =>
      createMenuAction(`assignee-member-${member.did}`, () => pick({ identityDid: member.did, name: member.name }), {
        label: member.name ?? shortDid(member.did),
        icon: PERSON_ICON,
        checked: assignee?.identityDid === member.did,
        testId: 'taskList.assignee.member',
      }),
    ),
    ...people.map((person) =>
      createMenuAction(`assignee-${person.id}`, () => pick({ contact: Ref.make(person) }), {
        label: Obj.getLabel(person) ?? person.id,
        icon: PERSON_ICON,
        checked: Task.refEntityId(assignee?.contact) === person.id,
      }),
    ),
    ...(delegate || agents.length > 0 ? createLineSeparator('assignee-agents-separator').nodes : []),
    ...(delegate
      ? [
          createMenuAction('assignee-delegate', () => {}, {
            label: delegate.label ?? t('assignee-agent.label'),
            icon: delegate.icon,
            checked: true,
            testId: 'taskList.assignee.delegate',
          }),
        ]
      : []),
    ...agents,
  ];
};
