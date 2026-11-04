//
// Copyright 2026 DXOS.org
//

import React, { type MouseEvent, type ReactNode } from 'react';

import { ActionMenu, type MenuAction, createMenuAction } from '@dxos/react-ui-menu';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import * as Tag from '@dxos/react-ui/Tag';
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

export type TaskFieldVariant = 'glyph' | 'tag';

type TaskFieldValue =
  | { field: 'status'; value?: Task.Status; onChange?: (value: Task.Status) => void; working?: boolean }
  | { field: 'priority'; value?: Task.Priority; onChange?: (value: Task.Priority | undefined) => void }
  | { field: 'estimate'; value?: Task.Estimate; onChange?: (value: Task.Estimate | undefined) => void };

export type TaskFieldProps = TaskFieldValue & {
  /** `glyph`, a list row's bare control; `tag`, the create row's. Both are one block wide, so the two rows align. */
  variant?: TaskFieldVariant;
  testId?: string;
  classNames?: string;
};

type FieldFace = { glyph: ReactNode; label: string; unset: boolean; actions: () => MenuAction[] };

/**
 * One property cell: status, priority or estimate, read and set where a row shows it. A list row and the create row
 * both render it, as a bare glyph or as a `Tag`, so the value reads the same and sits in the same track in either.
 */
export const TaskField = ({ variant = 'glyph', testId, classNames, ...props }: TaskFieldProps) => {
  const { t } = Hooks.useTranslation(translationKey);
  const { glyph, label, unset, actions } = fieldFace(props, t);

  if (!props.onChange) {
    return (
      <Layout.Block aria-hidden={false} data-testid={testId} classNames={classNames}>
        {glyph}
        <span className='sr-only'>{label}</span>
      </Layout.Block>
    );
  }

  return (
    <Layout.Block classNames={classNames}>
      {/* Deferred: a list renders one of these per task, and the menu is opened for at most one. */}
      <ActionMenu deferUntilOpen actions={actions}>
        {variant === 'tag' ? (
          <Tag.Tag aria-label={label} data-placeholder-shown={unset ? '' : undefined} data-testid={testId}>
            {glyph}
          </Tag.Tag>
        ) : (
          <Button.Root
            variant='ghost'
            label={label}
            data-testid={testId}
            classNames='w-(--dx-block-size) px-0 justify-center text-xs tabular-nums'
            // The row is the selection target; opening the menu must not also select it.
            onClick={(event: MouseEvent) => event.stopPropagation()}
          >
            {glyph}
          </Button.Root>
        )}
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
        unset: false,
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
        unset: !value,
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
        unset: !value,
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
