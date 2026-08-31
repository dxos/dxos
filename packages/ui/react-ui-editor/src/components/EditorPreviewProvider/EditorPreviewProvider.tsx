//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren, type RefObject, useCallback, useEffect, useRef, useState } from 'react';

import { addEventListener } from '@dxos/async';
import { DX_ANCHOR_ACTIVATE, type DxAnchorActivate, Popover } from '@dxos/react-ui';
import { type PreviewLinkRef, type PreviewLinkTarget } from '@dxos/ui-types';

import { EditorPreviewContextProvider, type EditorPreviewPopoverValue } from './EditorPreviewContext';

export type EditorPreviewProviderProps = PropsWithChildren<{
  onLookup?: (link: PreviewLinkRef) => Promise<PreviewLinkTarget | null | undefined>;
}>;

/**
 * Standalone anchor-preview popover for use outside Composer (storybook, tests).
 * In Composer, PreviewPlugin listens on window for DX_ANCHOR_ACTIVATE events and
 * dispatches LayoutOperation.UpdatePopover instead; this provider is not needed there.
 */
export const EditorPreviewProvider = ({ children, onLookup }: EditorPreviewProviderProps) => {
  const triggerRef = useRef<HTMLElement | null>(null);
  const [value, setValue] = useState<EditorPreviewPopoverValue>({});
  const [open, setOpen] = useState(false);

  const handleActivate = useCallback(
    (event: DxAnchorActivate) => {
      // Hover-driven anchors dispatch `state: false` when the pointer leaves the anchor/card.
      if (event.state === false) {
        setOpen(false);
        return;
      }

      const { dxn, label, trigger } = event;
      setValue((value) => ({
        ...value,
        link: { label, dxn },
        pending: true,
      }));

      triggerRef.current = trigger;
      queueMicrotask(() => setOpen(true));
      void onLookup?.({ label, dxn }).then((target) =>
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
        <div className='contents' ref={setRoot}>
          {children}
        </div>
      </Popover.Root>
    </EditorPreviewContextProvider>
  );
};
