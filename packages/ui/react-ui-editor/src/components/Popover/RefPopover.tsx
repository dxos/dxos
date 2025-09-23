//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, {
  type PropsWithChildren,
  type RefObject,
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { addEventListener } from '@dxos/async';
import { type DxAnchor, type DxAnchorActivate } from '@dxos/lit-ui';
import { Popover } from '@dxos/react-ui';

import { type PreviewLinkRef, type PreviewLinkTarget, type PreviewLookup } from '../../extensions';

// TODO(burdon): Move to @dxos/lit-ui

//
// Context
//

type RefPopoverValue = Partial<{
  link: PreviewLinkRef;
  target: PreviewLinkTarget;
  pending: boolean;
}>;

const [RefPopoverContextProvider, useRefPopover] = createContext<RefPopoverValue>('RefPopover', {});

//
// ContextProvider
//

type PreviewProviderProps = PropsWithChildren<{
  onLookup?: PreviewLookup;
}>;

const PreviewProvider = ({ children, onLookup }: PreviewProviderProps) => {
  const trigger = useRef<DxAnchor | null>(null);
  const [value, setValue] = useState<RefPopoverValue>({});
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

  return (
    <RefPopoverContextProvider pending={value.pending} link={value.link} target={value.target}>
      <RefPopover ref={trigger} open={open} onOpenChange={setOpen} onActivate={handleDxAnchorActivate}>
        {children}
      </RefPopover>
    </RefPopoverContextProvider>
  );
};

//
// Popover
//

type RefPopoverProps = PropsWithChildren<{
  modal?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onActivate?: (event: DxAnchorActivate) => void;
}>;

/**
 * Wraps components that contain <dx-anchor> elements?
 */
const RefPopover = forwardRef<DxAnchor | null, RefPopoverProps>(
  ({ children, open, onOpenChange, modal, onActivate }, ref) => {
    const [rootRef, setRootRef] = useState<HTMLDivElement | null>(null);
    useEffect(() => {
      if (!rootRef || !onActivate) {
        return;
      }

      return addEventListener(rootRef, 'dx-anchor-activate' as any, onActivate, { capture: true, passive: false });
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

export { RefPopover, PreviewProvider, useRefPopover };

export type { RefPopoverProps, PreviewProviderProps, RefPopoverValue };
