//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { type Routine, type Trigger } from '@dxos/compute';
import { useObject } from '@dxos/echo-react';
import { Card, Icon, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

import { cronToSchedule, describeSchedule } from '../Schedule';

export type RoutineCardProps = AppSurface.ObjectCardProps<Routine.Routine>;

/**
 * Compact preview of a {@link Routine.Routine}: when it runs. Rendered into the
 * `AppSurface.CardContent` slot — Card.Root is supplied by the surface host (the project article's
 * gallery, popovers, related-objects), so this emits Card.Body only. Without it a routine falls back
 * to the generic form preview, which renders its `spec`/`triggers` internals rather than a summary.
 */
export const RoutineCard = ({ subject }: RoutineCardProps) => {
  const { t } = useTranslation(meta.profile.key);
  const [routine] = useObject(subject);
  // MVP enforces at most one trigger; the summary describes it.
  const [trigger] = useObject(routine.triggers.at(0));

  // Active means the same thing as in the routines list: a trigger exists and is switched on.
  const active = trigger?.enabled === true;

  return (
    <Card.Body>
      <Card.Row>
        {/* The gutter is reserved either way so the summary stays aligned across cards. */}
        <Card.Block>{active && <Icon icon='ph--check-circle--regular' classNames='text-green-text' />}</Card.Block>
        <Card.Text variant='description' classNames='line-clamp-2'>
          {describeTrigger(trigger?.spec, t)}
        </Card.Text>
      </Card.Row>
    </Card.Body>
  );
};

RoutineCard.displayName = 'RoutineCard';

/**
 * The same sentence the trigger editor shows above the schedule picker. Non-timer kinds have no
 * parameters worth summarizing, so they reuse the kind description from the trigger-kind picker.
 */
const describeTrigger = (spec: Trigger.Spec | undefined, t: (key: string) => string): string => {
  if (!spec) {
    return t('add-trigger-first.message');
  }

  return spec.kind === 'timer'
    ? describeSchedule(cronToSchedule(spec.cron))
    : t(`trigger-kind.${spec.kind}.description`);
};
