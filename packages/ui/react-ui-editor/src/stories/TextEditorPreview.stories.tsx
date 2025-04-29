//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import React, { useState, useEffect, type FC, type KeyboardEvent } from 'react';

import { faker } from '@dxos/random';
import { Button, Icon, IconButton, Input, Popover } from '@dxos/react-ui';
import { mx, hoverableHidden } from '@dxos/react-ui-theme';
import { withLayout, withTheme, type Meta } from '@dxos/storybook-utils';

import { DefaultStory, str } from './story-utils';
import { RefPopover, useRefPopover } from '../components/RefPopover';
import { editorWidth } from '../defaults';
import {
  preview,
  command,
  image,
  type PreviewOptions,
  type PreviewLinkRef,
  type PreviewLinkTarget,
  type PreviewRenderProps,
  type Action,
} from '../extensions';
import { createRenderer } from '../util';

const meta: Meta<typeof DefaultStory> = {
  title: 'ui/react-ui-editor/TextEditor',
  decorators: [withTheme, withLayout({ fullscreen: true })],
  render: DefaultStory,
  parameters: { layout: 'fullscreen' },
};

export default meta;

//
// Preview
//

export const Preview = {
  render: () => (
    <RefPopover.Root onLookup={handlePreviewLookup}>
      <DefaultStory
        text={str(
          '# Preview',
          '',
          'This project is part of the [DXOS][dxn:queue:data:123] SDK.',
          '',
          '![DXOS][?dxn:queue:data:123]',
          '',
          'It consists of [ECHO][dxn:queue:data:echo], [HALO][dxn:queue:data:halo], and [MESH][dxn:queue:data:mesh].',
          '',
          '## Deep dive',
          '',
          '![ECHO][dxn:queue:data:echo]',
          '',
          '',
        )}
        extensions={[
          image(),
          preview({
            renderBlock: createRenderer(PreviewBlock),
            onLookup: handlePreviewLookup,
          }),
        ]}
      />
      <PreviewCard />
    </RefPopover.Root>
  ),
};

const handlePreviewLookup = async (link: PreviewLinkRef): Promise<PreviewLinkTarget> => {
  // Random text.
  faker.seed(link.dxn.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 1));
  const text = Array.from({ length: 2 }, () => faker.lorem.paragraphs()).join('\n\n');
  return {
    label: link.label,
    text,
  };
};

// Async lookup.
// TODO(burdon): Handle error.s
const useRefTarget = (link: PreviewLinkRef, onLookup: PreviewOptions['onLookup']): PreviewLinkTarget | undefined => {
  const [target, setTarget] = useState<PreviewLinkTarget>();
  useEffect(() => {
    void onLookup(link).then((target) => setTarget(target));
  }, [link, onLookup]);

  return target;
};

const PreviewCard = () => {
  const { link, target } = useRefPopover('PreviewCard');
  return (
    <Popover.Portal>
      <Popover.Content onOpenAutoFocus={(e) => e.preventDefault()}>
        <Popover.Viewport>
          <div className='grow truncate'>{link?.label}</div>
          {target && <div className='line-clamp-3'>{target.text}</div>}
        </Popover.Viewport>
        <Popover.Arrow />
      </Popover.Content>
    </Popover.Portal>
  );
};

// TODO(burdon): Replace with card.
const PreviewBlock: FC<PreviewRenderProps> = ({ readonly, link, onAction, onLookup }) => {
  const target = useRefTarget(link, onLookup);
  return (
    <div className='group flex flex-col gap-2'>
      <div className='flex items-center gap-4'>
        <div className='grow truncate'>
          {/* <span className='text-xs text-subdued mie-2'>Prompt</span> */}
          {link.label}
        </div>
        {!readonly && (
          <div className='flex gap-1'>
            {(link.suggest && (
              <>
                {target && (
                  <IconButton
                    classNames='text-green-500'
                    label='Apply'
                    icon={'ph--check--regular'}
                    onClick={() => onAction({ type: 'insert', link, target })}
                  />
                )}
                <IconButton
                  classNames='text-red-500'
                  label='Cancel'
                  icon={'ph--x--regular'}
                  onClick={() => onAction({ type: 'delete', link })}
                />
              </>
            )) || (
              <IconButton
                iconOnly
                label='Delete'
                icon={'ph--x--regular'}
                classNames={hoverableHidden}
                onClick={() => onAction({ type: 'delete', link })}
              />
            )}
          </div>
        )}
      </div>
      {target && <div className='line-clamp-3'>{target.text}</div>}
    </div>
  );
};

//
// Command
//

export const Command = {
  render: () => (
    <DefaultStory
      text={str(
        '# Preview',
        '',
        'This project is part of the [DXOS][dxn:queue:data:123] SDK.',
        '',
        '![DXOS][dxn:queue:data:123]',
        '',
      )}
      extensions={[
        preview({
          renderBlock: createRenderer(PreviewBlock),
          onLookup: handlePreviewLookup,
        }),
        command({
          renderMenu: createRenderer(CommandMenu),
          renderDialog: createRenderer(CommandDialog),
          onHint: () => 'Press / for commands.',
        }),
      ]}
    />
  ),
};

const CommandMenu = ({ onAction }: { onAction: () => void }) => {
  return (
    <Button classNames='p-1 aspect-square' onClick={onAction}>
      <Icon icon='ph--sparkle--regular' size={5} />
    </Button>
  );
};

const CommandDialog = ({ onAction }: { onAction: (action?: Action) => void }) => {
  const [text, setText] = useState('');

  const handleInsert = () => {
    // TODO(burdon): Use queue ref.
    const link = `[${text}](dxn:queue:data:123)`;
    onAction(text.length ? { type: 'insert', text: link } : undefined);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'Enter': {
        handleInsert();
        break;
      }
      case 'Escape': {
        onAction();
        break;
      }
    }
  };

  return (
    <div className='flex w-full justify-center'>
      <div
        className={mx(
          'flex w-full p-2 gap-2 items-center bg-modalSurface border border-separator rounded-md',
          editorWidth,
        )}
      >
        <Input.Root>
          <Input.TextInput
            autoFocus={true}
            placeholder='Ask a question...'
            value={text}
            onChange={(ev) => setText(ev.target.value)}
            onKeyDown={handleKeyDown}
          />
        </Input.Root>
        <Button variant='ghost' classNames='pli-0' onClick={() => onAction({ type: 'cancel' })}>
          <Icon icon='ph--x--regular' size={5} />
        </Button>
      </div>
    </div>
  );
};
