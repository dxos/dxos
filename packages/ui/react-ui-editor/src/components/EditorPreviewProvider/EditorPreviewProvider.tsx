//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren, type RefObject, useCallback, useEffect, useRef, useState } from 'react';

import { addEventListener } from '@dxos/async';
import { DX_ANCHOR_ACTIVATE, type DxAnchorActivate, Popover } from '@dxos/react-ui';

import { type PreviewLinkRef, type PreviewLinkTarget } from '../../extensions';

type EditorPreviewPopoverValue = Partial<{
  link: PreviewLinkRef;
  target: PreviewLinkTarget;
  pending: boolean;
}>;

const [EditorPreviewContextProvider, useEditorPreview] = createContext<EditorPreviewPopoverValue>('PreviewPopover', {});

export type EditorPreviewProviderProps = PropsWithChildren<{
  onLookup?: (link: PreviewLinkRef) => Promise<PreviewLinkTarget | null | undefined>;
}>;

/**
 * NOTE: In Composer, the DeckPlugin provides the Popover.Root as part of the DeckLayout.
 */
// TOOD(burdon): Reconcile with PreviewPlugin.
export const EditorPreviewProvider = ({ children, onLookup }: EditorPreviewProviderProps) => {
  const triggerRef = useRef<HTMLElement | null>(null);
  const [value, setValue] = useState<EditorPreviewPopoverValue>({});
  const [open, setOpen] = useState(false);

  const handleActivate = useCallback(
    (event: DxAnchorActivate) => {
      const { refId, label, trigger: dxTrigger } = event;
      setValue((value) => ({
        ...value,
        link: { label, ref: refId },
        pending: true,
      }));

      triggerRef.current = dxTrigger;
      queueMicrotask(() => setOpen(true));
      void onLookup?.({ label, ref: refId }).then((target) =>
        setValue((value) => ({
          ...value,
          target: target ?? undefined,
          pending: false,
        })),
      );
    },
    [onLookup],
  );

  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!root || !handleActivate) {
      return;
    }

    return addEventListener(root, DX_ANCHOR_ACTIVATE as any, handleActivate, {
      capture: true,
      passive: false,
    });
  }, [root, handleActivate]);

  return (
    <EditorPreviewContextProvider pending={value.pending} link={value.link} target={value.target}>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.VirtualTrigger virtualRef={triggerRef as unknown as RefObject<HTMLButtonElement>} />

        {/* Content */}
        <div ref={setRoot} role='none' className='contents'>
          {children}
        </div>
      </Popover.Root>
    </EditorPreviewContextProvider>
  );
};

export { useEditorPreview };
