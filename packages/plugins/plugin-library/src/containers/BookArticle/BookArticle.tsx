//
// Copyright 2026 DXOS.org
//

import React, { useRef, useState } from 'react';

import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Panel from '@dxos/react-ui/Panel';
import * as ToggleGroup from '@dxos/react-ui/ToggleGroup';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { meta } from '#meta';
import { Book } from '#types';

import { BookInfo } from './BookInfo.tsx';
import { BookReader } from './BookReader.tsx';
import { type EpubReaderHandle } from './EpubReader.tsx';

export type BookArticleProps = AppSurface.ObjectArticleProps<Book.Book>;

type ViewMode = 'info' | 'read';

/**
 * Full-page view of a single book. A toolbar toggles between the read-only catalog view + activity form
 * (Info) and the inline content reader (Read). Private notes live in a separate markdown companion.
 */
export const BookArticle = ({ subject, role }: BookArticleProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const [viewMode, setViewMode] = useState<ViewMode>('info');
  const readerRef = useRef<EpubReaderHandle>(null);

  return (
    <Panel.Root role={role}>
      <Panel.Header>
        <Toolbar.Root>
          {/* Paging controls for the reader — shown only in reading mode; no-op for PDF/no content. */}
          {viewMode === 'read' && (
            <>
              <Button.Root
                icon='ph--caret-left--regular'
                iconOnly
                label={t('previous-page.label')}
                onClick={() => readerRef.current?.goLeft()}
              />
              <Button.Root
                icon='ph--caret-right--regular'
                iconOnly
                label={t('next-page.label')}
                onClick={() => readerRef.current?.goRight()}
              />
            </>
          )}
          <div className='grow' />
          <Toolbar.ToggleGroup
            type='single'
            value={viewMode}
            onValueChange={(value) => {
              if (value === 'info' || value === 'read') {
                setViewMode(value);
              }
            }}
          >
            <ToggleGroup.Item value='info' icon='ph--info--regular' iconOnly label={t('view-info.label')} />
            <ToggleGroup.Item value='read' icon='ph--book-open--regular' iconOnly label={t('view-read.label')} />
          </Toolbar.ToggleGroup>
        </Toolbar.Root>
      </Panel.Header>
      {/* A single full-height grid track sizes the child by the track rather than a percentage: a plain
          grid item does not resolve a child's `block-size: 100%`, collapsing full-bleed content (the
          EPUB/PDF reader) to zero height. */}
      <Panel.Body classNames='grid grid-rows-[minmax(0,1fr)]'>
        {viewMode === 'read' ? <BookReader ref={readerRef} book={subject} /> : <BookInfo book={subject} />}
      </Panel.Body>
    </Panel.Root>
  );
};
