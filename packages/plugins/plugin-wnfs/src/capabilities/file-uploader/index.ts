//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const FileUploader = Capability.lazy('FileUploader', () => import('./file-uploader'));
