//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import React, { useState, useEffect, type FC } from 'react';

import { faker } from '@dxos/random';
import { IconButton, Popover } from '@dxos/react-ui';
import { hoverableHidden } from '@dxos/react-ui-theme';
import { withLayout, withTheme, type Meta } from '@dxos/storybook-utils';

import { EditorStory } from './components';
import { RefPopover, useRefPopover } from '../components';
import {
  preview,
  image,
  type PreviewOptions,
  type PreviewLinkRef,
  type PreviewLinkTarget,
  type PreviewRenderProps,
} from '../extensions';
import { str } from '../testing';
import { createRenderer } from '../util';

const handlePreviewLookup = async ({ label, ref }: PreviewLinkRef): Promise<PreviewLinkTarget> => {
  // Random text.
  faker.seed(ref.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 1));
  const text = Array.from({ length: 2 }, () => faker.lorem.paragraphs()).join('\n\n');
  return {
    label,
    text,
  };
};

// Async lookup.
// TODO(burdon): Handle errors.
const useRefTarget = (link: PreviewLinkRef, onLookup: PreviewOptions['onLookup']): PreviewLinkTarget | undefined => {
  const [target, setTarget] = useState<PreviewLinkTarget | undefined>();
  useEffect(() => {
    void onLookup?.(link).then((target) => setTarget(target ?? undefined));
  }, [link, onLookup]);

  return target;
};

const PreviewCard = () => {
  const { target } = useRefPopover('PreviewCard');
  return (
    <Popover.Portal>
      <Popover.Content classNames='popover-card-width p-2' onOpenAutoFocus={(event) => event.preventDefault()}>
        <Popover.Viewport>
          <h2 className='grow truncate'>{target?.label}</h2>
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

const meta: Meta<typeof EditorStory> = {
  title: 'ui/react-ui-editor/Preview',
  component: EditorStory,
  decorators: [withTheme, withLayout({ fullscreen: true })],
  parameters: { layout: 'fullscreen' },
};

export default meta;

export const Default = {
  render: () => (
    <RefPopover.Provider onLookup={handlePreviewLookup}>
      <EditorStory
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
    </RefPopover.Provider>
  ),
};
