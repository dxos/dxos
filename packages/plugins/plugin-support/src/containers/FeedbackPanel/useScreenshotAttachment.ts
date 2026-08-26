//
// Copyright 2026 DXOS.org
//

import { useCallback } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { EdgeServiceName, getEdgeServiceEndpoint } from '@dxos/config';
import { log } from '@dxos/log';
import { useConfig } from '@dxos/react-client';

import { type SupportOperation } from '#types';

import { captureScreenshot, uploadScreenshot } from './screenshot';

/** Lets the deck animation settle after collapsing the companion, before html-to-image walks the DOM. */
const SETTLE_DELAY = 150;

export type ScreenshotAttachment = {
  /** Public image-service URL, absent when capture was not requested or failed. */
  url?: string;
  /** True when the user opted in but capture/upload failed — callers surface this in their toast. */
  failed: boolean;
};

/**
 * Shared "attach screenshot" step for every FeedbackPanel submit path (PostHog, Discord, GitHub).
 *
 * Collapses the help companion first so the capture shows the screen being reported rather than
 * the form itself, then captures and uploads. Best-effort throughout: a failure yields
 * `{ failed: true }` instead of throwing, since filing the report matters more than the image.
 */
export const useScreenshotAttachment = () => {
  const { invokePromise } = useOperationInvoker();
  const config = useConfig();
  // Shared with @dxos/plugin-crm (same Edge service, same multipart contract).
  const imageServiceUrl =
    (config.values.runtime?.app?.env?.DX_IMAGE_SERVICE_URL as string | undefined) ??
    getEdgeServiceEndpoint(config, EdgeServiceName.Image);

  return useCallback(
    async (values: SupportOperation.SupportRequest): Promise<ScreenshotAttachment> => {
      if (!values.image) {
        return { failed: false };
      }

      await invokePromise(LayoutOperation.UpdateComplementary, { state: 'collapsed' });
      await new Promise((resolve) => setTimeout(resolve, SETTLE_DELAY));

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
    [invokePromise, imageServiceUrl],
  );
};
