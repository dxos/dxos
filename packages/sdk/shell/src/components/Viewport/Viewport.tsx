//
// Copyright 2023 DXOS.org
//

import React, {
  type ComponentPropsWithRef,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  forwardRef,
  useEffect,
} from 'react';

import { KEYBOARD_MODALITY_ATTR, findFirstFocusable } from '@dxos/react-focus';
import { createContext, useControllableState } from '@dxos/react-hooks';
import * as Hooks from '@dxos/react-ui/Hooks';
import type * as Util from '@dxos/react-ui/Util';
import { mx } from '@dxos/ui-theme';

const VIEWPORT_NAME = 'Viewport';
const VIEWS_NAME = 'ViewportViews';
const VIEW_NAME = 'ViewportView';

type ViewportContextValue = {
  focusManaged: boolean;
  activeView: string;
  setActiveView: Dispatch<SetStateAction<string | undefined>>;
};

const [ViewportProvider, useViewportContext] = createContext<ViewportContextValue>(VIEWPORT_NAME);

type ViewportRootProps = Util.ThemedClassName<ComponentPropsWithRef<'div'>> &
  Partial<{
    focusManaged: boolean;
    defaultActiveView: string;
    activeView: string;
    onActiveViewChange: Dispatch<SetStateAction<string>>;
  }>;

const ViewportRoot = ({
  classNames,
  children,
  defaultActiveView,
  activeView: propsActiveView,
  focusManaged = false,
  onActiveViewChange,
  ...props
}: ViewportRootProps) => {
  const [activeView = 'never', setActiveView] = useControllableState({
    prop: propsActiveView,
    defaultProp: defaultActiveView,
    onChange: onActiveViewChange,
  });
  return (
    <ViewportProvider focusManaged={focusManaged} activeView={activeView} setActiveView={setActiveView}>
      <div role='region' aria-live='polite' {...props} className={mx('w-full overflow-hidden', classNames)}>
        {children}
      </div>
    </ViewportProvider>
  );
};

ViewportRoot.displayName = VIEWPORT_NAME;

type ViewportViewsProps = Util.ThemedClassName<Omit<ComponentPropsWithRef<'div'>, 'children'>> & {
  children: ReactNode[];
};

const ViewportViews = ({ classNames, children, ...props }: ViewportViewsProps) => {
  const size = { inlineSize: `${Math.ceil(children.length) * 100}%` };
  return (
    <div style={size} {...props} className={mx('flex', classNames)}>
      {children}
    </div>
  );
};

ViewportViews.displayName = VIEWS_NAME;

type ViewportViewProps = Util.ThemedClassName<Omit<ComponentPropsWithRef<'div'>, 'id'>> & {
  id: string;
};

const ViewportView = forwardRef<HTMLDivElement, ViewportViewProps>(
  ({ classNames, children, id, ...props }, forwardedRef) => {
    const { activeView, focusManaged }: ViewportContextValue = useViewportContext(VIEW_NAME);
    const isActive = id === activeView;
    const ref = Hooks.useForwardedRef(forwardedRef);
    useEffect(() => {
      if (!focusManaged && isActive && document.body.hasAttribute(KEYBOARD_MODALITY_ATTR) && ref.current) {
        findFirstFocusable(ref.current)?.focus();
      }
    }, [focusManaged, ref.current, isActive]);

    return (
      <section
        {...props}
        {...(!isActive && { 'aria-hidden': true })}
        className={mx('min-w-0 flex-1 flex flex-col', isActive ? 'order-2' : 'order-4 invisible', classNames)}
        ref={ref}
      >
        {children}
      </section>
    );
  },
);

ViewportView.displayName = VIEW_NAME;

export const Viewport = {
  Root: ViewportRoot,
  Views: ViewportViews,
  View: ViewportView,
};

export { useViewportContext };

export type { ViewportRootProps, ViewportViewProps, ViewportViewsProps };
