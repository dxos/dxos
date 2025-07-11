//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, {
  type PropsWithChildren,
  useRef,
  useState,
  useEffect,
  useCallback,
  type RefObject,
  forwardRef,
} from 'react';

import { addEventListener } from '@dxos/async';
import { type DxRefTag, type DxRefTagActivate } from '@dxos/lit-ui';
import { Popover } from '@dxos/react-ui';

import { type PreviewLinkRef, type PreviewLinkTarget, type PreviewLookup } from '../../extensions';

const customEventOptions = { capture: true, passive: false };

export type RefPopoverProps = PropsWithChildren<{
  modal?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onActivate?: (event: DxRefTagActivate) => void;
}>;

export const RefPopover = forwardRef<DxRefTag | null, RefPopoverProps>(
  ({ children, open, onOpenChange, modal, onActivate }, ref) => {
    const [rootRef, setRootRef] = useState<HTMLDivElement | null>(null);

    useEffect(() => {
      if (!rootRef || !onActivate) {
        return;
      }

      return addEventListener(rootRef, 'dx-ref-tag-activate' as any, onActivate, customEventOptions);
    }, [rootRef, onActivate]);

    return (
      <Popover.Root open={open} onOpenChange={onOpenChange} modal={modal}>
        <Popover.VirtualTrigger virtualRef={ref as unknown as RefObject<HTMLButtonElement>} />
        <div role='none' className='contents' ref={setRootRef}>
          {children}
        </div>
      </Popover.Root>
    );
  },
);

// Create a context for the dxn value.
type RefPopoverValue = Partial<{ link: PreviewLinkRef; target: PreviewLinkTarget; pending: boolean }>;

const REF_POPOVER = 'RefPopover';
const [RefPopoverContextProvider, useRefPopover] = createContext<RefPopoverValue>(REF_POPOVER, {});

type PreviewProviderProps = PropsWithChildren<{ onLookup?: PreviewLookup }>;

const PreviewProvider = ({ children, onLookup }: PreviewProviderProps) => {
  const trigger = useRef<DxRefTag | null>(null);
  const [value, setValue] = useState<RefPopoverValue>({});
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

  return (
    <RefPopoverContextProvider pending={value.pending} link={value.link} target={value.target}>
      <RefPopover ref={trigger} open={open} onOpenChange={setOpen} onActivate={handleDxRefTagActivate}>
        {children}
      </RefPopover>
    </RefPopoverContextProvider>
  );
};

export { PreviewProvider, useRefPopover };

export type { PreviewProviderProps, RefPopoverValue };
