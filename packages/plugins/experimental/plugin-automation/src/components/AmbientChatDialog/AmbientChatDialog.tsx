//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren, useCallback, useState } from 'react';

import { useAppGraph, useLayout } from '@dxos/app-framework';
import { Filter, getSpace } from '@dxos/client/echo';
import { Dialog, Icon, IconButton, useTranslation } from '@dxos/react-ui';
import { resizeAttributes, ResizeHandle, type Size, sizeStyle } from '@dxos/react-ui-dnd';

import { AUTOMATION_PLUGIN } from '../../meta';
import { AIChatType } from '../../types';
import { ThreadContainer } from '../Thread';

const preventDefault = (event: Event) => event.preventDefault();

export const AmbientChatDialog = ({ children }: PropsWithChildren) => {
  // TODO(burdon): Get active space.
  // TODO(burdon): Use last chat or create new one.
  const layout = useLayout();
  const { graph } = useAppGraph();
  const [chat, setChat] = useState<AIChatType | undefined>();
  if (layout.active.length > 0) {
    const node = graph.findNode(layout.active[0]);
    if (node) {
      const space = getSpace(node.data);
      if (space) {
        void space.db
          .query(Filter.schema(AIChatType))
          .run()
          .then(({ objects }) => {
            if (objects.length > 0) {
              setChat(objects[objects.length - 1]);
            }
          });
      }
    }
  }

  return (
    <ChatDialog>
      <ThreadContainer chat={chat} />
    </ChatDialog>
  );
};

const ChatDialog = ({ children }: PropsWithChildren) => {
  // TODO(burdon): Hack to make ResizeHandle re-render.
  const [iter, setIter] = useState(0);
  const [size, setSize] = useState<Size>('min-content');
  const handleToggle = useCallback(() => {
    setIter((iter) => iter + 1);
    setSize('min-content');
  }, []);

  return (
    <div role='none' className='dx-dialog__overlay bg-transparent pointer-events-none' data-block-align='end'>
      <Dialog.Content
        onInteractOutside={preventDefault}
        classNames='pointer-events-auto relative overflow-hidden p-2 is-[30rem] max-is-none'
        inOverlayLayout
        {...resizeAttributes}
        style={{
          ...sizeStyle(size, 'vertical'),
          maxBlockSize: 'calc(100dvh - env(safe-area-inset-bottom) - env(safe-area-inset-top) - 8rem)',
        }}
      >
        <ResizeHandle
          key={iter}
          side='block-start'
          defaultSize='min-content'
          minSize={5}
          fallbackSize={5}
          iconPosition='center'
          onSizeChange={setSize}
        />

        <Header onToggle={handleToggle} />

        {children}
      </Dialog.Content>
    </div>
  );
};

/**
 * Matches same layout grid as PromptBar.
 */
const Header = ({ onToggle }: { onToggle: () => void }) => {
  const { t } = useTranslation(AUTOMATION_PLUGIN);
  return (
    <div className='w-full grid grid-cols-[2rem_1fr_2rem] gap-2'>
      <div className='flex h-8 items-center justify-center'>
        <Dialog.Close>
          <Icon icon='ph--x--regular' />
        </Dialog.Close>
      </div>
      <div className='grow'>
        <Dialog.Title classNames='sr-only'>{t('ambient chat dialog title')}</Dialog.Title>
      </div>
      <div className='flex h-8 items-center justify-center'>
        <IconButton variant='ghost' icon='ph--caret-down--regular' iconOnly label='Shrink' onClick={onToggle} />
      </div>
    </div>
  );
};
