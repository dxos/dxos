//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren, useRef, useState, useEffect, useCallback } from 'react';

import { type DxRefTagActivate } from '@dxos/lit-ui';
import { Popover } from '@dxos/react-ui';

import { type PreviewLinkRef, type PreviewLinkTarget, type PreviewLookup } from '../extensions';

// Create a context for the dxn value
type RefPopoverValue = Partial<{ link: PreviewLinkRef; target: PreviewLinkTarget; pending: boolean }>;
const REF_POPOVER = 'RefPopover';
const [RefPopoverProvider, useRefPopover] = createContext<RefPopoverValue>(REF_POPOVER, {});

type RefPopoverRootProps = PropsWithChildren<{
  onLookup?: PreviewLookup;
}>;

const customEventOptions = { capture: true, passive: false };

const RefPopoverRoot = ({ children, onLookup }: RefPopoverRootProps) => {
  const trigger = useRef<HTMLButtonElement | null>(null);
  const [value, setValue] = useState<RefPopoverValue>({});
  const [rootRef, setRootRef] = useState<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  const handleDxRefTagActivate = useCallback(
    (event: DxRefTagActivate) => {
      const { dxn, label, trigger: dxTrigger } = event;
      setValue((value) => ({
        ...value,
        link: { dxn, label },
        pending: true,
      }));
      trigger.current = dxTrigger;
      queueMicrotask(() => setOpen(true));
      void onLookup?.({ dxn, label }).then((target) =>
        setValue((value) => ({
          ...value,
          target,
          pending: false,
        })),
      );
    },
    [onLookup],
  );

  useEffect(() => {
    if (rootRef) {
      rootRef.addEventListener('dx-ref-tag-activate', handleDxRefTagActivate as EventListener, customEventOptions);
      return () => {
        rootRef.removeEventListener('dx-ref-tag-activate', handleDxRefTagActivate as EventListener, customEventOptions);
      };
    }
  }, [rootRef]);

  return (
    <RefPopoverProvider pending={value.pending} link={value.link} target={value.target}>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.VirtualTrigger virtualRef={trigger} />
        <div role='none' className='contents' ref={setRootRef}>
          {children}
        </div>
      </Popover.Root>
    </RefPopoverProvider>
  );
};

export const RefPopover = {
  Root: RefPopoverRoot,
};

export { useRefPopover };

export type { RefPopoverRootProps, RefPopoverValue };
