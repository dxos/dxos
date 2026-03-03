//
// Copyright 2025 DXOS.org
//

import type { ComponentType } from 'solid-element';
import type { JSX } from 'solid-js';

import { HostElementContext } from './internal';

/**
 * Integration utilities for using Web Component Context Protocol with solid-element.
 *
 * This module provides utilities to integrate our context protocol implementation
 * with the solid-element library for creating web components.
 *
 * @example
 * ```tsx
 * import { customElement } from 'solid-element';
 * import { withContextProvider } from './context/solid-element';
 *
 * customElement('my-button', {}, withContextProvider((props, { element }) => {
 *   const theme = useWebComponentContext(themeContext, { subscribe: true });
 *   return <button style={{ background: theme()?.primary }}>Click me</button>;
 * }));
 * ```
 */

/**
 * Options passed by solid-element to component functions.
 * The element extends HTMLElement with additional custom element methods.
 */
export interface SolidElementOptions {
  element: HTMLElement & {
    renderRoot: Element | Document | ShadowRoot | DocumentFragment;
    addReleaseCallback(fn: () => void): void;
    addPropertyChangedCallback(fn: (name: string, value: unknown) => void): void;
  };
}

/**
 * Function component type for solid-element.
 * Receives props and an options object containing the host element.
 */
export type SolidElementComponent<P extends object = object> = (props: P, options: SolidElementOptions) => JSX.Element;

/**
 * Wraps a solid-element component to provide the host element context.
 * This enables useWebComponentContext to dispatch events from the custom element
 * rather than document.body.
 *
 * @param component - The solid-element component function
 * @returns A wrapped component that provides HostElementContext
 *
 * @example
 * ```tsx
 * import { customElement } from 'solid-element';
 * import { withContextProvider, useWebComponentContext } from './context';
 *
 * customElement('themed-button', {}, withContextProvider((props, { element }) => {
 *   const theme = useWebComponentContext(themeContext, { subscribe: true });
 *   return (
 *     <button style={{ background: theme()?.primary }}>
 *       Themed Button
 *     </button>
 *   );
 * }));
 * ```
 */
export function withContextProvider<P extends object>(component: SolidElementComponent<P>): ComponentType<P> {
  // Return a new component function that wraps the original with HostElementContext
  // This enables useWebComponentContext to dispatch events from the custom element
  const wrappedComponent = (props: P, options: SolidElementOptions) => {
    // Create a child component that renders within the context
    const WrappedContent = () => component(props, options);

    return (
      <HostElementContext.Provider value={options.element}>
        <WrappedContent />
      </HostElementContext.Provider>
    );
  };

  return wrappedComponent as unknown as ComponentType<P>;
}
