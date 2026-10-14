//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/react-client/echo';
import { Editor } from '@dxos/react-ui-editor';
import * as Card from '@dxos/react-ui/Card';
import * as Hooks from '@dxos/react-ui/Hooks';
import { Text } from '@dxos/schema';
import { compactSlots } from '@dxos/ui-editor';

import { MarkdownEditor, MarkdownEditorProvider } from '#components';
import { meta } from '#meta';
import { Markdown } from '#types';

import { getContentSnippet } from '../../util.tsx';
import { snippet as snippetExtension } from './snippet.ts';

/** Cap for the snippet preview: slightly taller than the card is wide, so a long document clips
 * under the fade instead of growing an unbounded card. Relative to the card's inline size. */
const SNIPPET_MAX_HEIGHT = '100cqi';

const countWords = (text: string): number => text.split(/\s+/).filter(Boolean).length;

export type MarkdownCardProps = { subject: Markdown.Document | Text.Text };

export const MarkdownCard = ({ subject }: MarkdownCardProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const [document] = useObject(Obj.instanceOf(Markdown.Document, subject) ? subject : undefined);
  const [docContent] = useObject(document?.content, 'content');
  const [textContent] = useObject(Obj.instanceOf(Text.Text, subject) ? subject : undefined, 'content');
  const content = docContent ?? textContent ?? '';
  // NOTE: Newline is added so that the mask does not obscure the last line.
  // An empty document has no snippet at all, so it renders no preview box rather than an empty one
  // (concatenating the newline unconditionally made this always truthy).
  const snippet = useMemo(() => {
    const text = (document && Obj.getDescription(document)) || getContentSnippet(content, 16);
    return text ? text + '\n' : undefined;
  }, [document, content]);
  const extensions = useMemo(() => [snippetExtension({ maxHeight: SNIPPET_MAX_HEIGHT, scale: 0.8 })], []);
  const words = countWords(content);

  return (
    <Card.Body>
      {snippet && (
        <Card.Section>
          {/* The clipped snippet dissolves into whatever the card sits on: a mask on the content,
              not a colour painted over it, since the card surface differs per host (grid, popover,
              board) and a fade to the wrong surface reads as a grey band across the last line. */}
          {/* The snippet runs across the card's rails as well as its content track: it has no icon or trailing cell. */}
          <Card.Row span='full' classNames='mask-b-from-[calc(100%-8rem)] mask-b-to-100%'>
            {/* Re-seed the readonly snippet when the content changes (the editor takes `initialValue`
                at mount only). Keyed on the snippet so agent/remote edits are reflected. */}
            <MarkdownEditorProvider key={snippet} id={subject.id} viewMode='readonly' extensions={extensions}>
              {(editorRootProps) => (
                <Editor.Root {...editorRootProps}>
                  {/* The editor is the container the snippet's cap is measured against, so it scales with the card; not the
                      Section, whose inline-size containment would stop it being a subgrid of the card's tracks. */}
                  <MarkdownEditor.Content
                    classNames='dx-container-type-inline-size bg-transparent'
                    initialValue={snippet}
                    slots={compactSlots}
                    compact
                  />
                </Editor.Root>
              )}
            </MarkdownEditorProvider>
          </Card.Row>
        </Card.Section>
      )}
      <Card.Section>
        {/* Across the rails, as the snippet is, so the count starts at the snippet's text edge rather than indented. */}
        <Card.Row span='full'>
          <Card.Text classNames='px-2 text-xs' variant='muted' data-testid='markdown.card.words'>
            {words} {t('words.label', { count: words })}
          </Card.Text>
        </Card.Row>
      </Card.Section>
    </Card.Body>
  );
};

MarkdownCard.displayName = 'MarkdownCard';
