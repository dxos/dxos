//
// Copyright 2023 DXOS.org
//

import React, { forwardRef } from 'react';

import type { Document as DocumentType } from '@braneframe/types';
import { DropdownMenu, Input, useTranslation } from '@dxos/react-ui';
import { Card } from '@dxos/react-ui-card';
import { MarkdownEditor, useTextModel } from '@dxos/react-ui-editor';
import type { MosaicTileComponent } from '@dxos/react-ui-mosaic';
import { focusRing, mx } from '@dxos/react-ui-theme';

import { getExtensions } from '../extensions';
import { MARKDOWN_PLUGIN } from '../meta';
import { type MarkdownSettingsProps } from '../types';

export type EditorCardProps = {
  id: string;
  object: DocumentType;
  color?: string;
};

export const createDocumentCard = (settings: MarkdownSettingsProps): MosaicTileComponent<EditorCardProps> =>
  forwardRef(
    (
      { classNames, isDragging, draggableStyle, draggableProps, item: { id, object, color }, grow, onSelect, onAction },
      forwardRef,
    ) => {
      const { t } = useTranslation(MARKDOWN_PLUGIN);
      const model = useTextModel({ text: object.content });
      if (!model) {
        return null;
      }

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
                  value={object.title}
                  onChange={(event) => (object.title = event.target.value)}
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
              <MarkdownEditor
                model={model}
                extensions={getExtensions({
                  document: object,
                  debug: settings.debug,
                  experimental: settings.experimental,
                })}
                slots={{
                  root: {
                    className: mx(
                      focusRing,
                      'h-full p-1 text-sm',
                      // TODO(burdon): Hack since classname ignored below.
                      '[&>div]:h-full',
                    ),
                  },
                  editor: { className: 'h-full', placeholder: t('editor placeholder') },
                }}
              />
            </Card.Body>
          </Card.Root>
        </div>
      );
    },
  );
