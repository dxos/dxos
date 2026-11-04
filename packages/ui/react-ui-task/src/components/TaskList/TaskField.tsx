//
// Copyright 2026 DXOS.org
//

import React, { type MouseEvent, type ReactNode } from 'react';

import { ActionMenu, type MenuAction, createMenuAction } from '@dxos/react-ui-menu';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import { Task } from '@dxos/types';
import { mx } from '@dxos/ui-theme';

import { translationKey } from '#translations';

import {
  UNSET_ICON,
  estimateTextStyle,
  priorityIcon,
  priorityTextStyle,
  statusIcon,
  statusTextStyle,
} from '../../util/status-icons.ts';

type TaskFieldValue =
  | { field: 'status'; value?: Task.Status; onChange?: (value: Task.Status) => void; working?: boolean }
  | { field: 'priority'; value?: Task.Priority; onChange?: (value: Task.Priority | undefined) => void }
  | { field: 'estimate'; value?: Task.Estimate; onChange?: (value: Task.Estimate | undefined) => void };

export type TaskFieldProps = TaskFieldValue & {
  testId?: string;
  classNames?: string;
};

/** `named` when the glyph is the value's own text, so it needs no hidden label. */
type FieldFace = { glyph: ReactNode; label: string; named: boolean; actions: () => MenuAction[] };

/**
 * One property cell: status, priority or estimate, read and set as a bare glyph one block wide. A list row and an
 * inline create row both render it, so the value reads the same and sits in the same track in either.
 */
export const TaskField = ({ testId, classNames, ...props }: TaskFieldProps) => {
  const { t } = Hooks.useTranslation(translationKey);
  const { glyph, label, named, actions } = fieldFace(props, t);
  const hidden = !named && <span className='sr-only'>{label}</span>;

  if (!props.onChange) {
    return (
      <Layout.Block aria-hidden={false} data-testid={testId} classNames={classNames}>
        {glyph}
        {hidden}
      </Layout.Block>
    );
  }

  return (
    <Layout.Block classNames={classNames}>
      {/* Deferred: a list renders one of these per task, and the menu is opened for at most one. */}
      <ActionMenu deferUntilOpen actions={actions}>
        <Button.Root
          variant='ghost'
          label={label}
          data-testid={testId}
          classNames='w-(--dx-block-size) px-0 justify-center text-xs tabular-nums'
          // The row is the selection target; opening the menu must not also select it.
          onClick={(event: MouseEvent) => event.stopPropagation()}
        >
          {glyph}
          {hidden}
        </Button.Root>
      </ActionMenu>
    </Layout.Block>
  );
};

TaskField.displayName = 'TaskList.Field';

const fieldFace = (props: TaskFieldValue, t: (key: string) => string): FieldFace => {
  switch (props.field) {
    case 'status': {
      const { value = 'todo', onChange, working } = props;
      return {
        glyph: working ? (
          <Icon.Icon icon='ph--spinner--regular' classNames='text-info-text animate-spin' />
        ) : (
          <Icon.Icon icon={statusIcon(value)} classNames={statusTextStyle(value)} />
        ),
        label: t(`status-${value}.label`),
        named: false,
        actions: () =>
          Task.StatusOptions.map(({ id }) =>
            createMenuAction(`status-${id}`, () => onChange?.(id), {
              label: t(`status-${id}.label`),
              icon: statusIcon(id),
              iconClassNames: statusTextStyle(id),
              checked: value === id,
            }),
          ),
      };
    }

    case 'priority': {
      const { value, onChange } = props;
      return {
        glyph: <Icon.Icon icon={priorityIcon(value)} classNames={priorityTextStyle(value)} />,
        label: value ? t(`priority-${value}.label`) : t('task-priority.label'),
        named: false,
        actions: () =>
          [Task.NullOption, ...Task.PriorityOptions].map(({ id, icon }) =>
            createMenuAction(`priority-${id}`, () => onChange?.(id === 'none' ? undefined : id), {
              label: t(`priority-${id}.label`),
              // `None` takes the row's unset glyph, so every option has an icon and the labels align.
              icon: icon ?? UNSET_ICON,
              iconClassNames: priorityTextStyle(id),
              checked: (value ?? 'none') === id,
            }),
          ),
      };
    }

    case 'estimate': {
      const { value, onChange } = props;
      return {
        // The size is its own label: `XS`…`XL` is a vocabulary a reader already knows.
        glyph: value ? (
          <span className={mx(estimateTextStyle(value))}>{value.toUpperCase()}</span>
        ) : (
          <Icon.Icon icon={UNSET_ICON} classNames='text-neutral-500' />
        ),
        label: value ? value.toUpperCase() : t('task-estimate.label'),
        named: !!value,
        actions: () =>
          [Task.NullOption, ...Task.EstimateOptions].map(({ id, title }) =>
            createMenuAction(`estimate-${id}`, () => onChange?.(id === 'none' ? undefined : id), {
              label: title,
              checked: (value ?? 'none') === id,
            }),
          ),
      };
    }
  }
};
