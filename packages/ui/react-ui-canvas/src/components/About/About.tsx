//
// Copyright 2026 DXOS.org
//

import React, { Fragment, type ReactNode } from 'react';

import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import * as Typography from '@dxos/react-ui/Typography';
import type * as Util from '@dxos/react-ui/Util';

export type AboutStat = { id: string; label: string; value: ReactNode };

export type AboutProps = Util.ThemedClassName<{
  stats: readonly AboutStat[];
}>;

/** A two-column table of the drawing's figures, one per list-height row: a label and its value. */
export const About = ({ classNames, stats }: AboutProps) => (
  <Panel.Root classNames={classNames} data-testid='about'>
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
