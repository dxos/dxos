//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

// General-purpose hooks. A hook tied to one component family lives in that family's namespace.

// Named rather than `export *`, so a release of `@dxos/react-hooks` cannot change this package's API.
export {
  type AtomState,
  type PossibleRef,
  type UseControllableStateParams,
  type UseMediaQueryOptions,
  composeEventHandlers,
  composeRefs,
  createContext,
  makeId,
  mergeRefs,
  randomString,
  setRef,
  useAsyncEffect,
  useAsyncState,
  useAtomState,
  useComposedRefs,
  useControllableState,
  useControlledState,
  useDebugDeps,
  useDefaults,
  useDefaultValue,
  useDynamicRef,
  useFileDownload,
  useForwardedRef,
  useId,
  useInterval,
  useIsFocused,
  useMediaQuery,
  useMergeRefs,
  useMulticastObservable,
  useOnTransition,
  useRefCallback,
  useScroller,
  useSize,
  useStable,
  useStateWithRef,
  useTimeout,
  useViewportResize,
} from '@dxos/react-hooks';

export { useTranslation } from '../providers/ThemeProvider/TranslationsContext.ts';
export * from '../next/hooks.ts';
export * from '../util/animation.ts';
export * from '../util/usePx.ts';
export * from './usePositioning.ts';
export * from './useSafeArea.ts';
export * from './useSafeCollisionPadding.ts';
export * from './useVisualViewport.ts';
