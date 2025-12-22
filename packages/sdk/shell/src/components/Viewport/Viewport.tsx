//
// Copyright 2023 DXOS.org
//

import { useFocusFinders } from '@fluentui/react-tabster';
import { type Scope, createContextScope } from '@radix-ui/react-context';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, {
  type ComponentPropsWithRef,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  forwardRef,
  useEffect,
} from 'react';

import { type ThemedClassName, useForwardedRef } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

const VIEWPORT_NAME = 'Viewport';
const VIEWS_NAME = 'ViewportViews';
const VIEW_NAME = 'ViewportView';

type ViewportContextValue = {
  focusManaged: boolean;
  activeView: string;
  setActiveView: Dispatch<SetStateAction<string | undefined>>;
};

type ViewportScopedProps<P> = P & { __viewportScope?: Scope };

const [createViewportContext, createViewportScope] = createContextScope(VIEWPORT_NAME, []);

const [ViewportProvider, useViewportContext] = createViewportContext<ViewportContextValue>(VIEWPORT_NAME);

type ViewportRootProps = ThemedClassName<ComponentPropsWithRef<'div'>> &
  Partial<{
    focusManaged: boolean;
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
  focusManaged = false,
  onActiveViewChange,
  ...props
}: ViewportScopedProps<ViewportRootProps>) => {
  const [activeView = 'never', setActiveView] = useControllableState({
    prop: propsActiveView,
    defaultProp: defaultActiveView,
    onChange: onActiveViewChange,
  });
  return (
    <ViewportProvider
      focusManaged={focusManaged}
      activeView={activeView}
      setActiveView={setActiveView}
      scope={__viewportScope}
    >
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

type ViewportViewProps = ThemedClassName<Omit<ComponentPropsWithRef<'div'>, 'id'>> & {
  id: string;
};

const ViewportView = forwardRef<HTMLDivElement, ViewportScopedProps<ViewportViewProps>>(
  ({ __viewportScope, classNames, children, id, ...props }, forwardedRef) => {
    const { activeView, focusManaged }: ViewportContextValue = useViewportContext(VIEW_NAME, __viewportScope);
    const isActive = id === activeView;
    const ref = useForwardedRef(forwardedRef);
    const { findFirstFocusable } = useFocusFinders();
    useEffect(() => {
      if (!focusManaged && isActive && document.body.hasAttribute('data-is-keyboard') && ref.current) {
        findFirstFocusable(ref.current)?.focus();
      }
    }, [focusManaged, ref.current, isActive]);

    return (
      <section
        {...props}
        {...(!isActive && { 'aria-hidden': true })}
        className={mx('min-is-0 flex-1 flex flex-col', isActive ? 'order-2' : 'order-4 invisible', classNames)}
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
