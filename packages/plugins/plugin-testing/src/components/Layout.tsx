//
// Copyright 2023 DXOS.org
//

import React, { type PropsWithChildren, useCallback, useEffect, useRef, useState } from 'react';

import { Surface, useCapability } from '@dxos/app-framework/react';
import {
  AlertDialog,
  Dialog,
  Main,
  Popover,
  type PopoverContentInteractOutsideEvent,
  useTranslation,
} from '@dxos/react-ui';
import { descriptionMessage, mx } from '@dxos/ui-theme';

import { meta } from '../meta';
import { LayoutState } from '../types';

const debounce_delay = 100;

// TODO(wittjosiah): Support dialogs, tooltips, maybe toast.
export const Layout = ({ children }: PropsWithChildren<{}>) => {
  const trigger = useRef<HTMLButtonElement | null>(null);
  const layout = useCapability(LayoutState);
  const [iter, setIter] = useState(0);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

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

  const handleInteractOutside = useCallback((event: KeyboardEvent | PopoverContentInteractOutsideEvent) => {
    if (
      // TODO(thure): CodeMirror should not focus itself when it updates.
      event.type === 'dismissableLayer.focusOutside' &&
      (event.currentTarget as HTMLElement | undefined)?.classList.contains('cm-content')
    ) {
      event.preventDefault();
    } else {
      setOpen(false);
      layout.popoverOpen = false;
      layout.popoverAnchor = undefined;
      layout.popoverAnchorId = undefined;
      layout.popoverSide = undefined;
    }
  }, []);

  const DialogRoot = layout.dialogType === 'alert' ? AlertDialog.Root : Dialog.Root;
  const DialogOverlay = layout.dialogType === 'alert' ? AlertDialog.Overlay : Dialog.Overlay;

  return (
    <div role='none' className='fixed inset-0 flex overflow-hidden'>
      <Popover.Root open={open}>
        <Main.Root
          navigationSidebarState={layout.sidebarState}
          complementarySidebarState={layout.complementarySidebarState}
          onNavigationSidebarStateChange={(next) => (layout.sidebarState = next)}
          onComplementarySidebarStateChange={(next) => (layout.complementarySidebarState = next)}
        >
          {children}
        </Main.Root>

        <DialogRoot
          modal={layout.dialogBlockAlign !== 'end'}
          open={layout.dialogOpen}
          onOpenChange={(nextOpen) => (layout.dialogOpen = nextOpen)}
        >
          {layout.dialogBlockAlign === 'end' ? (
            <Surface
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
              <Surface role='dialog' data={layout.dialogContent} limit={1} fallback={ContentError} />
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
              <Surface role='card--popover' data={layout.popoverContent} limit={1} />
            </Popover.Viewport>
            <Popover.Arrow />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
};

export const ContentError = ({ error }: { error?: Error }) => {
  const { t } = useTranslation(meta.id);
  const errorString = error?.toString() ?? '';
  return (
    <div role='none' className='overflow-auto p-8 attention-surface grid place-items-center'>
      <p
        role='alert'
        className={mx(descriptionMessage, 'break-words rounded-md p-8', errorString.length < 256 && 'text-lg')}
      >
        {error ? errorString : t('error fallback message')}
      </p>
    </div>
  );
};
