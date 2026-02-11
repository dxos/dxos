//
// Copyright 2025 DXOS.org
//

import { type Atom, useAtomValue } from '@effect-atom/atom-react';
import React, { Fragment } from 'react';

import { IconButton, Popover, type ThemedClassName, Toolbar, useTranslation } from '@dxos/react-ui';
import {
  type ActionExecutor,
  type ActionGraphProps,
  DropdownMenu,
  MenuProvider,
  useMenuActions,
} from '@dxos/react-ui-menu';
import { mx, osTranslations } from '@dxos/ui-theme';

import { meta } from '../../meta';

const APP_BAR_NAME = 'SimpleLayout.AppBar';

export type AppBarProps = ThemedClassName<{
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
}>;

/**
 * AppBar component that renders a title, optional back button, and actions dropdown.
 */
export const AppBar = ({
  classNames,
  title,
  actions,
  showBackButton,
  popoverAnchorId,
  onAction,
  onBack,
}: AppBarProps) => {
  const { t } = useTranslation(meta.id);
  const menu = useMenuActions(actions);
  const actionsValue = useAtomValue(actions);
  const hasActions = actionsValue.nodes.length > 0;

  // Fall back to app name if no title provided.
  const displayTitle = title ?? t('current app name', { ns: osTranslations });

  // Wrap the menu trigger with Popover.Anchor when the popoverAnchorId is set.
  const AnchorRoot = popoverAnchorId ? Popover.Anchor : Fragment;

  return (
    <Toolbar.Root
      role='banner'
      classNames={mx(
        'grid grid-cols-[var(--rail-size)_1fr_var(--rail-size)] bs-[var(--rail-action)] items-center',
        'density-fine',
        classNames,
      )}
    >
      {showBackButton ? (
        <IconButton variant='ghost' icon='ph--caret-left--regular' iconOnly label={t('back label')} onClick={onBack} />
      ) : (
        <div />
      )}
      <h1 className='text-center truncate font-thin uppercase'>{displayTitle}</h1>
      {hasActions ? (
        <AnchorRoot>
          <MenuProvider {...menu} onAction={onAction}>
            <DropdownMenu.Root caller={meta.id}>
              <DropdownMenu.Trigger asChild>
                <IconButton
                  variant='ghost'
                  icon='ph--dots-three-vertical--regular'
                  iconOnly
                  label={t('actions menu label')}
                />
              </DropdownMenu.Trigger>
            </DropdownMenu.Root>
          </MenuProvider>
        </AnchorRoot>
      ) : (
        <span />
      )}
    </Toolbar.Root>
  );
};

AppBar.displayName = APP_BAR_NAME;
