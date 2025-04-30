//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren, useRef, useState, useEffect, useCallback } from 'react';

import { addEventListener } from '@dxos/async';
import { type DxRefTagActivate } from '@dxos/lit-ui';
import { Popover, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { type PreviewLinkRef, type PreviewLinkTarget, type PreviewLookup } from '../extensions';

const customEventOptions = { capture: true, passive: false };

// Create a context for the dxn value.
type RefPopoverValue = Partial<{ link: PreviewLinkRef; target: PreviewLinkTarget; pending: boolean }>;
const REF_POPOVER = 'RefPopover';
const [RefPopoverProvider, useRefPopover] = createContext<RefPopoverValue>(REF_POPOVER, {});

type RefPopoverRootProps = ThemedClassName<PropsWithChildren<{ onLookup?: PreviewLookup }>>;

const RefPopoverRoot = ({ classNames, children, onLookup }: RefPopoverRootProps) => {
  const trigger = useRef<HTMLButtonElement | null>(null);
  const [value, setValue] = useState<RefPopoverValue>({});
  const [rootRef, setRootRef] = useState<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  const handleDxRefTagActivate = useCallback(
    (event: DxRefTagActivate) => {
      const { ref, label, trigger: dxTrigger } = event;
      setValue((value) => ({
        ...value,
        link: { label, ref },
        pending: true,
      }));
      trigger.current = dxTrigger;
      queueMicrotask(() => setOpen(true));
      void onLookup?.({ label, ref }).then((target) =>
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
    <RefPopoverProvider pending={value.pending} link={value.link} target={value.target}>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.VirtualTrigger virtualRef={trigger} />
        <div role='none' className={mx('contents', classNames)} ref={setRootRef}>
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
