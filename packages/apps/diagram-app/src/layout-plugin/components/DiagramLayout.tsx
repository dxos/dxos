//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import type * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as AlertDialog from '@dxos/react-ui/AlertDialog';
import * as Dialog from '@dxos/react-ui/Dialog';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Popover from '@dxos/react-ui/Popover';
import * as Theme from '@dxos/react-ui/Theme';
import * as Toast from '@dxos/react-ui/Toast';
import * as VirtualAnchor from '@dxos/react-ui/VirtualAnchor';

import { dismissJoinOnLiveDialog } from '../../shared/index.ts';
import { LayoutState } from '../DiagramAppCapabilities.ts';

// A popover opens a beat after it is asked for, once its anchor has rendered.
const POPOVER_DELAY = 40;

const LayoutToast = ({ toast, onDismiss }: { toast: LayoutOperation.Toast; onDismiss: (id: string) => void }) => {
  const { t } = UiHooks.useTranslation();
  return (
    <Toast.Root
      defaultOpen
      duration={toast.duration}
      data-testid={toast.id}
      onOpenChange={(open) => !open && onDismiss(toast.id)}
    >
      <Toast.Header icon={toast.icon} closable={!!toast.closeLabel}>
        {toast.title && Theme.toLocalizedString(toast.title, t)}
      </Toast.Header>
      {toast.description && <Toast.Description>{Theme.toLocalizedString(toast.description, t)}</Toast.Description>}
      {toast.onAction && toast.actionLabel && (
        <Toast.Footer>
          <Toast.ActionTrigger variant='primary' onClick={() => toast.onAction?.()}>
            {Theme.toLocalizedString(toast.actionLabel, t)}
          </Toast.ActionTrigger>
        </Toast.Footer>
      )}
    </Toast.Root>
  );
};

/** Composer's dialog and popover surfaces and the toasts, over the canvas, as the layout state asks for them. */
export const DiagramLayout = ({ children }: PropsWithChildren) => {
  const [layout, update] = Hooks.useAtomCapabilityState(LayoutState);
  const anchorRef = useRef<Element | null>(null);
  anchorRef.current = layout.popoverAnchor?.anchor ?? null;
  const [popoverOpen, setPopoverOpen] = useState(false);

  useEffect(() => {
    setPopoverOpen(false);
    if (!layout.popoverOpen) {
      return;
    }
    const timeout = setTimeout(() => setPopoverOpen(true), POPOVER_DELAY);
    return () => clearTimeout(timeout);
  }, [layout.popoverOpen, layout.popoverAnchor, layout.popoverContent]);

  // A live dialog replaces the still copy of the join dialog.
  useLayoutEffect(() => (layout.dialogOpen ? dismissJoinOnLiveDialog() : undefined), [layout.dialogOpen]);

  const handlePopoverChange = useCallback(
    ({ open }: { open: boolean }) =>
      !open && update((state) => ({ ...state, popoverOpen: false, popoverAnchor: undefined })),
    [update],
  );

  // Only a dismissal reaches here; an operation that closes the dialog writes the state itself.
  const handleDialogChange = useCallback(
    ({ open }: { open: boolean }) =>
      !open && update((state) => ({ ...state, dialogOpen: false, dialogDismissals: state.dialogDismissals + 1 })),
    [update],
  );

  // A popover's focus may move into a menu it spawns, so only a press outside it or Escape closes it.
  const handleFocusOutside = useCallback((event: Event) => event.preventDefault(), []);

  const handleDismissToast = useCallback(
    (id: string) => update((state) => ({ ...state, toasts: state.toasts.filter((toast) => toast.id !== id) })),
    [update],
  );

  const rename = layout.popoverKind === 'rename';
  const DialogRoot = layout.dialogType === 'alert' ? AlertDialog.Root : Dialog.Root;

  return (
    <Toast.Provider>
      <Popover.Root
        open={popoverOpen}
        // As in Composer, a rename popover is modal and takes focus.
        modal={rename}
        autoFocus={rename}
        positioning={{
          ...(layout.popoverAnchor?.anchor ? VirtualAnchor.virtualAnchor(anchorRef) : {}),
          placement: layout.popoverSide ?? 'bottom',
          hideWhenDetached: true,
        }}
        onFocusOutside={handleFocusOutside}
        onOpenChange={handlePopoverChange}
      >
        {children}
        <Popover.Content
          size='md'
          classNames={['rounded-sm', rename && 'w-[22rem] p-0']}
          data-testid='diagram-app.popover'
        >
          <Popover.Body>
            <Surface.Surface type={AppSurface.Popover} data={layout.popoverContent} limit={1} />
          </Popover.Body>
        </Popover.Content>
      </Popover.Root>

      <DialogRoot open={layout.dialogOpen} onOpenChange={handleDialogChange}>
        {/* The dialog surface renders its own Content. */}
        <Surface.Surface type={AppSurface.Dialog} data={layout.dialogContent} limit={1} />
      </DialogRoot>

      {layout.toasts.map((toast) => (
        <LayoutToast key={toast.id} toast={toast} onDismiss={handleDismissToast} />
      ))}
      <Toast.Toaster />
    </Toast.Provider>
  );
};

/** The id a part passes as `caller` to anchor a popover on the diagram menu's button. */
export const DIAGRAM_MENU_ANCHOR = 'diagram-app.diagram-menu';

/** The id a part passes as `caller` to anchor a popover on the space menu's button. */
export const SPACE_MENU_ANCHOR = 'diagram-app.space-menu';
