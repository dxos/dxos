//
// Copyright 2026 DXOS.org
//

import { useCallback } from 'react';

import { EdgeServiceName, getEnvString } from '@dxos/config';
import { log } from '@dxos/log';
import { useConfig, useEdgeServiceEndpoint } from '@dxos/react-client';

import { type SupportOperation } from '#types';

import { captureScreenshot, uploadScreenshot } from './screenshot';

export type ScreenshotAttachment = {
  /** Public image-service URL, absent when capture was not requested or failed. */
  url?: string;
  /** True when the user opted in but capture/upload failed — callers surface this in their toast. */
  failed: boolean;
};

export const useScreenshotAttachment = () => {
  const config = useConfig();
  // Shared with @dxos/plugin-crm (same Edge service, same multipart contract).
  const imageEndpoint = useEdgeServiceEndpoint(EdgeServiceName.Image);
  const imageServiceUrl = getEnvString(config, 'DX_IMAGE_SERVICE_URL') ?? imageEndpoint;

  return useCallback(
    async (values: SupportOperation.SupportRequest): Promise<ScreenshotAttachment> => {
      // Not opted in, or nowhere to upload to: either way there is nothing to capture, and
      // rasterizing the DOM only to report a failure would read as a broken feature rather than an
      // unconfigured one.
      if (!values.image || !imageServiceUrl) {
        return { failed: false };
      }

      const blob = await captureScreenshot();
      if (!blob) {
        log.warn('feedback: screenshot capture returned no blob');
        return { failed: true };
      }

      const url = await uploadScreenshot(blob, imageServiceUrl);
      if (!url) {
        log.warn('feedback: screenshot upload returned no url');
        return { failed: true };
      }

      // URL is public but still identifies the user's screenshot; log a flag, not the URL.
      log.info('feedback: screenshot attached', { bytes: blob.size });
      return { url, failed: false };
    },
    [imageServiceUrl],
  );
};
