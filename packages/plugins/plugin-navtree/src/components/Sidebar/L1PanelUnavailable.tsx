//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Message, useTranslation } from '@dxos/react-ui';
import { Tabs } from '@dxos/react-ui-tabs';

import { meta } from '#meta';

/**
 * Delay before the message appears: a workspace whose space is still loading has no graph node yet,
 * and materializes into a real panel on its own, so the fallback must not flash during that window.
 */
const RENDER_DELAY = '1s';

export type L1PanelUnavailableProps = {
  /** The unresolvable workspace id, which is the current tab value. */
  workspace: string;
  open?: boolean;
};

/**
 * Rendered in place of the L1 panel when the active workspace resolves to no graph node — a link to a
 * workspace this identity never had or which no longer exists, or persisted deck state pointing at
 * one after a profile switch. Without it the sidebar renders nothing at all, since `L1Tabs` only
 * emits panels for workspaces present in the graph.
 */
export const L1PanelUnavailable = ({ workspace, open }: L1PanelUnavailableProps) => {
  const { t } = useTranslation(meta.profile.key);

  return (
    <Tabs.Panel
      value={workspace}
      classNames={[
        'absolute inset-y-0 end-0 grid',
        'w-[calc(100%-var(--dx-l0-size))] lg:w-(--dx-l1-size) grid-cols-1 grid-rows-[var(--dx-rail-size)_1fr]',
        'py-[env(safe-area-inset-top)]',
      ]}
      tabIndex={-1}
      aria-label={t('workspace-unavailable.heading')}
      // An unavailable workspace has no tab in the rail, so the generated `aria-labelledby` would
      // reference a missing element.
      aria-labelledby={undefined}
      data-testid='navtree.workspace.unavailable'
      {...(!open && { inert: true })}
    >
      <Message.Root
        valence='info'
        // Second grid row, so the message clears the rail exactly as an L1 panel's tree does.
        classNames='row-start-2 self-start mx-1 animate-fade-in'
        style={{ animationDelay: RENDER_DELAY, animationFillMode: 'backwards' }}
      >
        <Message.Title>{t('workspace-unavailable.heading')}</Message.Title>
        <Message.Content>{t('workspace-unavailable.description')}</Message.Content>
      </Message.Root>
    </Tabs.Panel>
  );
};
