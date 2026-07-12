//
// Copyright 2026 DXOS.org
//

import React, { useRef, useState } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Panel, Toolbar, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';
import { Book } from '#types';

import { BookInfo } from './BookInfo';
import { BookReader } from './BookReader';
import { type EpubReaderHandle } from './EpubReader';

export type BookArticleProps = AppSurface.ObjectArticleProps<Book.Book>;

type ViewMode = 'info' | 'read';

/**
 * Full-page view of a single book. A toolbar toggles between the read-only catalog view + activity form
 * (Info) and the inline content reader (Read). Private notes live in a separate markdown companion.
 */
export const BookArticle = ({ subject, role }: BookArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const [viewMode, setViewMode] = useState<ViewMode>('info');
  const readerRef = useRef<EpubReaderHandle>(null);

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          {/* Paging controls for the reader — shown only in reading mode; no-op for PDF/no content. */}
          {viewMode === 'read' && (
            <>
              <Toolbar.IconButton
                icon='ph--caret-left--regular'
                iconOnly
                label={t('previous-page.label')}
                onClick={() => readerRef.current?.goLeft()}
              />
              <Toolbar.IconButton
                icon='ph--caret-right--regular'
                iconOnly
                label={t('next-page.label')}
                onClick={() => readerRef.current?.goRight()}
              />
            </>
          )}
          <div role='none' className='grow' />
          <Toolbar.ToggleGroup
            type='single'
            value={viewMode}
            onValueChange={(value) => {
              if (value === 'info' || value === 'read') {
                setViewMode(value);
              }
            }}
          >
            <Toolbar.ToggleGroupIconItem value='info' icon='ph--info--regular' iconOnly label={t('view-info.label')} />
            <Toolbar.ToggleGroupIconItem
              value='read'
              icon='ph--book-open--regular'
              iconOnly
              label={t('view-read.label')}
            />
          </Toolbar.ToggleGroup>
        </Toolbar.Root>
      </Panel.Toolbar>
      {/* A single full-height grid track sizes the child by the track rather than a percentage: a plain
          grid item does not resolve a child's `block-size: 100%`, collapsing full-bleed content (the
          EPUB/PDF reader) to zero height. */}
      <Panel.Content classNames='grid grid-rows-[minmax(0,1fr)]'>
        {viewMode === 'read' ? <BookReader ref={readerRef} book={subject} /> : <BookInfo book={subject} />}
      </Panel.Content>
    </Panel.Root>
  );
};
