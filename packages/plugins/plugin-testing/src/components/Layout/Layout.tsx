//
// Copyright 2023 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import { RegistryContext } from '@effect/atom-react/RegistryContext';
import React, {
  type ComponentProps,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { Surface, useCapability } from '@dxos/app-framework/ui';
import type * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Next, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { Dnd } from '@dxos/react-ui-dnd';
import { descriptionMessage, mx } from '@dxos/ui-theme';

import { meta } from '#meta';
import { StorybookCapabilities } from '#types';

const debounce_delay = 100;

type FocusOutsideEvent = Parameters<NonNullable<ComponentProps<typeof Next.Popover.Root>['onFocusOutside']>>[0];

const StoryToast = ({ toast, onDismiss }: { toast: LayoutOperation.Toast; onDismiss: (id: string) => void }) => {
  const { t } = useTranslation(meta.profile.key);
  return (
    <Next.Toast.Root
      data-testid={toast.id}
      defaultOpen
      duration={toast.duration}
      onOpenChange={(open) => {
        if (!open) {
          onDismiss(toast.id);
        }
      }}
    >
      <Next.Toast.Header icon={toast.icon} closable={!!toast.closeLabel}>
        {toast.title && toLocalizedString(toast.title, t)}
      </Next.Toast.Header>
      {toast.description && <Next.Toast.Description>{toLocalizedString(toast.description, t)}</Next.Toast.Description>}
      {toast.onAction && toast.actionAlt && toast.actionLabel && (
        <Next.Toast.Footer>
          <Next.Toast.ActionTrigger variant='primary' onClick={() => toast.onAction?.()}>
            {toLocalizedString(toast.actionLabel, t)}
          </Next.Toast.ActionTrigger>
        </Next.Toast.Footer>
      )}
    </Next.Toast.Root>
  );
};

export const Layout = ({ children }: PropsWithChildren<{}>) => {
  const { t } = useTranslation(meta.profile.key);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const registry = useContext(RegistryContext);
  const stateAtom = useCapability(StorybookCapabilities.LayoutState);
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

  const handleFocusOutside = useCallback(
    (event: FocusOutsideEvent) => {
      // TODO(thure): CodeMirror should not focus itself when it updates.
      const target = event.detail.originalEvent.target;
      if (target instanceof HTMLElement && target.classList.contains('cm-content')) {
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

  const DialogRoot = layout.dialogType === 'alert' ? Next.AlertDialog.Root : Next.Dialog.Root;

  return (
    <Next.Toast.Provider>
      {/* The plugin `ReactContext` capabilities — the theme plugin's `Tooltip.Provider` among them —
          wrap `children` only, so the dialog and popover portals rendered as its siblings below sit
          outside them. Any `IconButton` there renders a `Tooltip.Trigger`, which throws rather than
          degrades when it finds no provider, taking the whole surface down with it. */}
      <div className='fixed inset-0 flex overflow-hidden'>
        <Dnd.Root>
          <Next.Popover.Root
            open={open}
            positioning={{ ...Next.virtualAnchor(trigger), placement: layout.popoverSide, hideWhenDetached: true }}
            autoFocus={false}
            onFocusOutside={handleFocusOutside}
            onPointerDownOutside={handleClose}
            onEscapeKeyDown={handleClose}
          >
            <Next.Main.Root
              navigationSidebarState={layout.sidebarState}
              complementarySidebarState={layout.complementarySidebarState}
              onNavigationSidebarStateChange={(next) => updateState({ sidebarState: next })}
              onComplementarySidebarStateChange={(next) => updateState({ complementarySidebarState: next })}
            >
              {children}
            </Next.Main.Root>

            <DialogRoot
              modal={layout.dialogBlockAlign !== 'end'}
              open={layout.dialogOpen}
              onOpenChange={({ open: nextOpen }) => updateState({ dialogOpen: nextOpen })}
            >
              {/* The dialog surface renders its own Content, which carries the placement and scrim. */}
              <Surface.Surface
                type={AppSurface.Dialog}
                data={layout.dialogContent}
                limit={1}
                fallback={ErrorFallback}
                placeholder={<div />}
              />
            </DialogRoot>

            <Next.Popover.Content>
              <Next.Popover.Body>
                {/* `border={false}`: the popover content already draws the surface and its border,
                        so a bordered card inside it reads as a second frame. Matches the deck's popover. */}
                {layout.popoverKind === 'card' && (
                  <Next.Card.Root border={false} classNames='dx-card-popover rounded-md'>
                    <Next.Card.Header>
                      {/* Disabled drag handle keeps the toolbar slot layout consistent with regular cards. */}
                      <Next.DragHandle />
                      {layout.popoverTitle ? (
                        <Next.Card.Title>{toLocalizedString(layout.popoverTitle, t)}</Next.Card.Title>
                      ) : (
                        <span />
                      )}
                      <Next.Card.Action system='close' onClick={handleClose} />
                    </Next.Card.Header>
                    {layout.popoverContent ? (
                      <Surface.Surface type={AppSurface.CardContent} data={layout.popoverContent} limit={1} />
                    ) : (
                      // Matches the deck's popover, which opens a card with no subject for a link that did not resolve.
                      <Next.Card.Body classNames='min-h-8'>
                        <Next.Card.Row>
                          <Next.Card.Text variant='description'>No preview available.</Next.Card.Text>
                        </Next.Card.Row>
                      </Next.Card.Body>
                    )}
                  </Next.Card.Root>
                )}
                {(layout.popoverKind === 'base' || layout.popoverKind === 'rename') && (
                  <Surface.Surface type={AppSurface.Popover} data={layout.popoverContent} limit={1} />
                )}
              </Next.Popover.Body>
            </Next.Popover.Content>
          </Next.Popover.Root>
        </Dnd.Root>
        {layout.toasts.map((toast) => (
          <StoryToast key={toast.id} toast={toast} onDismiss={handleDismissToast} />
        ))}
        <Next.Toast.Toaster />
      </div>
    </Next.Toast.Provider>
  );
};

export const ErrorFallback = ({ error }: { error?: Error }) => {
  const { t } = useTranslation(meta.profile.key);
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
