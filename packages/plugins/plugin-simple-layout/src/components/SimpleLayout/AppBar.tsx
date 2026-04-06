//
// Copyright 2025 DXOS.org
//

import { type Atom, useAtomValue } from '@effect-atom/atom-react';
import React, { Fragment } from 'react';

import { IconButton, Popover, Toolbar, useTranslation } from '@dxos/react-ui';
import { type ActionExecutor, type ActionGraphProps, Menu, useMenuActions } from '@dxos/react-ui-menu';
import { composable, composableProps, osTranslations } from '@dxos/ui-theme';

import { meta } from '#meta';
import { useMobileLayout } from '../MobileLayout';

const APP_BAR_NAME = 'SimpleLayout.AppBar';

export type AppBarProps = {
  /** Title/label to display in the banner. */
  title?: string;
  /** Action graph atom for the dropdown menu. */
  actions: Atom.Atom<ActionGraphProps>;
  /** Whether to show the back button. */
  showBackButton?: boolean;
  /** Popover anchor ID for the dropdown trigger. */
  popoverAnchorId?: string;
  /** Action executor callback. */
  onAction?: ActionExecutor;
  /** Callback when back button is clicked. */
  onBack?: () => void;
};

/**
 * AppBar component that renders a title, optional back button, and actions dropdown.
 */
export const AppBar = composable<HTMLDivElement, AppBarProps>(
  ({ classNames, title, actions, showBackButton, popoverAnchorId, onAction, onBack, ...props }, forwardedRef) => {
    const { t } = useTranslation(meta.id);
    const menuActions = useMenuActions(actions);
    const actionsValue = useAtomValue(actions);
    const hasActions = actionsValue.nodes.length > 0;
    const { keyboardOpen } = useMobileLayout(APP_BAR_NAME);

    // Fall back to app name if no title provided.
    const displayTitle = title ?? t('current-app.name', { ns: osTranslations });

    // Wrap the menu trigger with Popover.Anchor when the popoverAnchorId is set.
    const AnchorRoot = popoverAnchorId ? Popover.Anchor : Fragment;

    return (
      <Toolbar.Root
        {...composableProps(props, {
          role: 'banner',
          classNames: 'grid grid-cols-[var(--dx-rail-size)_1fr_var(--dx-rail-size)] items-center dx-density-fine',
        })}
        ref={forwardedRef}
      >
        {keyboardOpen ? (
          <IconButton variant='ghost' icon='ph--x--regular' iconOnly label={t('done.label')} />
        ) : showBackButton ? (
          <IconButton
            variant='ghost'
            icon='ph--caret-left--regular'
            iconOnly
            label={t('back.label')}
            onClick={onBack}
          />
        ) : (
          <div />
        )}
        <h1 className='text-center truncate font-thin uppercase'>{displayTitle}</h1>
        {hasActions ? (
          <AnchorRoot>
            <Menu.Root {...menuActions} caller={meta.id} onAction={onAction}>
              <Menu.Trigger asChild>
                <IconButton
                  variant='ghost'
                  icon='ph--dots-three-vertical--regular'
                  iconOnly
                  label={t('actions-menu.label')}
                />
              </Menu.Trigger>
              <Menu.Content />
            </Menu.Root>
          </AnchorRoot>
        ) : (
          <span />
        )}
      </Toolbar.Root>
    );
  },
);

AppBar.displayName = APP_BAR_NAME;
