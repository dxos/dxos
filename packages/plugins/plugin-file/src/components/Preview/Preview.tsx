//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useHotkeys } from '@dxos/react-focus';
import { Icon, Input, MediaPlayer, Toolbar, composable, composableProps, useTranslation } from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';

import { meta } from '#meta';

import { type PdfApi, PdfCanvas, type PdfCanvasState, type PdfFit } from '../PdfCanvas/index.ts';
import { PreviewContext, type PreviewPaged, usePreview } from './PreviewContext.ts';

//
// Root
//

export type PreviewRootProps = {
  type: string;
  url: string;
  name?: string;
  size?: number;
  /** Attendable id of the surrounding article; without it the toolbar binds no shortcuts. */
  attendableId?: string;
  children?: React.ReactNode;
};

/**
 * Preview of a file's content, composed rather than configured: `Preview.Root` holds the source and
 * whatever the content learns about it, `Preview.Content` renders by media type, and
 * `Preview.Toolbar` sits above with controls.
 *
 * Split this way because the toolbar needs facts only the content discovers — a PDF's page count,
 * current page and search matches are known after pdf.js parses the document, not before — and a
 * single component taking a `toolbar` prop would have to lift that state through props it does not
 * own.
 *
 * The root renders no element of its own. Its parts are placed into slots that belong to whatever
 * surrounds them — `Panel.Toolbar` and `Panel.Content` in the file article — so a wrapper would
 * break the panel's grid by putting a div between it and its areas.
 */
const PreviewRoot = ({ type, url, name, size, attendableId, children }: PreviewRootProps) => {
  const [paged, setPaged] = useState<PreviewPaged | undefined>(undefined);
  const value = useMemo(
    () => ({ type, url, name, size, attendableId, paged, setPaged }),
    [type, url, name, size, attendableId, paged],
  );

  return <PreviewContext.Provider value={value}>{children}</PreviewContext.Provider>;
};

PreviewRoot.displayName = 'Preview.Root';

//
// Toolbar
//

/**
 * Controls above the content: page stepping, fit and search for a paged document, and a download
 * for every type. Always renders, so the row is reserved and the content does not shift when a
 * document finishes parsing and its controls appear.
 *
 * `composable` rather than a plain component: this is placed in `Panel.Toolbar asChild`, which
 * forwards its own className and ref through Slot, and a plain component would silently drop both.
 */
const PreviewToolbar = composable<HTMLDivElement>(({ children, ...props }, forwardedRef) => {
  const { t } = useTranslation(meta.profile.key);
  const { name, url, paged, attendableId } = usePreview('Preview.Toolbar');
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const { hasAttention } = useAttention(attendableId);

  // Gated on the article having attention rather than bound globally, so the shortcut belongs to
  // whichever plank the reader is in — the same mechanism `useArticleKeyboardNavigation` uses.
  useHotkeys({
    id: `${attendableId}:search`,
    commands: [
      {
        hotkey: 'meta+f',
        label: t('search-shortcut.label'),
        enabled: () => !!attendableId && hasAttention && !!paged,
        // Reachable from anywhere in the article, including when focus is already in the field,
        // where selecting the text is the useful outcome.
        options: { enableOnFormTags: true, enableOnContentEditable: true },
        action: () => {
          searchRef.current?.focus();
          searchRef.current?.select();
        },
      },
    ],
  });

  const handleSearch = useCallback(
    (next: string) => {
      setQuery(next);
      paged?.api?.search(next);
    },
    [paged],
  );

  return (
    <Toolbar.Root {...composableProps(props, { classNames: '@container' })} ref={forwardedRef}>
      {children}
      {paged && (
        <>
          <Toolbar.IconButton
            iconOnly
            icon={paged.fit === 'width' ? 'ph--arrows-out-line-horizontal--regular' : 'ph--corners-out--regular'}
            label={paged.fit === 'width' ? t('fit-page.label') : t('fit-width.label')}
            onClick={() => paged.setFit(paged.fit === 'width' ? 'page' : 'width')}
          />
          <Toolbar.IconButton
            compact
            iconOnly
            icon='ph--caret-line-left--regular'
            classNames='hidden @md:flex transition-none'
            label={t('first-page.label')}
            disabled={paged.currentPage <= 1}
            onClick={() => paged.api?.goToPage(1, 'instant')}
          />
          <Toolbar.IconButton
            iconOnly
            icon='ph--caret-left--regular'
            label={t('previous-page.label')}
            disabled={paged.currentPage <= 1}
            onClick={() => paged.api?.stepPage(-1)}
          />
          {/* Two copies stacked in one grid cell: an invisible one of the widest value reserves the
              box, so stepping 9 → 10 does not shove the buttons beside it. Padding with spaces
              cannot do this (HTML collapses them) and zero-padding shows a leading zero.
              `Toolbar.Text` also truncates by default — right for a label, wrong for a counter. */}
          <Toolbar.Text classNames='grid justify-items-end shrink-0 overflow-visible text-nowrap text-sm tabular-nums'>
            <span aria-hidden className='invisible col-start-1 row-start-1'>
              {t('page-of.label', { page: paged.pageCount, count: paged.pageCount })}
            </span>
            <span className='col-start-1 row-start-1'>
              {t('page-of.label', { page: paged.currentPage, count: paged.pageCount })}
            </span>
          </Toolbar.Text>
          <Toolbar.IconButton
            iconOnly
            icon='ph--caret-right--regular'
            label={t('next-page.label')}
            disabled={paged.currentPage >= paged.pageCount}
            onClick={() => paged.api?.stepPage(1)}
          />
          <Toolbar.IconButton
            compact
            iconOnly
            icon='ph--caret-line-right--regular'
            classNames='hidden @md:flex transition-none'
            label={t('last-page.label')}
            disabled={paged.currentPage >= paged.pageCount}
            onClick={() => paged.api?.goToPage(paged.pageCount, 'instant')}
          />
          <Toolbar.Separator />
          <Input.Root>
            <Input.TextInput
              ref={searchRef}
              placeholder={t('search.placeholder')}
              value={query}
              classNames='grow'
              spellCheck={false}
              autoCorrect='off'
              autoCapitalize='off'
              end={<Icon icon='ph--magnifying-glass--regular' size={4} />}
              onChange={(event) => handleSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  paged.api?.goToMatch(event.shiftKey ? paged.activeMatch - 1 : paged.activeMatch + 1);
                }
              }}
            />
          </Input.Root>
          {query.trim().length > 0 && (
            <>
              <Toolbar.Text classNames='shrink-0 overflow-visible text-nowrap tabular-nums'>
                {paged.matches === 0
                  ? t('no-matches.label')
                  : t('match-of.label', { match: paged.activeMatch, count: paged.matches })}
              </Toolbar.Text>
              <Toolbar.IconButton
                iconOnly
                icon='ph--caret-up--regular'
                label={t('previous-match.label')}
                disabled={paged.matches === 0}
                onClick={() => paged.api?.goToMatch(paged.activeMatch - 1)}
              />
              <Toolbar.IconButton
                iconOnly
                icon='ph--caret-down--regular'
                label={t('next-match.label')}
                disabled={paged.matches === 0}
                onClick={() => paged.api?.goToMatch(paged.activeMatch + 1)}
              />
            </>
          )}
        </>
      )}
      <Toolbar.Separator />
      {/* An anchor rather than a button: `download` is what makes the browser save instead of
          navigate, and it works for the `data:`/`blob:`/presigned URLs every backend produces. */}
      <Toolbar.Link href={url} download={name ?? true} aria-label={t('download.label')} title={t('download.label')}>
        <Icon icon='ph--download-simple--regular' size={5} />
      </Toolbar.Link>
    </Toolbar.Root>
  );
});

PreviewToolbar.displayName = 'Preview.Toolbar';

//
// Content
//

/**
 * Renders the source by media type: PDFs through pdf.js, images/video/audio through `MediaPlayer`,
 * and anything else as a description of what it is — the download lives in the toolbar, where it is
 * available for every type rather than only the ones with no preview.
 *
 * `composable` for the same reason as the toolbar — it is placed in `Panel.Content asChild`.
 */
const PreviewContent = composable<HTMLDivElement>((props, forwardedRef) => {
  const { t } = useTranslation(meta.profile.key);
  const { type, url, name, size, setPaged } = usePreview('Preview.Content');
  const apiRef = useRef<PdfApi>(null);
  const [fit, setFit] = useState<PdfFit>('width');
  const [state, setState] = useState<PdfCanvasState>({ pageCount: 0, currentPage: 1, matches: 0, activeMatch: 0 });
  const { className } = composableProps(props);
  const paged = type === 'application/pdf';

  // Publishes the paged controls up to the toolbar, and withdraws them when the content is no
  // longer a paged document so the toolbar does not offer page stepping for an image.
  useEffect(() => {
    if (!paged) {
      setPaged(undefined);
      return;
    }
    setPaged({ ...state, api: apiRef.current ?? undefined, fit, setFit });
    return () => setPaged(undefined);
  }, [paged, state, fit, setPaged]);

  if (paged) {
    return (
      <PdfCanvas
        classNames={className}
        url={url}
        fit={fit}
        apiRef={apiRef}
        onStateChange={setState}
        ref={forwardedRef}
      />
    );
  }

  if (type.startsWith('image/') || type.startsWith('video/') || type.startsWith('audio/')) {
    return (
      <div {...composableProps(props, { classNames: 'grid dx-fill min-h-0' })} ref={forwardedRef}>
        <MediaPlayer
          classNames='dx-fill'
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
    <div {...composableProps(props, { classNames: 'grid place-items-center dx-fill p-8' })} ref={forwardedRef}>
      <div className='flex flex-col items-center gap-2 text-center'>
        <Icon icon='ph--file--regular' size={8} classNames='text-subdued' />
        {name && <span className='text-sm'>{name}</span>}
        <span className='text-xs text-subdued'>
          {size === undefined ? type : t('file-details.label', { type, size: formatBytes(size) })}
        </span>
        <span className='text-xs text-subdued'>{t('no-preview.message')}</span>
      </div>
    </div>
  );
});

PreviewContent.displayName = 'Preview.Content';

const UNITS = ['B', 'kB', 'MB', 'GB'];

/** Decimal units, matching what a file manager shows rather than what a disk reports. */
const formatBytes = (bytes: number): string => {
  let value = bytes;
  let unit = 0;
  while (value >= 1000 && unit < UNITS.length - 1) {
    value /= 1000;
    unit++;
  }
  return `${unit === 0 ? value : value.toFixed(1)} ${UNITS[unit]}`;
};

export const Preview = {
  Root: PreviewRoot,
  Toolbar: PreviewToolbar,
  Content: PreviewContent,
};
