//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren, type RefObject, useCallback, useEffect, useRef, useState } from 'react';

import { addEventListener } from '@dxos/async';
import { type DxAnchorActivate, Popover } from '@dxos/react-ui';

import { type PreviewLinkRef, type PreviewLinkTarget } from '../extensions';

type PreviewLookup = (link: PreviewLinkRef) => Promise<PreviewLinkTarget | null | undefined>;

type PreviewPopoverValue = Partial<{
  link: PreviewLinkRef;
  target: PreviewLinkTarget;
  pending: boolean;
}>;

const [PreviewPopoverContextProvider, usePreviewPopover] = createContext<PreviewPopoverValue>('PreviewPopover', {});

type PopoverLookupProviderProps = PropsWithChildren<{
  onLookup?: PreviewLookup;
}>;

// TOOD(burdon): Reconcile with PreviewPlugin?
const PreviewPopoverProvider = ({ children, onLookup }: PopoverLookupProviderProps) => {
  const trigger = useRef<HTMLElement | null>(null);
  const [value, setValue] = useState<PreviewPopoverValue>({});
  const [open, setOpen] = useState(false);

  const handleDxAnchorActivate = useCallback(
    (event: DxAnchorActivate) => {
      const { refId, label, trigger: dxTrigger } = event;
      setValue((value) => ({
        ...value,
        link: { label, ref: refId },
        pending: true,
      }));
      trigger.current = dxTrigger;
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

  const [rootRef, setRootRef] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!rootRef || !handleDxAnchorActivate) {
      return;
    }

    return addEventListener(rootRef, 'dx-anchor-activate' as any, handleDxAnchorActivate, {
      capture: true,
      passive: false,
    });
  }, [rootRef, handleDxAnchorActivate]);

  return (
    <PreviewPopoverContextProvider pending={value.pending} link={value.link} target={value.target}>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.VirtualTrigger virtualRef={trigger as unknown as RefObject<HTMLButtonElement>} />
        <div role='none' className='contents' ref={setRootRef}>
          {children}
        </div>
      </Popover.Root>
    </PreviewPopoverContextProvider>
  );
};

export { PreviewPopoverProvider, usePreviewPopover };

export type { PopoverLookupProviderProps, PreviewPopoverValue };
