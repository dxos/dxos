//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren, type RefObject, useCallback, useEffect, useRef, useState } from 'react';

import { addEventListener } from '@dxos/async';
import { type DxRefTag, type DxRefTagActivate } from '@dxos/lit-ui';
import { DropdownMenu } from '@dxos/react-ui';

import { type PreviewLinkRef, type PreviewLinkTarget, type PreviewLookup } from '../../extensions';

// TODO(burdon): Move to @dxos/lit-ui

//
// Context
//

type RefDropdownMenuValue = Partial<{
  link: PreviewLinkRef;
  target: PreviewLinkTarget;
  pending: boolean;
}>;

const [RefDropdownMenuContextProvider, useRefDropdownMenu] = createContext<RefDropdownMenuValue>('RefDropdownMenu', {});

//
// Context Provider
// NOTE: This is handled by the preview-plugin.
//

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

    return addEventListener(rootRef, 'dx-ref-tag-activate' as any, handleDxRefTagActivate, {
      capture: true,
      passive: false,
    });
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

export { RefDropdownMenuProvider };

export type { RefDropdownMenuProviderProps, RefDropdownMenuValue };
