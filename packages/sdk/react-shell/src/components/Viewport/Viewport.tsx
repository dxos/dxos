//
// Copyright 2023 DXOS.org
//

import { useFocusFinders } from '@fluentui/react-tabster';
import { createContextScope, Scope } from '@radix-ui/react-context';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, { ComponentPropsWithRef, Dispatch, forwardRef, ReactNode, SetStateAction, useEffect } from 'react';

import { ThemedClassName, useForwardedRef } from '@dxos/aurora';
import { mx } from '@dxos/aurora-theme';

const VIEWPORT_NAME = 'Viewport';
const VIEWS_NAME = 'ViewportViews';
const VIEW_NAME = 'ViewportView';

type ViewportContextValue = {
  activeView: string;
  setActiveView: Dispatch<SetStateAction<string | undefined>>;
};

type ViewportScopedProps<P> = P & { __viewportScope?: Scope };

const [createViewportContext, createViewportScope] = createContextScope(VIEWPORT_NAME, []);

const [ViewportProvider, useViewportContext] = createViewportContext<ViewportContextValue>(VIEWPORT_NAME);

type ViewportRootProps = ThemedClassName<ComponentPropsWithRef<'div'>> &
  Partial<{
    defaultActiveView: string;
    activeView: string;
    onActiveViewChange: Dispatch<SetStateAction<string>>;
  }>;

const ViewportRoot = ({
  __viewportScope,
  classNames,
  children,
  defaultActiveView,
  activeView: propsActiveView,
  onActiveViewChange,
  ...props
}: ViewportScopedProps<ViewportRootProps>) => {
  const [activeView = 'never', setActiveView] = useControllableState({
    prop: propsActiveView,
    defaultProp: defaultActiveView,
    onChange: onActiveViewChange,
  });
  return (
    <ViewportProvider activeView={activeView} setActiveView={setActiveView} scope={__viewportScope}>
      <div role='region' aria-live='polite' {...props} className={mx('is-full overflow-hidden', classNames)}>
        {children}
      </div>
    </ViewportProvider>
  );
};

ViewportRoot.displayName = VIEWPORT_NAME;

type ViewportViewsProps = ThemedClassName<Omit<ComponentPropsWithRef<'div'>, 'children'>> & { children: ReactNode[] };

const ViewportViews = ({ classNames, children, ...props }: ViewportViewsProps) => {
  const size = { inlineSize: `${Math.ceil(children.length) * 100}%` };
  return (
    <div role='none' style={size} {...props} className={mx('flex', classNames)}>
      {children}
    </div>
  );
};

ViewportViews.displayName = VIEWS_NAME;

type ViewportViewProps = ThemedClassName<Omit<ComponentPropsWithRef<'div'>, 'id'>> & { id: string };

const ViewportView = forwardRef<HTMLDivElement, ViewportScopedProps<ViewportViewProps>>(
  ({ __viewportScope, classNames, children, id, ...props }, forwardedRef) => {
    const { activeView }: ViewportContextValue = useViewportContext(VIEW_NAME, __viewportScope);
    const isActive = id === activeView;
    const ref = useForwardedRef(forwardedRef);
    const { findFirstFocusable } = useFocusFinders();
    useEffect(() => {
      if (isActive && ref.current) {
        findFirstFocusable(ref.current)?.focus();
      }
    }, [ref.current, isActive]);
    return (
      <section
        {...props}
        {...(!isActive && { 'aria-hidden': true })}
        className={mx('is-[50%] flex flex-col', isActive ? 'order-2' : 'order-4 invisible', classNames)}
        ref={ref}
      >
        {children}
      </section>
    );
  },
);

ViewportView.displayName = VIEW_NAME;

export const Viewport = { Root: ViewportRoot, Views: ViewportViews, View: ViewportView };
export { useViewportContext, createViewportScope };
export type { ViewportRootProps, ViewportViewsProps, ViewportViewProps, ViewportScopedProps };
