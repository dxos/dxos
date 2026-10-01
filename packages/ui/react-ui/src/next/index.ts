//
// Copyright 2026 DXOS.org
//

export * from './Next.tsx';
// Flat under its own name: the root re-exports `@dxos/ui-types`, whose spacing-scale `Size` would collide.
export { type Size as NextSize } from './sizes.ts';

// Declaration emit in consumers names these types when it infers a composite's props (TS2883 otherwise).
export type {
  ButtonProps,
  ButtonVariantProps,
  ComboboxFilter,
  ComboboxOption,
  GroupProps,
  IconProps,
  ScrollAreaRootProps,
  ToolbarRootProps,
  TooltipSide,
  UseEditableOptions,
} from './components/index.ts';
