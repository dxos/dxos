//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import type * as Atom from 'effect/unstable/reactivity/Atom';
import React, { Fragment } from 'react';

import { DensityProvider, IconButton, Popover, Toolbar, useTranslation } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/react-ui';
import { type ActionExecutor, type ActionGraphProps, Menu, useMenuActions } from '@dxos/react-ui-menu';
import { osTranslations } from '@dxos/ui-theme';

import { meta } from '#meta';

import { useMobileLayout } from './MobileLayoutContext';

const APP_BAR_NAME = 'MobileLayout.AppBar';

/**
 * 44px, the iOS HIG minimum touch target. The density knobs cap a control at 40px (`--dx-control-lg`)
 * and the app bar's own row is 40px, so its controls have to be sized past both to be hittable —
 * the simulator walkthrough missed the back chevron every time at the density-md 32px.
 */
const TOUCH_TARGET = 'size-11';

export type MobileAppBarProps = {
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
export const MobileAppBar = composable<HTMLDivElement, MobileAppBarProps>(
  ({ classNames, title, actions, showBackButton, popoverAnchorId, onAction, onBack, ...props }, forwardedRef) => {
    const { t } = useTranslation(meta.profile.key);
    const menuActions = useMenuActions(actions);
    const actionsValue = useAtomValue(actions);
    const hasActions = actionsValue.nodes.length > 0;
    const { keyboardOpen } = useMobileLayout(APP_BAR_NAME);

    // Fall back to app name if no title provided.
    const displayTitle = title ?? t('current-app.name', { ns: osTranslations });

    // Wrap the menu trigger with Popover.Anchor when the popoverAnchorId is set.
    const AnchorRoot = popoverAnchorId ? Popover.Anchor : Fragment;

    return (
      <DensityProvider density='md'>
        <Toolbar.Root
          {...composableProps(props, {
            role: 'banner',
            // `min-h` rather than `h`: the Panel toolbar slot pins the row to `--dx-toolbar-size`,
            // and a min-height is the one way to grow past it without depending on class order.
            // 52px = the 44px touch target plus the toolbar's own `p-1` on both edges.
            classNames:
              'grid grid-cols-[var(--dx-rail-size)_1fr_var(--dx-rail-size)] items-center dx-density-md min-h-13',
          })}
          ref={forwardedRef}
        >
          {keyboardOpen ? (
            <IconButton
              variant='ghost'
              icon='ph--x--regular'
              iconOnly
              label={t('done.label')}
              classNames={TOUCH_TARGET}
            />
          ) : showBackButton ? (
            <IconButton
              variant='ghost'
              icon='ph--caret-left--regular'
              iconOnly
              label={t('back.label')}
              classNames={TOUCH_TARGET}
              onClick={onBack}
            />
          ) : (
            <div />
          )}
          <h1 className='text-center truncate font-thin uppercase'>{displayTitle}</h1>
          {hasActions ? (
            <AnchorRoot>
              <Menu.Root {...menuActions} caller={meta.profile.key} onAction={onAction}>
                <Menu.Trigger asChild>
                  <IconButton
                    variant='ghost'
                    icon='ph--dots-three-vertical--regular'
                    iconOnly
                    label={t('actions-menu.label')}
                    classNames={TOUCH_TARGET}
                  />
                </Menu.Trigger>
                <Menu.Content />
              </Menu.Root>
            </AnchorRoot>
          ) : (
            <span />
          )}
        </Toolbar.Root>
      </DensityProvider>
    );
  },
);

MobileAppBar.displayName = APP_BAR_NAME;
