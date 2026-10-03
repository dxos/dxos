//
// Copyright 2023 DXOS.org
//

export { type Resource, type TFunction } from '@dxos/i18n';
export { Trans } from 'react-i18next';
export { ErrorBoundary, type ErrorBoundaryProps, type FallbackProps } from '@dxos/react-error-boundary';

export * from '@dxos/react-hooks';
export * from '@dxos/ui-types';

export * from './hooks/index.ts';
export * from './flow/index.ts';
export * from './layout/index.ts';
export * from './next/index.ts';
// Explicit, so the component size scale wins over `@dxos/ui-types`' spacing `Size` re-exported above.
export { type Size } from './next/sizes.ts';
export * from './providers/index.ts';
export * from './theme/index.ts';
export * from './util/index.ts';
