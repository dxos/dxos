//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren, useCallback, useEffect, useRef, useState } from 'react';

import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as CardSlot from '@dxos/app-toolkit/CardSlot';
import * as Hooks from '@dxos/app-toolkit/Hooks';
import * as ObjectCard from '@dxos/app-toolkit/ObjectCard';
import { Attention } from '@dxos/react-ui-attention';
import { ActionMenu, useMenuActions, useMenuItems } from '@dxos/react-ui-menu';
import * as Button from '@dxos/react-ui/Button';
import * as Card from '@dxos/react-ui/Card';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';
import * as Popover from '@dxos/react-ui/Popover';
import * as Theme from '@dxos/react-ui/Theme';
import * as VirtualAnchor from '@dxos/react-ui/VirtualAnchor';

import { useDeckState } from '#hooks';
import { meta } from '#meta';

const DEBOUNCE_DELAY = 40;

/** A card surface that threw still fills the card's rows; the default fallback lands in the icon column. */
const CardFallback = ({ error }: { error: Error }) => (
  <Card.Body>
    <Card.Row>
      <Card.Text variant='muted' role='alert' data-testid='error-boundary-fallback'>
        {error.message}
      </Card.Text>
    </Card.Row>
  </Card.Body>
);

export type PopoverRootProps = PropsWithChildren;

export const PopoverRoot = ({ children }: PopoverRootProps) => {
  const { state, updateEphemeral } = useDeckState();
  const virtualRef = useRef<Element | null>(null);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // TODO(thure): This is a workaround for the race condition between displaying a Popover and either rendering
  //  the anchor further down the tree or measuring the virtual trigger's client rect.
  useEffect(() => {
    setOpen(false);
    if (state.popoverOpen) {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (state.popoverAnchor) {
        virtualRef.current = state.popoverAnchor;
      }
      debounceRef.current = setTimeout(() => setOpen(true), DEBOUNCE_DELAY);
    }
  }, [state.popoverOpen, state.popoverAnchorId, state.popoverAnchor, state.popoverContent]);

  const isRename = state.popoverKind === 'rename';
  // The rename popover is modal so other navtree item menus are inert while it is open.
  const modal = isRename;
  // Anchor to the right of the row on wide displays; drop centered below on narrow ones.
  const [isLg] = UiHooks.useMediaQuery('lg', { fallback: [true] });
  const side = isRename ? (isLg ? 'right' : 'bottom') : state.popoverSide;

  const handleOpenChange = useCallback(
    ({ open }: { open: boolean }) => {
      if (open) {
        return;
      }
      setOpen(false);
      updateEphemeral((state) => ({
        ...state,
        popoverOpen: false,
        popoverAnchor: undefined,
        popoverAnchorId: undefined,
        popoverSide: undefined,
      }));
    },
    [updateEphemeral],
  );

  // Focus leaving the popover (into a portaled menu, or CodeMirror re-focusing itself) must not dismiss it: only a
  // pointer-down outside the card, or Escape, closes. Layers spawned from the card (its menu, a select) are the
  // machine's nested layers, so a press inside one is not outside.
  const handleFocusOutside = useCallback((event: Event) => event.preventDefault(), []);

  return (
    <Popover.Root
      modal={modal}
      open={open}
      // The trigger was the row that asked for the popover; the rename field takes focus, a card does not.
      autoFocus={isRename}
      positioning={{
        ...(state.popoverAnchor ? VirtualAnchor.virtualAnchor(virtualRef) : {}),
        placement: side,
        hideWhenDetached: true,
      }}
      onFocusOutside={handleFocusOutside}
      onOpenChange={handleOpenChange}
    >
      {children}
    </Popover.Root>
  );
};

export const PopoverContent = () => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const { state } = useDeckState();
  const popoverSubject =
    state.popoverContent && 'subject' in state.popoverContent ? state.popoverContent.subject : undefined;
  // The popover is portaled; resolve the origin plank from the anchor element it was opened from.
  const pivotId =
    state.popoverAnchor instanceof Element ? Attention.getRootAttendableId(state.popoverAnchor) : undefined;
  const objectMenuItems = Hooks.useObjectMenuItems(popoverSubject, pivotId);
  const menu = useMenuActions();
  const menuItems = useMenuItems(menu, undefined, objectMenuItems);
  const title = state.popoverTitle ? Theme.toLocalizedString(state.popoverTitle, t) : 'Unknown';
  const content = state.popoverContent;
  // Base and rename popovers render a plugin-provided component; everything else falls through to the card.
  const isComponentPopover =
    (state.popoverKind === 'base' || state.popoverKind === 'rename') && !!content && 'component' in content;
  const isRename = state.popoverKind === 'rename';

  const roundedClassNames = 'rounded-sm';

  return (
    <Popover.Content
      // The default size, not the anchor's: a navtree row or plank heading sits in the shell's `lg` scope.
      size='md'
      classNames={[
        roundedClassNames,
        (!isComponentPopover || isRename) && 'p-0',
        // A rename popover holds an object's properties form, which a popover's grid body would not grow to fit.
        isRename && 'w-[22rem]',
        !isRename && [
          'origin-(--transform-origin)',
          'data-[state=open]:animate-popover-in',
          'data-[state=closed]:animate-popover-out',
        ],
      ]}
    >
      {isComponentPopover && content && 'component' in content ? (
        /*
         * Base popover: a plugin-provided component (e.g., editor link preview).
         */
        <Popover.Body>
          <Surface.Surface type={AppSurface.Popover} data={content} limit={1} />
        </Popover.Body>
      ) : (
        /*
         * Card popover (default). Rendered for any open popover that isn't an explicit
         * base-component popover so the popover can never collapse to a bare 1px frame: the
         * header (icon + title + menu) always renders, and the body falls back to a fixed-
         * height "no preview" row when no subject resolves a card Surface (e.g. system-type
         * objects like a raw Feed that have no registered card and no renderable fields). The card is the popover's
         * content, regular-size and edge to edge as the current card popover; it scrolls itself (`dx-card-popover`) and
         * keeps a card's minimum width, but is only as tall as its rows, so a short card leaves no empty space.
         */
        <ObjectCard.Root border={false} classNames={['dx-card-popover dx-card-min-width', roundedClassNames]}>
          <ObjectCard.Header
            subject={popoverSubject}
            menu={
              // TODO(wittjosiah): Reconcile with Card.Menu.
              <Layout.Block rail='end'>
                {popoverSubject !== undefined && <CardSlot.MenuSlot subject={popoverSubject} menu={menu} />}
                <ActionMenu {...menu} disabled={!menuItems?.length} actions={objectMenuItems}>
                  <Button.Root variant='ghost' icon='ph--dots-three-vertical--regular' iconOnly label='Actions' />
                </ActionMenu>
              </Layout.Block>
            }
          >
            {title}
          </ObjectCard.Header>

          {content && 'subject' in content ? (
            /** CardContent must render the Card.Body. */
            <Surface.Surface type={AppSurface.CardContent} data={content} limit={1} fallback={CardFallback} />
          ) : (
            <Card.Body classNames='min-h-8'>
              <Card.Row>
                <Card.Text variant='muted'>{t('popover-no-preview.message')}</Card.Text>
              </Card.Row>
            </Card.Body>
          )}
        </ObjectCard.Root>
      )}
    </Popover.Content>
  );
};

PopoverRoot.displayName = 'PopoverRoot';

PopoverContent.displayName = 'PopoverContent';
