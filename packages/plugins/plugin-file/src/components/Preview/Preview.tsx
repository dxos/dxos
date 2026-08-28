//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { MediaPlayer, composable, composableProps, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

import { PdfCanvas } from '../PdfCanvas';
import { PreviewContext, usePreview } from './PreviewContext';

//
// Root
//

export type PreviewRootProps = {
  type: string;
  url: string;
  children?: React.ReactNode;
};

/**
 * Preview of a file's content, composed rather than configured: `Preview.Root` holds the source and
 * whatever the content learns about it, `Preview.Content` renders by media type, and
 * `Preview.Toolbar` sits above with controls.
 *
 * Split this way because the toolbar needs facts only the content discovers — a PDF's page count is
 * known after pdf.js parses the document, not before — and a single component taking a `toolbar`
 * prop would have to lift that state through props it does not own.
 *
 * The root renders no element of its own. Its parts are placed into slots that belong to whatever
 * surrounds them — `Panel.Toolbar` and `Panel.Content` in the file article — so a wrapper would
 * break the panel's grid by putting a div between it and its areas.
 */
const PreviewRoot = ({ type, url, children }: PreviewRootProps) => {
  const [pageCount, setPageCount] = useState<number | undefined>(undefined);
  const value = useMemo(() => ({ type, url, pageCount, setPageCount }), [type, url, pageCount]);

  return <PreviewContext.Provider value={value}>{children}</PreviewContext.Provider>;
};

PreviewRoot.displayName = 'Preview.Root';

//
// Toolbar
//

/**
 * Controls above the content. Renders the page count once a paged document reports one, so an empty
 * toolbar still reserves its row and the content does not shift when the count arrives.
 *
 * `composable` rather than a plain component: this is placed in `Panel.Toolbar asChild`, which
 * forwards its own className and ref through Slot, and a plain component would silently drop both.
 */
const PreviewToolbar = composable<HTMLDivElement>(({ children, ...props }, forwardedRef) => {
  const { t } = useTranslation(meta.profile.key);
  const { pageCount } = usePreview('Preview.Toolbar');

  return (
    <div
      {...composableProps(props, { classNames: 'flex items-center gap-2 px-2 min-h-8' })}
      role='toolbar'
      ref={forwardedRef}
    >
      {children}
      {pageCount !== undefined && (
        <span className='text-xs text-subdued'>{t('page-count.label', { count: pageCount })}</span>
      )}
    </div>
  );
});

PreviewToolbar.displayName = 'Preview.Toolbar';

//
// Content
//

/**
 * Renders the source by media type: PDFs through pdf.js, images/video/audio through `MediaPlayer`,
 * and anything else as a download link.
 *
 * `composable` for the same reason as the toolbar — it is placed in `Panel.Content asChild`.
 */
const PreviewContent = composable<HTMLDivElement>((props, forwardedRef) => {
  const { type, url, setPageCount } = usePreview('Preview.Content');
  const handleLoad = useCallback((count: number) => setPageCount(count), [setPageCount]);
  const { className } = composableProps(props);

  if (type === 'application/pdf') {
    return <PdfCanvas classNames={className} url={url} onLoad={handleLoad} ref={forwardedRef} />;
  }

  if (type.startsWith('image/') || type.startsWith('video/') || type.startsWith('audio/')) {
    return (
      <div {...composableProps(props, { classNames: 'grid h-full w-full min-h-0' })} ref={forwardedRef}>
        <MediaPlayer
          classNames='h-full w-full'
          src={url}
          // `kind` is set explicitly for audio and video because the URL is a `data:`/`blob:`/
          // presigned one with no usable extension, which is all `detectMediaKind` has to go on.
          // Images take no `kind` — `MediaKind` has no image member, and the unset path is `<img>`.
          kind={type.startsWith('audio/') ? 'audio' : type.startsWith('video/') ? 'video' : undefined}
          fit='contain'
        />
      </div>
    );
  }

  return (
    <div {...composableProps(props, { classNames: 'p-4' })} ref={forwardedRef}>
      <a className='underline' href={url} download>
        Download file
      </a>
    </div>
  );
});

PreviewContent.displayName = 'Preview.Content';

export const Preview = {
  Root: PreviewRoot,
  Toolbar: PreviewToolbar,
  Content: PreviewContent,
};
