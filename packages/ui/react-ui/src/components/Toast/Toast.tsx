//
// Copyright 2023 DXOS.org
//

// `Toast` on Ark's toast machine, which is a store plus a `Toaster` host rather than a tree of
// roots. The declarative API is kept: `Toast.Provider` owns the store, `Toast.Root` registers its
// content and mirrors its `open` state into the store, and `Toast.Viewport` is the host, rendering
// each registered root inside the machine's actor so the parts find their toast.

import {
  Toaster,
  type ToastOptions,
  Toast as ToastPrimitive,
  createToaster,
  useToastContext as useToastPrimitiveContext,
} from '@ark-ui/react/toast';
import React, {
  type ComponentPropsWithRef,
  type ReactNode,
  forwardRef,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { useTranslation } from 'react-i18next';

import { useControllableState } from '@dxos/react-hooks';

import { translationKey } from '#translations';

import { useThemeContext } from '../../hooks';
import { DensityProvider, ElevationProvider } from '../../providers';
import { type ThemedClassName } from '../../util';
import { IconButton } from '../Button';
import { Column } from '../Column';
import { Icon } from '../Icon';
import { Progress } from '../Progress';
import {
  TOAST_NAME,
  ToastProvider as ToastContextProvider,
  type ToastEntry,
  ToastRegistry,
  useToastContext,
} from './ToastContext';

const DEFAULT_DURATION = 5_000;

/** Long enough for the exit transition in `toast.css` to finish before the machine drops the toast. */
const REMOVE_DELAY = 150;

//
// Provider
//

type ToastProviderProps = {
  children?: ReactNode;
  /** Milliseconds a toast stays unless it says otherwise. */
  duration?: number;
  /** Open toasts pile up and expand under the pointer (default); `false` lays them out as rows. */
  overlap?: boolean;
};

const ToastProvider = ({ duration = DEFAULT_DURATION, overlap = true, children }: ToastProviderProps) => {
  const [toaster] = useState(() =>
    createToaster({
      placement: 'bottom-end',
      overlap,
      gap: 8,
      duration,
      removeDelay: REMOVE_DELAY,
      pauseOnPageIdle: true,
      // The end offset widens at `md` (see `toast.css`); the store takes a string, so a variable.
      offsets: { top: '1rem', bottom: '1rem', left: '1rem', right: 'var(--dx-toast-offset-end, 1rem)' },
    }),
  );
  const [registry] = useState(() => new ToastRegistry());
  const context = useMemo(() => ({ toaster, registry, duration }), [toaster, registry, duration]);
  return <ToastContextProvider {...context}>{children}</ToastContextProvider>;
};

ToastProvider.displayName = 'Toast.Provider';

//
// Viewport
//

const VIEWPORT_NAME = 'Toast.Viewport';

type ToastViewportProps = ThemedClassName<Omit<ComponentPropsWithRef<typeof Toaster>, 'toaster' | 'children'>>;

/** Renders one registered root's content inside the machine's actor. */
const ToastHost = ({ entry }: { entry: ToastEntry }) => {
  const { tx } = useThemeContext();
  const toast = useToastPrimitiveContext();
  const timed = Number.isFinite(entry.countdown) && entry.countdown > 0;
  return (
    <ToastPrimitive.Root {...entry.props} className={tx('toast.root', {}, entry.classNames)} ref={entry.ref}>
      <ElevationProvider elevation='toast'>
        <Column.Root classNames={tx('toast.grid', {})}>{entry.children}</Column.Root>
        {timed && <Progress countdown={entry.countdown} paused={toast.paused} classNames={tx('toast.countdown', {})} />}
      </ElevationProvider>
    </ToastPrimitive.Root>
  );
};

const ToastViewport = forwardRef<HTMLDivElement, ToastViewportProps>(({ classNames, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  const { toaster, registry } = useToastContext(VIEWPORT_NAME);
  useSyncExternalStore(registry.subscribe, registry.getSnapshot, registry.getSnapshot);
  return (
    <Toaster {...props} toaster={toaster} className={tx('toast.viewport', {}, classNames)} ref={forwardedRef}>
      {(toast: ToastOptions) => {
        const entry = toast.id === undefined ? undefined : registry.get(toast.id);
        return entry ? <ToastHost entry={entry} /> : null;
      }}
    </Toaster>
  );
});

ToastViewport.displayName = VIEWPORT_NAME;

//
// Root
//

const ROOT_NAME = 'Toast.Root';

type ToastRootProps = ThemedClassName<ComponentPropsWithRef<'div'>> & {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Milliseconds before the toast closes itself; `Infinity` for one that stays. */
  duration?: number;
  /** Accepted for compatibility; the machine announces every toast the same way. */
  type?: 'foreground' | 'background';
};

/**
 * Declares a toast. Renders nothing where it stands: the content is registered for the viewport,
 * and `open` is mirrored into the store, which reports a timeout or a close back as `onOpenChange`.
 */
const ToastRoot = forwardRef<HTMLDivElement, ToastRootProps>(
  (
    { classNames, children, open: openProp, defaultOpen = true, onOpenChange, duration, type: _type, ...props },
    forwardedRef,
  ) => {
    const { toaster, registry, duration: providerDuration } = useToastContext(ROOT_NAME);
    const id = useId();
    const [open = true, setOpen] = useControllableState({
      prop: openProp,
      defaultProp: defaultOpen,
      onChange: onOpenChange,
    });
    const countdown = duration ?? providerDuration;

    // Whatever rendered last is what the viewport shows. A passive effect, not a layout one: the
    // registry re-renders the viewport synchronously, which React refuses mid-commit.
    useEffect(() => {
      registry.set(id, { children, classNames, props, ref: forwardedRef, countdown });
    });

    // Whether this root is currently mounted, read by the deferred store calls below: StrictMode
    // runs mount, cleanup, mount in a row, and a cleanup that dismissed on its own would retire
    // every toast the moment it appeared.
    const alive = useRef(false);
    useEffect(() => {
      alive.current = true;
      return () => {
        alive.current = false;
      };
    }, []);

    // Store calls leave the effect on a microtask: the store's React binding flushes synchronously
    // when it publishes, which React refuses inside a lifecycle and then applies late, leaving the
    // machine and the DOM out of step.
    useEffect(() => {
      let cancelled = false;
      queueMicrotask(() => {
        if (cancelled || !alive.current) {
          return;
        }
        if (!open) {
          if (toaster.isVisible(id)) {
            toaster.dismiss(id);
          }
          return;
        }
        if (toaster.isVisible(id)) {
          return;
        }
        // A toast still on its way out under this id would collide with the new one.
        if (toaster.isDismissed(id)) {
          toaster.remove(id);
        }
        toaster.create({
          id,
          duration: countdown,
          // The root's `aria-labelledby` follows this; every toast renders a `Title`.
          title: true,
          onStatusChange: ({ status }) => {
            if (status === 'dismissing') {
              setOpen(false);
            }
            // The root may already be gone; its content stays registered until the machine has
            // played the exit and retired the toast's height from the pile.
            if (status === 'unmounted') {
              registry.delete(id);
            }
          },
        });
      });
      return () => {
        cancelled = true;
      };
    }, [open, id, toaster, countdown, setOpen, registry]);
    // On unmount a visible toast is dismissed, not removed: removing drops the actor before it
    // reports its height gone, and the pile keeps laying out around the phantom.
    useEffect(
      () => () => {
        queueMicrotask(() => {
          // Remounted in the meantime (StrictMode): the toast is still this root's.
          if (alive.current) {
            return;
          }
          if (toaster.isVisible(id)) {
            toaster.dismiss(id);
          } else {
            toaster.remove(id);
            registry.delete(id);
          }
        });
      },
      [toaster, registry, id],
    );

    return null;
  },
);

ToastRoot.displayName = ROOT_NAME;

//
// Title
//

type ToastTitleProps = ThemedClassName<ComponentPropsWithRef<typeof ToastPrimitive.Title>> & {
  icon?: string;
  onClose?: () => void;
};

const ToastTitle = forwardRef<HTMLDivElement, ToastTitleProps>(
  ({ classNames, children, icon, onClose, ...props }, forwardedRef) => {
    const { t } = useTranslation(translationKey);
    const { tx } = useThemeContext();
    return (
      <Column.Row classNames={tx('toast.header', {})}>
        {icon && (
          <Column.Block>
            <Icon icon={icon} size={5} />
          </Column.Block>
        )}
        <ToastPrimitive.Title {...props} className={tx('toast.title', {}, classNames)} ref={forwardedRef}>
          {children}
        </ToastPrimitive.Title>
        {onClose && (
          <Column.Block end>
            <IconButton
              variant='ghost'
              icon='ph--x--regular'
              iconOnly
              label={t('toolbar-close.label')}
              onClick={onClose}
            />
          </Column.Block>
        )}
      </Column.Row>
    );
  },
);

ToastTitle.displayName = 'Toast.Title';

//
// Description
//

type ToastDescriptionProps = ThemedClassName<ComponentPropsWithRef<typeof ToastPrimitive.Description>>;

const ToastDescription = forwardRef<HTMLDivElement, ToastDescriptionProps>(
  ({ classNames, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <ToastPrimitive.Description {...props} className={tx('toast.description', {}, classNames)} ref={forwardedRef}>
        {children}
      </ToastPrimitive.Description>
    );
  },
);

ToastDescription.displayName = 'Toast.Description';

//
// Actions
//

type ToastActionsProps = ThemedClassName<ComponentPropsWithRef<'div'>>;

const ToastActions = forwardRef<HTMLDivElement, ToastActionsProps>(
  ({ classNames, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <Column.Center classNames={tx('toast.actions', {}, classNames)} ref={forwardedRef} {...props}>
        <DensityProvider density='sm'>{children}</DensityProvider>
      </Column.Center>
    );
  },
);

ToastActions.displayName = 'Toast.Actions';

//
// Action / Close
//

type ToastActionProps = ComponentPropsWithRef<typeof ToastPrimitive.ActionTrigger> & {
  /** Accepted for compatibility; the machine has no alternative-text slot for an action. */
  altText?: string;
};

const ToastAction = forwardRef<HTMLButtonElement, ToastActionProps>(({ altText: _altText, ...props }, forwardedRef) => (
  <ToastPrimitive.ActionTrigger {...props} ref={forwardedRef} />
));

ToastAction.displayName = 'Toast.Action';

type ToastCloseProps = ComponentPropsWithRef<typeof ToastPrimitive.CloseTrigger>;

const ToastClose = ToastPrimitive.CloseTrigger;

//
// Toast
//

export const Toast = {
  Provider: ToastProvider,
  Viewport: ToastViewport,
  Root: ToastRoot,
  Title: ToastTitle,
  Description: ToastDescription,
  Actions: ToastActions,
  Action: ToastAction,
  Close: ToastClose,
};

export { TOAST_NAME };

export type {
  ToastActionProps,
  ToastActionsProps,
  ToastCloseProps,
  ToastDescriptionProps,
  ToastProviderProps,
  ToastRootProps,
  ToastTitleProps,
  ToastViewportProps,
};
