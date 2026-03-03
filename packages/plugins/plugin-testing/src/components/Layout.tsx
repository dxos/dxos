//
// Copyright 2023 DXOS.org
//

import { RegistryContext, useAtomValue } from '@effect-atom/atom-react';
import React, { type PropsWithChildren, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { Surface, useCapability } from '@dxos/app-framework/ui';
import {
  AlertDialog,
  Dialog,
  Main,
  Popover,
  type PopoverContentInteractOutsideEvent,
  toLocalizedString,
  useTranslation,
} from '@dxos/react-ui';
import { Card, Mosaic } from '@dxos/react-ui-mosaic';
import { descriptionMessage, mx } from '@dxos/ui-theme';

import { meta } from '../meta';
import { LayoutState, type LayoutStateProps } from '../types';

const debounce_delay = 100;

// TODO(wittjosiah): Support dialogs, tooltips, maybe toast.
export const Layout = ({ children }: PropsWithChildren<{}>) => {
  const { t } = useTranslation(meta.id);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const registry = useContext(RegistryContext);
  const stateAtom = useCapability(LayoutState);
  const layout = useAtomValue(stateAtom);
  const [iter, setIter] = useState(0);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const updateState = useCallback(
    (updates: Partial<LayoutStateProps>) => {
      const current = registry.get(stateAtom);
      registry.set(stateAtom, { ...current, ...updates });
    },
    [registry, stateAtom],
  );

  useEffect(() => {
    setOpen(false);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    trigger.current = layout.popoverAnchor ?? null;
    setIter((iter) => iter + 1);
    if (layout.popoverOpen) {
      debounceRef.current = setTimeout(() => setOpen(true), debounce_delay);
    }
  }, [layout.popoverAnchor, layout.popoverContent, layout.popoverOpen]);

  const handleClose = useCallback(() => {
    setOpen(false);
    updateState({
      popoverOpen: false,
      popoverAnchor: undefined,
      popoverAnchorId: undefined,
      popoverSide: undefined,
    });
  }, [updateState]);

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

  const DialogRoot = layout.dialogType === 'alert' ? AlertDialog.Root : Dialog.Root;
  const DialogOverlay = layout.dialogType === 'alert' ? AlertDialog.Overlay : Dialog.Overlay;

  return (
    <div role='none' className='fixed inset-0 flex overflow-hidden'>
      <Mosaic.Root>
        <Popover.Root open={open}>
          <Main.Root
            navigationSidebarState={layout.sidebarState}
            complementarySidebarState={layout.complementarySidebarState}
            onNavigationSidebarStateChange={(next) => updateState({ sidebarState: next })}
            onComplementarySidebarStateChange={(next) => updateState({ complementarySidebarState: next })}
          >
            {children}
          </Main.Root>

          <DialogRoot
            modal={layout.dialogBlockAlign !== 'end'}
            open={layout.dialogOpen}
            onOpenChange={(nextOpen) => updateState({ dialogOpen: nextOpen })}
          >
            {layout.dialogBlockAlign === 'end' ? (
              <Surface.Surface
                role='dialog'
                data={layout.dialogContent}
                limit={1}
                fallback={ContentError}
                placeholder={<div />}
              />
            ) : (
              <DialogOverlay
                blockAlign={layout.dialogBlockAlign}
                classNames={layout.dialogOverlayClasses}
                style={layout.dialogOverlayStyle}
              >
                <Surface.Surface role='dialog' data={layout.dialogContent} limit={1} fallback={ContentError} />
              </DialogOverlay>
            )}
          </DialogRoot>

          <Popover.VirtualTrigger key={iter} virtualRef={trigger} />
          <Popover.Portal>
            <Popover.Content
              side={layout.popoverSide}
              onInteractOutside={handleInteractOutside}
              onEscapeKeyDown={handleInteractOutside}
              sticky='always'
              hideWhenDetached
            >
              <Popover.Viewport>
                {layout.popoverKind === 'card' && (
                  <Card.Root>
                    <Card.Toolbar>
                      {/* TODO(wittjosiah): Cleaner way to handle no drag handle in toolbar? */}
                      <span />
                      {layout.popoverTitle ? (
                        <Card.Title>{toLocalizedString(layout.popoverTitle, t)}</Card.Title>
                      ) : (
                        <span />
                      )}
                      <Card.Close onClick={handleClose} />
                    </Card.Toolbar>
                    <Surface.Surface role='card--content' data={layout.popoverContent} limit={1} />
                  </Card.Root>
                )}
                {layout.popoverKind === 'base' && (
                  <Surface.Surface role='popover' data={layout.popoverContent} limit={1} />
                )}
              </Popover.Viewport>
              <Popover.Arrow />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </Mosaic.Root>
    </div>
  );
};

export const ContentError = ({ error }: { error?: Error }) => {
  const { t } = useTranslation(meta.id);
  const errorString = error?.toString() ?? '';
  return (
    <div role='none' className='overflow-auto p-8 dx-attention-surface grid place-items-center'>
      <p
        role='alert'
        className={mx(descriptionMessage, 'break-words rounded-md p-8', errorString.length < 256 && 'text-lg')}
      >
        {error ? errorString : t('error fallback message')}
      </p>
    </div>
  );
};
