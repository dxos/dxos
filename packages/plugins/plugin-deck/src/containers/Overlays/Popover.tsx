//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren, useCallback, useEffect, useRef, useState } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface, CardIconSlot, useObjectMenuItems } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import {
  Card,
  Icon,
  IconButton,
  Popover,
  type PopoverContentInteractOutsideEvent,
  toLocalizedString,
  useMediaQuery,
  useTranslation,
} from '@dxos/react-ui';
import { Attention } from '@dxos/react-ui-attention';
import { Menu } from '@dxos/react-ui-menu';
import { getStyles } from '@dxos/ui-theme';

import { useDeckState } from '#hooks';
import { meta } from '#meta';

const DEBOUNCE_DELAY = 40;

type DeckPopoverContextValue = {
  setOpen: (open: boolean) => void;
};

const [DeckPopoverProvider, useDeckPopoverContext] = createContext<DeckPopoverContextValue>('DeckPopover');

export type PopoverRootProps = PropsWithChildren;

export const PopoverRoot = ({ children }: PopoverRootProps) => {
  const { state } = useDeckState();
  const virtualRef = useRef<HTMLButtonElement | null>(null);
  const [virtualIter, setVirtualIter] = useState(0);
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
      if (state.popoverAnchor && virtualRef.current !== state.popoverAnchor) {
        virtualRef.current = state.popoverAnchor ?? null;
        setVirtualIter((iter) => iter + 1);
      }
      debounceRef.current = setTimeout(() => setOpen(true), DEBOUNCE_DELAY);
    }
  }, [state.popoverOpen, state.popoverAnchorId, state.popoverAnchor, state.popoverContent]);

  // The rename popover is modal so other navtree item menus are inert while it is open.
  const modal = state.popoverKind === 'rename';

  return (
    <DeckPopoverProvider setOpen={setOpen}>
      <Popover.Root modal={modal} open={open}>
        {state.popoverAnchor && <Popover.VirtualTrigger key={virtualIter} virtualRef={virtualRef} />}
        {children}
      </Popover.Root>
    </DeckPopoverProvider>
  );
};

export const PopoverContent = () => {
  const { t } = useTranslation(meta.profile.key);
  const { state, updateEphemeral } = useDeckState();
  const { setOpen } = useDeckPopoverContext('PopoverContent');
  const popoverSubject =
    state.popoverContent && 'subject' in state.popoverContent ? state.popoverContent.subject : undefined;
  const isObjectPopover = Obj.isObject(popoverSubject);
  // The popover is portaled; resolve the origin plank from the anchor element it was opened from.
  const pivotId =
    state.popoverAnchor instanceof Element ? Attention.getRootAttendableId(state.popoverAnchor) : undefined;
  const objectMenuItems = useObjectMenuItems(popoverSubject, pivotId);
  const title = state.popoverTitle ? toLocalizedString(state.popoverTitle, t) : 'Unknown';
  const iconAnnotation = isObjectPopover ? Obj.getIcon(popoverSubject) : undefined;
  const icon = isObjectPopover ? (iconAnnotation?.icon ?? 'ph--circle-dashed--regular') : undefined;
  // Same hue treatment as the masonry ObjectTile, so the card depicts the type consistently.
  const iconStyles = iconAnnotation?.hue ? getStyles(iconAnnotation.hue) : undefined;
  const content = state.popoverContent;
  // Base and rename popovers render a plugin-provided component; everything else falls through to the card.
  const isComponentPopover =
    (state.popoverKind === 'base' || state.popoverKind === 'rename') && !!content && 'component' in content;
  const isRename = state.popoverKind === 'rename';

  // Anchor to the right of the row on wide displays; drop centered below on narrow ones.
  const [isLg] = useMediaQuery('lg', { fallback: [true] });
  const side = isRename ? (isLg ? 'right' : 'bottom') : state.popoverSide;

  const handleClose = useCallback(() => {
    setOpen(false);
    updateEphemeral((state) => ({
      ...state,
      popoverOpen: false,
      popoverAnchor: undefined,
      popoverAnchorId: undefined,
      popoverSide: undefined,
    }));
  }, [updateEphemeral]);

  const handleInteractOutside = useCallback(
    (event: KeyboardEvent | PopoverContentInteractOutsideEvent) => {
      // Focus leaving the popover (clicking into the card surfaces a portaled menu, or CodeMirror
      // re-focusing itself) must not dismiss it — only a pointer-down genuinely outside the card, or
      // Escape, closes. (Clicks inside the card never reach here; Radix scopes them to the content.)
      if (event.type === 'dismissableLayer.focusOutside') {
        event.preventDefault();
        return;
      }
      // A pointer-down inside a PORTALED layer spawned from the card (its ⋮ menu, a select) is not
      // "outside" either — Radix's own nested-layer coordination cannot be relied on here because
      // the workspace resolves several copies of react-dismissable-layer (vendored popover + menu
      // forks), whose module-level layer registries are disjoint.
      if ('detail' in event && typeof event.detail === 'object' && event.detail !== null) {
        const target = event.detail.originalEvent.target;
        if (
          target instanceof Element &&
          target.closest('[data-radix-popper-content-wrapper], [data-radix-menu-content]')
        ) {
          event.preventDefault();
          return;
        }
      }
      handleClose();
    },
    [handleClose],
  );

  const roundedClassNames = 'rounded-md';

  return (
    <Popover.Portal>
      <Popover.Content
        side={side}
        sticky='always'
        hideWhenDetached
        onOpenAutoFocus={isRename ? undefined : (event) => event.preventDefault()}
        onInteractOutside={handleInteractOutside}
        onEscapeKeyDown={handleInteractOutside}
        classNames={[
          roundedClassNames,
          !isRename && [
            'origin-(--radix-popover-content-transform-origin)',
            'data-[state=open]:animate-popover-in',
            'data-[state=closed]:animate-popover-out',
          ],
        ]}
      >
        <Popover.Viewport>
          {isComponentPopover && content && 'component' in content ? (
            /*
             * Base popover: a plugin-provided component (e.g., editor link preview).
             */
            <Surface.Surface type={AppSurface.Popover} data={content} limit={1} />
          ) : (
            /*
             * Card popover (default). Rendered for any open popover that isn't an explicit
             * base-component popover so the popover can never collapse to a bare 1px frame: the
             * header (icon + title + menu) always renders, and the body falls back to a fixed-
             * height "no preview" row when no subject resolves a card Surface (e.g. system-type
             * objects like a raw Feed that have no registered card and no renderable fields).
             */
            <Menu.Root>
              <Card.Root border={false} classNames={['dx-card-popover', roundedClassNames]}>
                <Card.Header>
                  <Card.Block>
                    <CardIconSlot subject={popoverSubject}>
                      {icon && <Icon icon={icon} classNames={iconStyles?.text} />}
                    </CardIconSlot>
                  </Card.Block>
                  <Card.Title>{title}</Card.Title>
                  {/* TODO(wittjosiah): Reconcile with Card.Menu. */}
                  <Card.Block end>
                    <Menu.Trigger asChild disabled={!objectMenuItems.length}>
                      <IconButton
                        variant='ghost'
                        density='sm'
                        icon='ph--dots-three-vertical--regular'
                        iconOnly
                        label='Actions'
                      />
                    </Menu.Trigger>
                    <Menu.Content items={objectMenuItems} />
                  </Card.Block>
                </Card.Header>

                {content && 'subject' in content ? (
                  /** CardContent must render the Card.Body. */
                  <Surface.Surface type={AppSurface.CardContent} data={content} limit={1} />
                ) : (
                  <Card.Body classNames='min-h-8'>
                    <Card.Row>
                      <Card.Text variant='description'>{t('popover-no-preview.message')}</Card.Text>
                    </Card.Row>
                  </Card.Body>
                )}
              </Card.Root>
            </Menu.Root>
          )}
        </Popover.Viewport>
        <Popover.Arrow />
      </Popover.Content>
    </Popover.Portal>
  );
};

PopoverRoot.displayName = 'PopoverRoot';

PopoverContent.displayName = 'PopoverContent';
