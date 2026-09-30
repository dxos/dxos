//
// Copyright 2026 DXOS.org
//

import { useCallback } from 'react';

import { MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';

import { translationKey } from '../../translations.ts';
import {
  ALL_PROCESS_ENVIRONMENTS,
  type ProcessEnvironment,
  environmentIcon,
  toggleProcessEnvironment,
} from './trace-filter.ts';

export type UseTraceMenuOptions = {
  /** Process environments currently shown. */
  selected: readonly ProcessEnvironment[];
  onSelectedChange: (environments: ProcessEnvironment[]) => void;
  /** How many processes are picked; the clear action shows only while there are some. */
  selectionCount?: number;
  onClearSelection?: () => void;
};

/**
 * Environment filter menu for the trace panel's toolbar.
 * The group collapses to a funnel trigger, so the panel's own rows keep the width.
 */
export const useTraceMenu = ({
  selected,
  onSelectedChange,
  selectionCount = 0,
  onClearSelection,
}: UseTraceMenuOptions) => {
  const handleToggle = useCallback(
    (environment: ProcessEnvironment) => onSelectedChange(toggleProcessEnvironment(selected, environment)),
    [selected, onSelectedChange],
  );

  return useMenuBuilder(
    () =>
      MenuBuilder.make()
        .action(
          'clearSelection',
          {
            label: ['trace-clear-selection.label', { ns: translationKey }],
            icon: 'ph--selection-slash--regular',
            iconOnly: true,
            hidden: selectionCount === 0,
            testId: 'tracePanel.clearSelection',
          },
          () => onClearSelection?.(),
        )
        .group(
          'processEnvironments',
          {
            label: ['trace-filter.menu', { ns: translationKey }],
            icon: 'ph--funnel--regular',
            iconOnly: true,
            variant: 'dropdownMenu',
            selectCardinality: 'multiple',
            value: [...selected],
            testId: 'tracePanel.filter',
          },
          (group) => {
            for (const environment of ALL_PROCESS_ENVIRONMENTS) {
              group.action(
                environment,
                {
                  label: [`trace-environment-${environment}.label`, { ns: translationKey }],
                  icon: environmentIcon(environment),
                  checked: selected.includes(environment),
                },
                () => handleToggle(environment),
              );
            }
            group.separator('line');
            group.action(
              'all',
              { label: ['trace-filter-all.label', { ns: translationKey }], icon: 'ph--list-checks--regular' },
              () => onSelectedChange([...ALL_PROCESS_ENVIRONMENTS]),
            );
            group.action(
              'none',
              { label: ['trace-filter-none.label', { ns: translationKey }], icon: 'ph--prohibit--regular' },
              () => onSelectedChange([]),
            );
          },
        )
        .build(),
    [handleToggle, selected, onSelectedChange, selectionCount, onClearSelection],
  );
};
