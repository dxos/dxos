//
// Copyright 2023 DXOS.org
//

import React, { forwardRef } from 'react';

import { type DocumentType } from '@braneframe/types';
import { createDocAccessor } from '@dxos/react-client/echo';
import { DropdownMenu, Input, useThemeContext, useTranslation } from '@dxos/react-ui';
import { Card } from '@dxos/react-ui-card';
import {
  createBasicExtensions,
  createDataExtensions,
  createThemeExtensions,
  useTextEditor,
} from '@dxos/react-ui-editor';
import type { MosaicTileComponent } from '@dxos/react-ui-mosaic';
import { focusRing, mx } from '@dxos/react-ui-theme';

import { getExtensions } from '../extensions';
import { MARKDOWN_PLUGIN } from '../meta';
import { type MarkdownSettingsProps } from '../types';

export type DocumentItemProps = {
  id: string;
  object: DocumentType;
  color?: string;
};

export type DocumentCardProps = {
  settings: MarkdownSettingsProps;
};

export const DocumentCard: MosaicTileComponent<DocumentItemProps, HTMLDivElement, DocumentCardProps> = forwardRef(
  (
    {
      classNames,
      isDragging,
      draggableStyle,
      draggableProps,
      item: { id, object, color },
      grow,
      settings,
      onSelect,
      onAction,
    },
    forwardRef,
  ) => {
    const { t } = useTranslation(MARKDOWN_PLUGIN);
    const { themeMode } = useThemeContext();
    const { parentRef, focusAttributes } = useTextEditor(
      () => ({
        doc: object.content?.content,
        extensions: [
          createBasicExtensions({ placeholder: t('editor placeholder') }),
          createThemeExtensions({ themeMode }),
          createDataExtensions({
            id: object.id,
            text: object.content && createDocAccessor(object.content, ['content']),
          }),
          getExtensions({
            document: object,
            debug: settings.debug,
            experimental: settings.experimental,
          }),
        ],
      }),
      [object, themeMode],
    );

    return (
      <div role='none' ref={forwardRef} className='flex w-full' style={draggableStyle}>
        <Card.Root classNames={mx('w-full snap-center', color, isDragging && 'opacity-20', classNames)} grow={grow}>
          <Card.Header onDoubleClick={() => onSelect?.()}>
            <Card.DragHandle {...draggableProps} />
            <Input.Root>
              <Input.TextInput
                variant='subdued'
                classNames='p-0'
                placeholder={t('document title placeholder')}
                value={object.name}
                onChange={(event) => (object.name = event.target.value)}
              />
            </Input.Root>
            <Card.Menu>
              {/* TODO(burdon): Handle events/intents? */}
              <DropdownMenu.Item onClick={() => onAction?.({ id, action: 'delete' })}>
                <span className='grow'>Delete</span>
              </DropdownMenu.Item>
              <DropdownMenu.Item onClick={() => onAction?.({ id, action: 'set-color' })}>
                <span className='grow'>Change color</span>
              </DropdownMenu.Item>
            </Card.Menu>
          </Card.Header>
          <Card.Body>
            <div {...focusAttributes} ref={parentRef} className={mx(focusRing, 'rounded-sm h-full p-1 text-sm')} />
          </Card.Body>
        </Card.Root>
      </div>
    );
  },
);

export default DocumentCard;
