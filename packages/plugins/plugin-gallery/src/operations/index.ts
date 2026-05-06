//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

const Handlers = OperationHandlerSet.lazy(() => import('./describe-image'));

export { DescribeImage } from './definitions';

export const GalleryHandlers = Handlers;
