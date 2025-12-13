//
// Copyright 2025 DXOS.org
//

/**
 * Web Component Context Protocol Integration for SolidJS
 *
 * This module provides a standards-compliant implementation of the
 * Web Component Context Protocol with seamless SolidJS integration.
 *
 * @see https://github.com/webcomponents-cg/community-protocols/blob/main/proposals/context.md
 *
 * @example
 * ```tsx
 * import { customElement, noShadowDOM } from 'solid-element';
 * import {
 *   createContext,
 *   ContextProtocolProvider,
 *   useWebComponentContext,
 *   withContextProvider
 * } from './context';
 *
 * // Create a typed context
 * const themeContext = createContext<{ primary: string }>('theme');
 *
 * // Provide context (works with both SolidJS components and web components)
 * function App() {
 *   return (
 *     <ContextProtocolProvider context={themeContext} value={{ primary: 'blue' }}>
 *       <MyComponent />
 *       <my-custom-element />
 *     </ContextProtocolProvider>
 *   );
 * }
 *
 * // Consume context in SolidJS components
 * function MyComponent() {
 *   const theme = useWebComponentContext(themeContext, { subscribe: true });
 *   return <div style={{ color: theme()?.primary }}>Themed Content</div>;
 * }
 *
 * // Define a custom element with solid-element + context support
 * customElement('my-custom-element', {}, withContextProvider(() => {
 *   noShadowDOM(); // Optional: use light DOM
 *   const theme = useWebComponentContext(themeContext, { subscribe: true });
 *   return <button style={{ background: theme()?.primary }}>Click me</button>;
 * }));
 * ```
 */

export * from './consumer';
export * from './protocol';
export * from './provider';
export * from './solid-element';
