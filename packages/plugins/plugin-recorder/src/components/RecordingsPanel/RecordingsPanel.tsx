//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, type ReactNode } from 'react';

import * as Panel from '@dxos/react-ui/Panel';

export type RecordingsPanelProps = PropsWithChildren<{
  role?: string;
  /** The companion's actions. */
  toolbar: ReactNode;
  /** The player of the current row, docked in the status bar. */
  statusbar: ReactNode;
}>;

/**
 * The layout every Recordings companion shares: the toolbar, the list of rows (which scrolls itself), and the player of the
 * current row docked in the status bar, so a slide's takes and a presentation's slides read and play the same way.
 */
export const RecordingsPanel = ({ role, toolbar, statusbar, children }: RecordingsPanelProps) => (
  <Panel.Root role={role}>
    <Panel.Header>{toolbar}</Panel.Header>
    <Panel.Body>{children}</Panel.Body>
    <Panel.Footer classNames='border-t border-separator-subtle' data-testid='recorder.statusbar'>
      {statusbar}
    </Panel.Footer>
  </Panel.Root>
);

RecordingsPanel.displayName = 'RecordingsPanel';
