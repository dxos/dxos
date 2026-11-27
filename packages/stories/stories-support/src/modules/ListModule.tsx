//
// Copyright 2026 DXOS.org
//

import React, { type ReactNode } from 'react';

import { Listbox } from '@dxos/react-ui-list';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Toolbar from '@dxos/react-ui/Toolbar';

/** One row of a column: a leading icon, a title and a description under it. */
export type ListRow = {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
  readonly icon?: string;
};

export type ListModuleProps = {
  /** The column's heading; the row count is added to it. */
  title: string;
  rows: readonly ListRow[];
  empty: string;
  testId: string;
  /** Replaces the heading, for a column with controls. */
  header?: ReactNode;
};

/** A column of the story: a heading over one scrolling list of rows. */
export const ListModule = ({ title, rows, empty, testId, header }: ListModuleProps) => (
  <Panel.Root>
    <Panel.Header>
      {header ?? (
        <Toolbar.Root>
          <Toolbar.Text>{rows.length > 0 ? `${title} (${rows.length})` : title}</Toolbar.Text>
        </Toolbar.Root>
      )}
    </Panel.Header>
    <Panel.Body asChild>
      <ScrollArea.Root orientation='vertical'>
        <ScrollArea.Viewport>
          <Listbox.Root
            items={rows.map(({ id, label, description, icon }) => ({ value: id, label, description, icon }))}
            data-testid={testId}
          >
            <Listbox.Content aria-label={title}>
              {rows.map((row) => (
                <Listbox.Item key={row.id} id={row.id} data-testid={`${testId}.item`}>
                  <Listbox.ItemIcon />
                  <Listbox.ItemText />
                  <Listbox.ItemDescription />
                </Listbox.Item>
              ))}
              <Listbox.Empty>{empty}</Listbox.Empty>
            </Listbox.Content>
          </Listbox.Root>
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </Panel.Body>
  </Panel.Root>
);
