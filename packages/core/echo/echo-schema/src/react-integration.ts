//
// Copyright 2023 DXOS.org
//

declare global {
  const __REACT_DEVTOOLS_GLOBAL_HOOK__: any;
}

export type ReactComponentInfo = {
  fileName?: string;
  lineNumber?: number;
  columnNumber?: number;
};

/**
 * Uses react internals to check if we're in the middle of rendering a react component.
 *
 * NOTE:
 * This depends on react internals and may break in the future.
 * Don't use this for critical functionality.
 */
export const getCurrentReactComponent = (): ReactComponentInfo | undefined => {
  try {
    if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ !== 'undefined') {
      const fiber = __REACT_DEVTOOLS_GLOBAL_HOOK__.renderers.get(1).getCurrentFiber();
      if (!fiber) {
        return undefined;
      }

      const { fileName, lineNumber, columnNumber } = fiber.child?._debugSource ?? {};
      return {
        fileName: typeof fileName === 'string' ? fileName : undefined,
        lineNumber: typeof lineNumber === 'number' ? lineNumber : undefined,
        columnNumber: typeof columnNumber === 'number' ? columnNumber : undefined,
      };
    }
  } catch (err) {
    return undefined;
  }
};
