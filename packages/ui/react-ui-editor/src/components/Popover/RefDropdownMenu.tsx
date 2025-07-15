//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren, useRef, useState, useEffect, useCallback, type RefObject } from 'react';

import { addEventListener } from '@dxos/async';
import { type DxRefTag, type DxRefTagActivate } from '@dxos/lit-ui';
import { DropdownMenu } from '@dxos/react-ui';

import { type PreviewLinkRef, type PreviewLinkTarget, type PreviewLookup } from '../../extensions';

// TODO(burdon): Reconcile this file with RefPopover?

const customEventOptions = { capture: true, passive: false };

// Create a context for the dxn value.
type RefDropdownMenuValue = Partial<{
  link: PreviewLinkRef;
  target: PreviewLinkTarget;
  pending: boolean;
}>;

const REF_DROPDOWN_MENU = 'RefDropdownMenu';
const [RefDropdownMenuContextProvider, useRefDropdownMenu] = createContext<RefDropdownMenuValue>(REF_DROPDOWN_MENU, {});

type RefDropdownMenuProviderProps = PropsWithChildren<{
  onLookup?: PreviewLookup;
}>;

const RefDropdownMenuProvider = ({ children, onLookup }: RefDropdownMenuProviderProps) => {
  const trigger = useRef<DxRefTag | null>(null);
  const [value, setValue] = useState<RefDropdownMenuValue>({});
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
    if (!rootRef) {
      return;
    }

    return addEventListener(rootRef, 'dx-ref-tag-activate' as any, handleDxRefTagActivate, customEventOptions);
  }, [rootRef]);

  return (
    <RefDropdownMenuContextProvider pending={value.pending} link={value.link} target={value.target}>
      <DropdownMenu.Root open={open} onOpenChange={setOpen}>
        <DropdownMenu.VirtualTrigger virtualRef={trigger as unknown as RefObject<HTMLButtonElement>} />
        <div role='none' className='contents' ref={setRootRef}>
          {children}
        </div>
      </DropdownMenu.Root>
    </RefDropdownMenuContextProvider>
  );
};

export const RefDropdownMenu = {
  Provider: RefDropdownMenuProvider,
};

export { useRefDropdownMenu };

export type { RefDropdownMenuProviderProps, RefDropdownMenuValue };
