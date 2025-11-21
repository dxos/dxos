//
// Copyright 2023 DXOS.org
//

import { syntaxTree } from '@codemirror/language';
import { type EditorView } from '@codemirror/view';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { invariant } from '@dxos/invariant';
import { faker } from '@dxos/random';
import { Popover } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';
import { Card } from '@dxos/react-ui-stack';
import { hoverableControlItem, hoverableControlItemTransition, hoverableControls } from '@dxos/react-ui-theme';
import { trim } from '@dxos/util';

import { type EditorController, EditorPreviewProvider, useEditorPreview } from '../components';
import {
  type PreviewBlock,
  type PreviewLinkRef,
  type PreviewLinkTarget,
  getLinkRef,
  image,
  preview,
} from '../extensions';

import { EditorStory } from './components';

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
const useRefTarget = (link: PreviewLinkRef): PreviewLinkTarget | undefined => {
  const [target, setTarget] = useState<PreviewLinkTarget | undefined>();
  useEffect(() => {
    void handlePreviewLookup(link).then((target) => setTarget(target ?? undefined));
  }, [link]);

  return target;
};

const PreviewCard = () => {
  const { target } = useEditorPreview('PreviewCard');
  return (
    <Popover.Portal>
      <Popover.Content onOpenAutoFocus={(event) => event.preventDefault()}>
        <Popover.Viewport>
          <Card.SurfaceRoot role='card--popover'>
            <Card.Heading>{target?.label}</Card.Heading>
            {target && <Card.Text classNames='line-clamp-3'>{target.text}</Card.Text>}
          </Card.SurfaceRoot>
        </Popover.Viewport>
        <Popover.Arrow />
      </Popover.Content>
    </Popover.Portal>
  );
};

type PreviewAction =
  | {
      type: 'insert';
      link: PreviewLinkRef;
      target: PreviewLinkTarget;
    }
  | {
      type: 'delete';
      link: PreviewLinkRef;
    };

const PreviewBlockComponent = ({ link, el, view }: { link: PreviewLinkRef; el: HTMLElement; view?: EditorView }) => {
  const target = useRefTarget(link);

  const handleAction = useCallback(
    (action: PreviewAction) => {
      invariant(view, 'View not found');
      const pos = view.posAtDOM(el);
      const node = syntaxTree(view.state).resolve(pos + 1).node.parent;
      if (!node) {
        return;
      }

      const link = getLinkRef(view.state, node);
      if (link?.ref !== action.link.ref) {
        return;
      }

      switch (action.type) {
        // TODO(burdon): Should we dispatch to the view or mutate the document? (i.e., handle externally?)
        // Insert ref text.
        case 'insert': {
          view.dispatch({
            changes: {
              from: node.from,
              to: node.to,
              insert: action.target.text,
            },
          });
          break;
        }
        // Remove ref.
        case 'delete': {
          view.dispatch({
            changes: {
              from: node.from,
              to: node.to,
            },
          });
          break;
        }
      }
    },
    [view, el],
  );

  const handleDelete = useCallback(() => {
    handleAction({ type: 'delete', link });
  }, [handleAction, link]);

  const handleInsert = useCallback(() => {
    if (target) {
      handleAction({ type: 'insert', link, target });
    }
  }, [handleAction, link, target]);

  return createPortal(
    <Card.StaticRoot classNames={hoverableControls}>
      <div className='flex items-start'>
        {!view?.state.readOnly && (
          <Card.Toolbar classNames='is-min p-[--dx-cardSpacingInline]'>
            {(link.suggest && (
              <>
                <Card.ToolbarIconButton label='Discard' icon='ph--x--regular' onClick={handleDelete} />
                {target && (
                  <Card.ToolbarIconButton
                    classNames='bg-successSurface text-successSurfaceText'
                    label='Apply'
                    icon='ph--check--regular'
                    onClick={handleInsert}
                  />
                )}
              </>
            )) || (
              <Card.ToolbarIconButton
                iconOnly
                label='Delete'
                icon='ph--x--regular'
                classNames={[hoverableControlItem, hoverableControlItemTransition]}
                onClick={handleDelete}
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
    </Card.StaticRoot>,
    el,
  );
};

const meta = {
  title: 'ui/react-ui-editor/Preview',
  component: EditorStory,
  decorators: [withTheme],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof EditorStory>;

export default meta;

type Story = StoryObj<typeof meta>;

const text = trim`
  # Preview

  This project is part of the [DXOS](dxn:queue:data:123) SDK.

  ![DXOS](dxn:queue:data:123)

  It consists of [ECHO](dxn:queue:data:echo), [HALO](dxn:queue:data:halo), and [MESH](dxn:queue:data:mesh).

  ## Deep dive

  ![ECHO](dxn:queue:data:echo)

`;

export const Default: Story = {
  render: () => {
    const [controller, setController] = useState<EditorController | null>(null);
    const [previewBlocks, setPreviewBlocks] = useState<PreviewBlock[]>([]);
    const extensions = useMemo(() => {
      return [
        image(),
        preview({
          addBlockContainer: (block) => {
            setPreviewBlocks((prev) => [...prev, block]);
          },
          removeBlockContainer: (block) => {
            setPreviewBlocks((prev) => prev.filter(({ link: prevLink }) => prevLink.ref !== block.link.ref));
          },
        }),
      ];
    }, []);

    // TODO(burdon): Migrate to Editor.Root.
    // TODO(burdon): Ranges must be sorted error (decorate.enter).
    return (
      <EditorPreviewProvider onLookup={handlePreviewLookup}>
        <EditorStory ref={setController} text={text} extensions={extensions} />
        <PreviewCard />
        {controller?.view &&
          previewBlocks.map(({ link, el }) => (
            <PreviewBlockComponent key={link.ref} link={link} el={el} view={controller.view!} />
          ))}
      </EditorPreviewProvider>
    );
  },
};
