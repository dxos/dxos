//
// Copyright 2026 DXOS.org
//

import { Obj, Ref } from '@dxos/echo';
import { type MenuAction, createMenuAction } from '@dxos/react-ui-menu';
import { type Person, Task } from '@dxos/types';

import { PERSON_ICON, shortDid } from './assignee.ts';
import { UNSET_ICON } from './status-icons.ts';

/** A member of the task's space, offered as an assignee by identity. */
export type TaskMember = { did: string; name?: string };

export type AssigneeMenuOptions = {
  task: Task.Task;
  /** How the current assignee is shown, so one the people list cannot name is still listed. */
  current?: { label?: string; icon: string };
  members: readonly TaskMember[];
  people: readonly Person.Person[];
  onTaskUpdate: (task: Task.Task, patch: Task.Edit) => void;
  t: (key: string) => string;
};

/**
 * The assignee picker's options, shared by the properties panel and the row so both offer the same people in the
 * same order: unassigned, the current assignee when no other option names it, the space's members, then contacts.
 */
export const assigneeMenuActions = ({
  task,
  current,
  members,
  people,
  onTaskUpdate,
  t,
}: AssigneeMenuOptions): MenuAction[] => {
  const assignee = task.assignee;
  return [
    createMenuAction('assignee-none', () => onTaskUpdate(task, { assignee: null }), {
      label: t('assignee-none.label'),
      // The unset glyph, as the priority picker's `None` takes, so every option's label aligns.
      icon: UNSET_ICON,
      checked: !assignee,
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
      createMenuAction(
        `assignee-member-${member.did}`,
        () => onTaskUpdate(task, { assignee: { identityDid: member.did, name: member.name } }),
        {
          label: member.name ?? shortDid(member.did),
          icon: PERSON_ICON,
          checked: assignee?.identityDid === member.did,
          testId: 'taskList.assignee.member',
        },
      ),
    ),
    ...people.map((person) =>
      createMenuAction(`assignee-${person.id}`, () => onTaskUpdate(task, { assignee: { contact: Ref.make(person) } }), {
        label: Obj.getLabel(person) ?? person.id,
        icon: PERSON_ICON,
        checked: Task.refEntityId(assignee?.contact) === person.id,
      }),
    ),
  ];
};
