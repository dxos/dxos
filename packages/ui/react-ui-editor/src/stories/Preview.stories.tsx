//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import React, { useState, useEffect, type FC } from 'react';

import { faker } from '@dxos/random';
import { Popover } from '@dxos/react-ui';
import { Card } from '@dxos/react-ui-stack';
import { hoverableControlItem, hoverableControlItemTransition, hoverableControls } from '@dxos/react-ui-theme';
import { withLayout, withTheme, type Meta } from '@dxos/storybook-utils';

import { EditorStory } from './components';
import { PreviewProvider, useRefPopover } from '../components';
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
      <Popover.Content onOpenAutoFocus={(event) => event.preventDefault()}>
        <Popover.Viewport>
          <Card.Container role='popover'>
            <Card.Heading>{target?.label}</Card.Heading>
            {target && <Card.Text classNames='line-clamp-3'>{target.text}</Card.Text>}
          </Card.Container>
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
    <Card.Content classNames={hoverableControls}>
      <div className='flex items-start'>
        {!readonly && (
          <Card.Toolbar classNames='is-min p-[--dx-card-spacing-inline]'>
            {(link.suggest && (
              <>
                <Card.ToolbarIconButton
                  label='Discard'
                  icon={'ph--x--regular'}
                  onClick={() => onAction({ type: 'delete', link })}
                />
                {target && (
                  <Card.ToolbarIconButton
                    classNames='bg-successSurface text-successSurfaceText'
                    label='Apply'
                    icon='ph--check--regular'
                    onClick={() => onAction({ type: 'insert', link, target })}
                  />
                )}
              </>
            )) || (
              <Card.ToolbarIconButton
                iconOnly
                label='Delete'
                icon='ph--x--regular'
                classNames={[hoverableControlItem, hoverableControlItemTransition]}
                onClick={() => onAction({ type: 'delete', link })}
              />
            )}
          </Card.Toolbar>
        )}
        <Card.Heading classNames='grow order-first mie-0'>
          {/* <span className='text-xs text-subdued mie-2'>Prompt</span> */}
          {link.label}
        </Card.Heading>
      </div>
      {target && <Card.Text classNames='line-clamp-3 mbs-0'>{target.text}</Card.Text>}
    </Card.Content>
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
    <PreviewProvider onLookup={handlePreviewLookup}>
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
    </PreviewProvider>
  ),
};
