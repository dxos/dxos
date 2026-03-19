//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import React, { type PropsWithChildren, useCallback, useEffect, useRef, useState } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { useObjectMenuItems } from '@dxos/app-toolkit/ui';
import { Annotation, Obj } from '@dxos/echo';
import {
  Card,
  Popover,
  type PopoverContentInteractOutsideEvent,
  toLocalizedString,
  Toolbar,
  useTranslation,
} from '@dxos/react-ui';
import { Menu } from '@dxos/react-ui-menu';

import { useDeckState } from '../../hooks';
import { meta } from '../../meta';

export type DeckPopoverRootProps = PropsWithChildren<{}>;

const DEBOUNCE_DELAY = 40;

type DeckPopoverContextValue = {
  setOpen: (open: boolean) => void;
};

const [DeckPopoverProvider, useDeckPopoverContext] = createContext<DeckPopoverContextValue>('DeckPopover');

export const PopoverRoot = ({ children }: DeckPopoverRootProps) => {
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

  return (
    <DeckPopoverProvider setOpen={setOpen}>
      <Popover.Root modal={false} open={open}>
        {state.popoverAnchor && <Popover.VirtualTrigger key={virtualIter} virtualRef={virtualRef} />}
        {children}
      </Popover.Root>
    </DeckPopoverProvider>
  );
};

export const PopoverContent = () => {
  const { t } = useTranslation(meta.id);
  const { state, updateEphemeral } = useDeckState();
  const { setOpen } = useDeckPopoverContext('PopoverContent');
  const popoverSubject = state.popoverContent?.subject;
  const isObjectPopover = Obj.isObject(popoverSubject);
  const objectMenuItems = useObjectMenuItems(popoverSubject);
  const title = state.popoverTitle ? toLocalizedString(state.popoverTitle, t) : 'Unknown';
  const icon = isObjectPopover
    ? Function.pipe(
        Obj.getSchema(popoverSubject),
        Option.fromNullable,
        Option.flatMap(Annotation.IconAnnotation.get),
        Option.map(({ icon }) => icon),
        Option.getOrElse(() => 'ph--placeholder--regular'),
      )
    : undefined;

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
      if (
        // TODO(thure): CodeMirror should not focus itself when it updates.
        event.type === 'dismissableLayer.focusOutside' &&
        (event.currentTarget as HTMLElement | undefined)?.classList.contains('cm-content')
      ) {
        event.preventDefault();
      } else {
        handleClose();
      }
    },
    [handleClose],
  );

  return (
    <Popover.Portal>
      <Popover.Content
        side={state.popoverSide}
        sticky='always'
        hideWhenDetached
        onInteractOutside={handleInteractOutside}
        onEscapeKeyDown={handleInteractOutside}
      >
        <Popover.Viewport>
          {/* TODO(burdon): Set/disable column context. */}
          {state.popoverKind === 'base' && <Surface.Surface role='popover' data={state.popoverContent} limit={1} />}
          {state.popoverKind === 'card' && (
            <Menu.Root>
              <Card.Root border={false} classNames='dx-card-popover'>
                <Card.Toolbar>
                  <Card.IconBlock padding>{icon && <Card.Icon icon={icon} />}</Card.IconBlock>
                  <Card.Title>{title}</Card.Title>
                  {/* TODO(wittjosiah): Reconcile with Card.Menu. */}
                  <Card.IconBlock padding>
                    <Menu.Trigger asChild disabled={!objectMenuItems.length}>
                      <Toolbar.IconButton
                        variant='ghost'
                        icon='ph--dots-three-vertical--regular'
                        iconOnly
                        label='Actions'
                      />
                    </Menu.Trigger>
                    <Menu.Content items={objectMenuItems} />
                  </Card.IconBlock>
                </Card.Toolbar>
                <Surface.Surface role='card--content' data={state.popoverContent} limit={1} />
              </Card.Root>
            </Menu.Root>
          )}
        </Popover.Viewport>
        <Popover.Arrow />
      </Popover.Content>
    </Popover.Portal>
  );
};
