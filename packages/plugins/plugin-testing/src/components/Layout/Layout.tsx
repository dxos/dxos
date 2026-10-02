//
// Copyright 2023 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import { RegistryContext } from '@effect/atom-react/RegistryContext';
import React, { type PropsWithChildren, useCallback, useContext, useEffect, useRef, useState } from 'react';

import * as AppHooks from '@dxos/app-framework/Hooks';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import type * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { Dnd } from '@dxos/react-ui-dnd';
import * as AlertDialog from '@dxos/react-ui/AlertDialog';
import * as Button from '@dxos/react-ui/Button';
import * as Card from '@dxos/react-ui/Card';
import * as Dialog from '@dxos/react-ui/Dialog';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Main from '@dxos/react-ui/Main';
import * as Popover from '@dxos/react-ui/Popover';
import * as ThemeProvider from '@dxos/react-ui/ThemeProvider';
import * as Toast from '@dxos/react-ui/Toast';
import * as Tooltip from '@dxos/react-ui/Tooltip';
import { descriptionMessage, mx } from '@dxos/ui-theme';

import { meta } from '#meta';
import { StorybookCapabilities } from '#types';

const debounce_delay = 100;

const StoryToast = ({ toast, onDismiss }: { toast: LayoutOperation.Toast; onDismiss: (id: string) => void }) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  return (
    <Toast.Root
      data-testid={toast.id}
      defaultOpen
      duration={toast.duration}
      onOpenChange={(open) => {
        if (!open) {
          onDismiss(toast.id);
        }
      }}
    >
      <Toast.Title icon={toast.icon} onClose={toast.closeLabel ? () => onDismiss(toast.id) : undefined}>
        {toast.title && <span>{ThemeProvider.toLocalizedString(toast.title, t)}</span>}
      </Toast.Title>
      {toast.description && (
        <Toast.Description>{ThemeProvider.toLocalizedString(toast.description, t)}</Toast.Description>
      )}
      {toast.onAction && toast.actionAlt && toast.actionLabel && (
        <Toast.Actions>
          <Toast.Action altText={ThemeProvider.toLocalizedString(toast.actionAlt, t)} asChild>
            <Button.Root variant='primary' onClick={() => toast.onAction?.()}>
              {ThemeProvider.toLocalizedString(toast.actionLabel, t)}
            </Button.Root>
          </Toast.Action>
        </Toast.Actions>
      )}
    </Toast.Root>
  );
};

export const Layout = ({ children }: PropsWithChildren<{}>) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const registry = useContext(RegistryContext);
  const stateAtom = AppHooks.useCapability(StorybookCapabilities.LayoutState);
  const layout = useAtomValue(stateAtom);
  const [iter, setIter] = useState(0);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const updateState = useCallback(
    (updates: Partial<StorybookCapabilities.LayoutStateProps>) => {
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
    (event: KeyboardEvent | Popover.ContentInteractOutsideEvent) => {
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

  const handleDismissToast = useCallback(
    (id: string) => {
      updateState({ toasts: layout.toasts.filter((toast) => toast.id !== id) });
    },
    [updateState, layout.toasts],
  );

  const DialogRoot = layout.dialogType === 'alert' ? AlertDialog.Root : Dialog.Root;
  const DialogOverlay = layout.dialogType === 'alert' ? AlertDialog.Overlay : Dialog.Overlay;

  return (
    <Toast.Provider>
      {/* The plugin `ReactContext` capabilities — the theme plugin's `Tooltip.Provider` among them —
          wrap `children` only, so the dialog and popover portals rendered as its siblings below sit
          outside them. Any `IconButton` there renders a `Tooltip.Trigger`, which throws rather than
          degrades when it finds no provider, taking the whole surface down with it. */}
      <Tooltip.Provider>
        <div className='fixed inset-0 flex overflow-hidden'>
          <Dnd.Root>
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
                  <Surface.Root.Surface
                    type={AppSurface.Dialog}
                    data={layout.dialogContent}
                    limit={1}
                    fallback={ErrorFallback}
                    placeholder={<div />}
                  />
                ) : (
                  <DialogOverlay
                    blockAlign={layout.dialogBlockAlign}
                    classNames={layout.dialogOverlayClasses}
                    style={layout.dialogOverlayStyle}
                  >
                    <Surface.Root.Surface
                      type={AppSurface.Dialog}
                      data={layout.dialogContent}
                      limit={1}
                      fallback={ErrorFallback}
                    />
                  </DialogOverlay>
                )}
              </DialogRoot>

              <Popover.VirtualTrigger key={iter} virtualRef={trigger} />
              <Popover.Portal>
                <Popover.Content
                  side={layout.popoverSide}
                  onOpenAutoFocus={(event) => event.preventDefault()}
                  onInteractOutside={handleInteractOutside}
                  onEscapeKeyDown={handleInteractOutside}
                  hideWhenDetached
                >
                  <Popover.Viewport>
                    {/* `border={false}`: the popover content already draws the surface and its border,
                        so a bordered card inside it reads as a second frame. Matches the deck's popover. */}
                    {layout.popoverKind === 'card' && (
                      <Card.Root border={false} classNames='dx-card-popover rounded-md'>
                        <Card.Header>
                          {/* Disabled drag handle keeps the toolbar slot layout consistent with regular cards. */}
                          <Card.DragHandle />
                          {layout.popoverTitle ? (
                            <Card.Title>{ThemeProvider.toLocalizedString(layout.popoverTitle, t)}</Card.Title>
                          ) : (
                            <span />
                          )}
                          <Card.ActionIconButton action='close' onClick={handleClose} />
                        </Card.Header>
                        {layout.popoverContent ? (
                          <Surface.Root.Surface type={AppSurface.CardContent} data={layout.popoverContent} limit={1} />
                        ) : (
                          // Matches the deck's popover, which opens a card with no subject for a link that did not resolve.
                          <Card.Body classNames='min-h-8'>
                            <Card.Row>
                              <Card.Text variant='description'>No preview available.</Card.Text>
                            </Card.Row>
                          </Card.Body>
                        )}
                      </Card.Root>
                    )}
                    {(layout.popoverKind === 'base' || layout.popoverKind === 'rename') && (
                      <Surface.Root.Surface type={AppSurface.Popover} data={layout.popoverContent} limit={1} />
                    )}
                  </Popover.Viewport>
                  <Popover.Arrow />
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
          </Dnd.Root>
          {layout.toasts.map((toast) => (
            <StoryToast key={toast.id} toast={toast} onDismiss={handleDismissToast} />
          ))}
          <Toast.Viewport />
        </div>
      </Tooltip.Provider>
    </Toast.Provider>
  );
};

export const ErrorFallback = ({ error }: { error?: Error }) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const errorString = error?.toString() ?? '';
  return (
    <div
      role='alert'
      data-testid='error-boundary-fallback'
      className={mx('overflow-auto p-8 dx-attention-surface grid place-items-center')}
    >
      <p className={mx(descriptionMessage, 'break-words rounded-md p-8', errorString.length < 256 && 'text-lg')}>
        {error ? errorString : t('error-fallback.message')}
      </p>
    </div>
  );
};
