//
// Copyright 2026 DXOS.org
//

import React, { type ReactNode } from 'react';

import { Flex } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { useTaskListContext } from './TaskListContext.ts';

export type TaskRowProps = {
  /** The disclosure cell, for a list that discloses branches; an empty cell holds the track otherwise. */
  indicator?: ReactNode;
  /** The ordinal or checkbox. */
  gutter?: ReactNode;
  status: ReactNode;
  title: ReactNode;
  artifacts?: ReactNode;
  assignee?: ReactNode;
  estimate?: ReactNode;
  priority?: ReactNode;
  actions?: ReactNode;
  /** A line under the title for the task's chips; it takes no height while empty. */
  chips?: ReactNode;
  /** The line under the title (and the chips), from the title to the trailing controls. */
  description?: ReactNode;
};

/**
 * One task's cells on the list's column template, shared by the tree's read-only rows and the editable pane under
 * them, so a field sits exactly where the value it edits is read.
 *
 * Cells, not a container: they are direct children of the host's grid (the tree row's subgrid, or the pane's own grid
 * on the same template) and flow into its tracks in order. A track the list has is always filled — with an empty
 * cell when a slot is absent — so the cells after it stay in their columns.
 */
export const TaskRow = ({
  indicator,
  gutter,
  status,
  title,
  artifacts,
  assignee,
  estimate,
  priority,
  actions,
  chips,
  description,
}: TaskRowProps) => {
  const { hierarchical, groups, showGutter, showEstimates, hasActions } = useTaskListContext('TaskList.Row');
  return (
    <>
      {(hierarchical || !!groups) && (indicator || <span />)}
      {showGutter && (gutter || <span />)}
      {status}
      {title}
      {/* The lines under the title come next in the DOM, though placed below it, so Tab runs from the title into its
          description before the trailing controls. Being placed explicitly, they leave the flow to the cells after. */}
      {chips !== undefined && (
        <Flex align='center' classNames='col-[title] row-start-2 empty:hidden' data-testid='taskList.item.chips'>
          {chips}
        </Flex>
      )}
      {/* Clears the gutter and the status control, or it reads as belonging to the row above, and stops short of the
          trailing controls so it does not run beneath them. */}
      {description && (
        <Flex
          column
          gap='sm'
          classNames={mx('col-[title/assignee] min-w-0', chips !== undefined ? 'row-start-3 pb-1' : 'row-start-2')}
        >
          {description}
        </Flex>
      )}
      {artifacts || <span />}
      {assignee || <span />}
      {showEstimates && (estimate || <span />)}
      {priority || <span />}
      {hasActions && (actions || <span />)}
    </>
  );
};

TaskRow.displayName = 'TaskList.Row';
