//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren, useRef, useState, useEffect, useCallback, type RefObject } from 'react';

import { addEventListener } from '@dxos/async';
import { type DxRefTag, type DxRefTagActivate } from '@dxos/lit-ui';
import { Popover } from '@dxos/react-ui';

import { type PreviewLinkRef, type PreviewLinkTarget, type PreviewLookup } from '../../extensions';

const customEventOptions = { capture: true, passive: false };

// Create a context for the dxn value.
type RefPopoverValue = Partial<{ link: PreviewLinkRef; target: PreviewLinkTarget; pending: boolean }>;
const REF_POPOVER = 'RefPopover';
const [RefPopoverContextProvider, useRefPopover] = createContext<RefPopoverValue>(REF_POPOVER, {});

type RefPopoverProviderProps = PropsWithChildren<{ onLookup?: PreviewLookup }>;

const RefPopoverProvider = ({ children, onLookup }: RefPopoverProviderProps) => {
  const trigger = useRef<DxRefTag | null>(null);
  const [value, setValue] = useState<RefPopoverValue>({});
  const [rootRef, setRootRef] = useState<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  const handleDxRefTagActivate = useCallback(
    (event: DxRefTagActivate) => {
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

  useEffect(() => {
    return rootRef
      ? addEventListener(rootRef, 'dx-ref-tag-activate', handleDxRefTagActivate, customEventOptions)
      : undefined;
  }, [rootRef]);

  return (
    <RefPopoverContextProvider pending={value.pending} link={value.link} target={value.target}>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.VirtualTrigger virtualRef={trigger as unknown as RefObject<HTMLButtonElement>} />
        <div role='none' className='contents' ref={setRootRef}>
          {children}
        </div>
      </Popover.Root>
    </RefPopoverContextProvider>
  );
};

export const RefPopover = {
  Provider: RefPopoverProvider,
};

export { useRefPopover };

export type { RefPopoverProviderProps, RefPopoverValue };
