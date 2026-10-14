//
// Copyright 2026 DXOS.org
//

import React, { Fragment, type ReactNode } from 'react';

import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import * as Typography from '@dxos/react-ui/Typography';
import type * as Util from '@dxos/react-ui/Util';

import { InspectorMenu } from '../InspectorMenu/index.ts';

export type AboutStat = { id: string; label: string; value: ReactNode };

export type AboutProps = Util.ThemedClassName<{
  stats: readonly AboutStat[];
  /** Docks or floats the inspectors, from the panel's menu; the toolbar shows only when given. */
  onDockedChange?: (docked: boolean) => void;
}>;

/** A two-column table of the drawing's figures, one per list-height row: a label and its value. */
export const About = ({ classNames, stats, onDockedChange }: AboutProps) => (
  <Panel.Root classNames={classNames} data-testid='about'>
    {onDockedChange && (
      <Panel.Header asChild>
        <Toolbar.Root data-testid='about-toolbar'>
          <Toolbar.Separator variant='gap' />
          {/* About only docks, so its menu only floats the inspectors. */}
          <InspectorMenu docked onDockedChange={onDockedChange} data-testid='about-menu' />
        </Toolbar.Root>
      </Panel.Header>
    )}
    <Panel.Body>
      <Layout.Container>
        <Layout.Grid cols={['fill', 'auto']}>
          {stats.map(({ id, label, value }) => (
            <Fragment key={id}>
              <Typography.Text tone='muted' truncate>
                {label}
              </Typography.Text>
              <Typography.Text classNames='text-end tabular-nums' data-testid={`about-${id}`}>
                {value}
              </Typography.Text>
            </Fragment>
          ))}
        </Layout.Grid>
      </Layout.Container>
    </Panel.Body>
  </Panel.Root>
);
