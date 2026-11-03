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

/**
 * The pickers' options, shared by the row, the properties panel and the editor's chips so each field offers the same
 * values in the same order. Each takes the field's value rather than a task, since the editor sets them on a draft.
 */
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
      // `None` takes the unset glyph, so every option has an icon and the labels align.
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

/** Who holds the task, as one edit: the assignee, and the delegate when picking a person takes the task back. */
export type AssigneePatch = Pick<Task.Edit, 'assignee' | 'delegate'>;

export type AssigneeMenuOptions = {
  assignee?: Actor.Actor;
  /** How the current assignee is shown, so one the people list cannot name is still listed. */
  current?: { label?: string; icon: string };
  /** The agent working the task, listed checked above the agents it could go to instead. */
  delegate?: { label?: string; icon: string };
  members: readonly TaskMember[];
  people: readonly Person.Person[];
  /** The agents the host can hand the task to, after the people; each item runs its own delegation. */
  agents?: readonly MenuItem[];
  onChange: (patch: AssigneePatch) => void;
  t: Translate;
};

/** A pick of who holds the task: naming a person, or nobody, takes the task back from any agent working it. */
export const pickAssignee = (assignee: Actor.Actor | null, delegate: unknown): AssigneePatch => ({
  assignee,
  ...(delegate ? { delegate: null } : {}),
});

/**
 * One picker for who holds the task: unassigned, the current assignee when no other option names it, the space's
 * members and contacts, then a separator and the agents. Picking an agent delegates to it and keeps (or makes) the
 * reader the assignee; picking a person takes the task back from any agent, since the picker holds one answer to who
 * has it.
 */
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
      // The unset glyph, as the priority picker's `None` takes, so every option's label aligns.
      icon: UNSET_ICON,
      checked: !assignee && !delegate,
    }),
    // An assignee the people list cannot show — an agent, or an actor with no contact — is listed as itself, so the
    // picker says who holds the task before it is switched away.
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
