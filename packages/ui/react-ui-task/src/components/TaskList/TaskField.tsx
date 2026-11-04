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
  ESTIMATE_ICON,
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

type FieldFace = { glyph: ReactNode; label: string; glyphIsLabel: boolean; actions: () => MenuAction[] };

export const TaskField = ({ testId, classNames, ...props }: TaskFieldProps) => {
  const { t } = Hooks.useTranslation(translationKey);
  const { glyph, label, glyphIsLabel, actions } = fieldFace(props, t);
  const hidden = !glyphIsLabel && <span className='sr-only'>{label}</span>;

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
      <ActionMenu deferUntilOpen actions={actions}>
        <Button.Root
          variant='ghost'
          label={label}
          data-testid={testId}
          classNames='w-(--dx-block-size) px-0 justify-center text-xs tabular-nums'
          onClick={keepRowSelection}
        >
          {glyph}
          {hidden}
        </Button.Root>
      </ActionMenu>
    </Layout.Block>
  );
};

TaskField.displayName = 'TaskList.Field';

const keepRowSelection = (event: MouseEvent) => event.stopPropagation();

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
        glyphIsLabel: false,
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
        glyphIsLabel: false,
        actions: () =>
          [Task.NullOption, ...Task.PriorityOptions].map(({ id, icon }) =>
            createMenuAction(`priority-${id}`, () => onChange?.(id === 'none' ? undefined : id), {
              label: t(`priority-${id}.label`),
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
        glyph: value ? (
          <span className={mx(estimateTextStyle(value))}>{value.toUpperCase()}</span>
        ) : (
          <Icon.Icon icon={ESTIMATE_ICON} classNames='text-neutral-500' />
        ),
        label: value ? value.toUpperCase() : t('task-estimate.label'),
        glyphIsLabel: !!value,
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
