//
// Copyright 2026 DXOS.org
//

// Ark's toast machine is a store plus a `Toaster` host rather than a tree of roots. The declarative API is kept:
// `Toast.Provider` owns the store, `Toast.Root` registers its content and mirrors `open` into the store, and
// `Toast.Toaster` renders each registered root inside the machine's actor so the parts find their toast.

import {
  Toaster as ToasterPrimitive,
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
import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { translationKey } from '#translations';

import { recipes } from '../../recipes.ts';
import { type Size } from '../../sizes.ts';
import { Button } from '../Button/index.ts';
import { Icon } from '../Icon/index.ts';
import { Progress } from '../Progress/index.ts';
import { ToastContextProvider, type ToastEntry, ToastRegistry, useToastContext } from './registry.ts';

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
      // The end offset widens at `md` (`toast.css`); the store takes a string, so a variable.
      offsets: { top: '1rem', bottom: '1rem', left: '1rem', right: 'var(--dx-toast-offset-end, 1rem)' },
    }),
  );
  const [registry] = useState(() => new ToastRegistry());
  const context = useMemo(() => ({ toaster, registry, duration }), [toaster, registry, duration]);
  return <ToastContextProvider {...context}>{children}</ToastContextProvider>;
};

ToastProvider.displayName = 'Next.Toast.Provider';

//
// Toaster
//

type ToastToasterProps = ThemedClassName<
  Omit<ComponentPropsWithRef<typeof ToasterPrimitive>, 'toaster' | 'children'>
> & {
  size?: Size;
};

/** Renders one registered root's content inside the machine's actor, as a popup-level panel. */
const ToastHost = ({ entry, size }: { entry: ToastEntry; size?: Size }) => {
  const toast = useToastPrimitiveContext();
  const timed = Number.isFinite(entry.countdown) && entry.countdown > 0;
  return (
    <ToastPrimitive.Root
      {...entry.props}
      data-surface='popup'
      data-size={size}
      className={mx(recipes.toast(), entry.classNames)}
      ref={entry.ref}
    >
      {entry.children}
      {timed && <Progress countdown={entry.countdown} paused={toast.paused} classNames={recipes.toastCountdown()} />}
    </ToastPrimitive.Root>
  );
};

/** Ark's region host; place one per app, after the content that declares toasts. */
const ToastToaster = forwardRef<HTMLDivElement, ToastToasterProps>(({ classNames, size, ...props }, forwardedRef) => {
  const { toaster, registry } = useToastContext('Next.Toast.Toaster');
  useSyncExternalStore(registry.subscribe, registry.getSnapshot, registry.getSnapshot);
  return (
    <ToasterPrimitive {...props} toaster={toaster} className={mx(recipes.toaster(), classNames)} ref={forwardedRef}>
      {(toast: ToastOptions) => {
        const entry = toast.id === undefined ? undefined : registry.get(toast.id);
        return entry ? <ToastHost entry={entry} size={size} /> : null;
      }}
    </ToasterPrimitive>
  );
});

ToastToaster.displayName = 'Next.Toast.Toaster';

//
// Root
//

type ToastRootProps = ThemedClassName<ComponentPropsWithRef<'div'>> & {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Milliseconds before the toast closes itself; `Infinity` for one that stays. */
  duration?: number;
};

/**
 * Declares a toast. Renders nothing where it stands: the content is registered for the toaster, and `open` is
 * mirrored into the store, which reports a timeout or a close back as `onOpenChange`.
 */
const ToastRoot = forwardRef<HTMLDivElement, ToastRootProps>(
  ({ classNames, children, open: openProp, defaultOpen = true, onOpenChange, duration, ...props }, forwardedRef) => {
    const { toaster, registry, duration: providerDuration } = useToastContext('Next.Toast.Root');
    const id = useId();
    const [open = true, setOpen] = useControllableState({
      prop: openProp,
      defaultProp: defaultOpen,
      onChange: onOpenChange,
    });
    const countdown = duration ?? providerDuration;

    // Whatever rendered last is what the toaster shows. A passive effect: the registry re-renders the toaster
    // synchronously, which React refuses mid-commit.
    useEffect(() => {
      registry.set(id, { children, classNames, props, ref: forwardedRef, countdown });
    });

    // Read by the deferred store calls: StrictMode runs mount, cleanup, mount, and a cleanup that dismissed on its own
    // would retire every toast the moment it appeared.
    const alive = useRef(false);
    useEffect(() => {
      alive.current = true;
      return () => {
        alive.current = false;
      };
    }, []);

    // Store calls leave the effect on a microtask: the store's React binding flushes synchronously when it publishes,
    // which React refuses inside a lifecycle.
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
          // The root's `aria-labelledby` follows this; every toast renders a Title.
          title: true,
          onStatusChange: ({ status }) => {
            if (status === 'dismissing') {
              setOpen(false);
            }
            // The content stays registered until the machine has played the exit and retired its height.
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

    // On unmount a visible toast is dismissed, not removed: removing drops the actor before it reports its height
    // gone, and the pile keeps laying out around the phantom.
    useEffect(
      () => () => {
        queueMicrotask(() => {
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

ToastRoot.displayName = 'Next.Toast.Root';

//
// Title
//

type ToastTitleProps = ThemedClassName<ComponentPropsWithRef<typeof ToastPrimitive.Title>>;

const ToastTitle = forwardRef<HTMLDivElement, ToastTitleProps>(({ classNames, ...props }, forwardedRef) => (
  <ToastPrimitive.Title {...props} className={mx(recipes.toastTitle(), classNames)} ref={forwardedRef} />
));

ToastTitle.displayName = 'Next.Toast.Title';

//
// CloseTrigger
//

type ToastCloseTriggerProps = { label?: string };

/** A ghost icon-only Button that dismisses the toast through the machine, reported as `onOpenChange(false)`. */
const ToastCloseTrigger = forwardRef<HTMLButtonElement, ToastCloseTriggerProps>(({ label }, forwardedRef) => {
  const { t } = useTranslation(translationKey);
  return (
    <ToastPrimitive.CloseTrigger asChild>
      <Button
        variant='ghost'
        icon='ph--x--regular'
        iconOnly
        label={label ?? t('toolbar-close.label')}
        classNames={recipes.toastCloseTrigger()}
        ref={forwardedRef}
      />
    </ToastPrimitive.CloseTrigger>
  );
});

ToastCloseTrigger.displayName = 'Next.Toast.CloseTrigger';

//
// Header
//

type ToastHeaderProps = ThemedClassName<ComponentPropsWithRef<'div'>> & {
  icon?: string;
  /** Renders a trailing CloseTrigger; on by default. */
  closable?: boolean;
};

/** A block row: an optional icon, the Title (children) and a close button. */
const ToastHeader = forwardRef<HTMLDivElement, ToastHeaderProps>(
  ({ classNames, icon, closable = true, children, ...props }, forwardedRef) => (
    <div
      {...props}
      data-scope='toast'
      data-part='header'
      className={mx(recipes.toastHeader(), classNames)}
      ref={forwardedRef}
    >
      {icon && <Icon icon={icon} classNames={recipes.toastIcon()} />}
      <ToastTitle>{children}</ToastTitle>
      {closable && <ToastCloseTrigger />}
    </div>
  ),
);

ToastHeader.displayName = 'Next.Toast.Header';

//
// Description
//

type ToastDescriptionProps = ThemedClassName<ComponentPropsWithRef<typeof ToastPrimitive.Description>>;

const ToastDescription = forwardRef<HTMLDivElement, ToastDescriptionProps>(({ classNames, ...props }, forwardedRef) => (
  <ToastPrimitive.Description {...props} className={mx(recipes.toastDescription(), classNames)} ref={forwardedRef} />
));

ToastDescription.displayName = 'Next.Toast.Description';

//
// Footer
//

type ToastFooterProps = ThemedClassName<ComponentPropsWithRef<'div'>>;

/** A run of actions under the description. */
const ToastFooter = forwardRef<HTMLDivElement, ToastFooterProps>(({ classNames, ...props }, forwardedRef) => (
  <div
    {...props}
    data-scope='toast'
    data-part='footer'
    className={mx(recipes.toastFooter(), classNames)}
    ref={forwardedRef}
  />
));

ToastFooter.displayName = 'Next.Toast.Footer';

//
// ActionTrigger
//

type ToastActionTriggerProps = ComponentPropsWithRef<typeof Button>;

/** A Button that runs the toast's action, after which the machine dismisses the toast. */
const ToastActionTrigger = forwardRef<HTMLButtonElement, ToastActionTriggerProps>((props, forwardedRef) => (
  <ToastPrimitive.ActionTrigger asChild>
    <Button {...props} ref={forwardedRef} />
  </ToastPrimitive.ActionTrigger>
));

ToastActionTrigger.displayName = 'Next.Toast.ActionTrigger';

export const Toast = {
  Provider: ToastProvider,
  Toaster: ToastToaster,
  Root: ToastRoot,
  Header: ToastHeader,
  Title: ToastTitle,
  Description: ToastDescription,
  Footer: ToastFooter,
  ActionTrigger: ToastActionTrigger,
  CloseTrigger: ToastCloseTrigger,
};

export type {
  ToastActionTriggerProps,
  ToastCloseTriggerProps,
  ToastDescriptionProps,
  ToastFooterProps,
  ToastHeaderProps,
  ToastProviderProps,
  ToastRootProps,
  ToastTitleProps,
  ToastToasterProps,
};
