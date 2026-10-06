//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, type ReactNode } from 'react';

import { TogglePanel, type TogglePanelRootProps } from '@dxos/react-ui-components';
import * as Icon from '@dxos/react-ui/Icon';
import { mx } from '@dxos/ui-theme';

/** The bordered box a disclosure opens onto. */
export const PANEL_FRAME = 'border border-separator rounded-md min-w-0';

export type WidgetPanelProps = PropsWithChildren<
  {
    icon: string;
    label: string;
    /** Trails the label in the summary row (e.g., a failure count). */
    suffix?: ReactNode;
    error?: boolean;
    testId?: string;
  } & Pick<TogglePanelRootProps, 'onChangeOpen' | 'lazyMount'>
>;

/**
 * A chat widget that reads as one line of prose with a disclosure caret at its end, opening onto
 * its detail — the shared shape of every collapsible widget in the thread.
 */
export const WidgetPanel = ({
  icon,
  label,
  suffix,
  error,
  testId,
  onChangeOpen,
  lazyMount,
  children,
}: WidgetPanelProps) => (
  // The summary is a bare text row rather than a bordered panel header: the border belongs to
  // the detail it opens onto, so a collapsed widget reads as one line of prose in the feed.
  //
  // The body animates: the Collapsible measures its own `--height`, so the reveal ramps instead
  // of the content appearing and vanishing in one frame.
  <TogglePanel.Root
    onChangeOpen={onChangeOpen}
    lazyMount={lazyMount}
    // `w-0 min-w-full`: the editor sizes its content line to its widest child, so a wide payload
    // would stretch the whole line — carrying the summary row out of view and scrolling the
    // editor instead of the payload. Zero width removes this widget from that calculation, and
    // the min-width then takes the line's own width, which is what bounds the payload's scroller.
    classNames='w-0 min-w-full'
  >
    <TogglePanel.Header caret='end' data-testid={testId} classNames='gap-1'>
      <span className='flex min-w-0 items-center gap-2 text-fg-muted tabular-nums'>
        <Icon.Icon icon={icon} size='md' />
        {/* Takes the base colour on hover, as a breadcrumb link does: the title is prose, not a list row. */}
        <span className={mx('truncate group-hover:text-fg', error && 'text-error-text')}>{label}</span>
        {suffix}
      </span>
    </TogglePanel.Header>
    {/* No `Viewport`: its `overflow-y-auto` puts a scrollbar on the body for the length of the
          ramp, while the box is still shorter than the content it is growing to hold. */}
    <TogglePanel.Body>{children}</TogglePanel.Body>
  </TogglePanel.Root>
);

/** The same row without a caret, for a widget with nothing to open onto. */
export const WidgetPanelRow = ({ icon, label, testId }: Pick<WidgetPanelProps, 'icon' | 'label' | 'testId'>) => (
  <div className='flex items-center gap-2 p-1 text-fg-muted min-h-(--dx-control)' data-testid={testId}>
    <Icon.Icon icon={icon} size='md' />
    <span className='truncate'>{label}</span>
  </div>
);
