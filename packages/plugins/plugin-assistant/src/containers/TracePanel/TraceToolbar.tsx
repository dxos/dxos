//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { Menu, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';

import { meta } from '#meta';

import {
  ALL_PROCESS_ENVIRONMENTS,
  type ProcessEnvironment,
  environmentIcon,
  toggleProcessEnvironment,
} from './trace-filter';

export type TraceToolbarProps = {
  /** Process environments currently shown. */
  selected: readonly ProcessEnvironment[];
  onSelectedChange: (environments: ProcessEnvironment[]) => void;
};

/** The filter collapses to a funnel trigger, so the panel's own rows keep the width. */
export const TraceToolbar = ({ selected, onSelectedChange }: TraceToolbarProps) => {
  const handleToggle = useCallback(
    (environment: ProcessEnvironment) => onSelectedChange(toggleProcessEnvironment(selected, environment)),
    [selected, onSelectedChange],
  );

  const menu = useMenuBuilder(
    () =>
      MenuBuilder.make()
        .group(
          'processEnvironments',
          {
            label: ['trace-filter.menu', { ns: meta.profile.key }],
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
                  label: [`trace-environment-${environment}.label`, { ns: meta.profile.key }],
                  icon: environmentIcon(environment),
                  checked: selected.includes(environment),
                },
                () => handleToggle(environment),
              );
            }
            group.separator('line');
            group.action(
              'all',
              { label: ['trace-filter-all.label', { ns: meta.profile.key }], icon: 'ph--list-checks--regular' },
              () => onSelectedChange([...ALL_PROCESS_ENVIRONMENTS]),
            );
            group.action(
              'none',
              { label: ['trace-filter-none.label', { ns: meta.profile.key }], icon: 'ph--prohibit--regular' },
              () => onSelectedChange([]),
            );
          },
        )
        .build(),
    [handleToggle, selected, onSelectedChange],
  );

  return (
    <Menu.Root {...menu} alwaysActive>
      <Menu.Toolbar classNames='justify-between border-be border-subdued-separator'>
        <span />
        <Menu.Items />
      </Menu.Toolbar>
    </Menu.Root>
  );
};

TraceToolbar.displayName = 'TraceToolbar';
