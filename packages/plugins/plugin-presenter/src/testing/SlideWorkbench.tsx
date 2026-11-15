//
// Copyright 2026 DXOS.org
//

import { EditorView as NaturalEditorView } from '@codemirror/view';
import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';

import { Editor } from '@dxos/react-ui-editor';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Splitter from '@dxos/react-ui/Splitter';
import type * as Util from '@dxos/react-ui/Util';
import {
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  documentSlots,
  editorClassNames,
  scrollbarAutohide,
} from '@dxos/ui-editor';

import { MarkdownSlide, type MarkdownSlideProps } from '../components/MarkdownSlide/index.ts';
import { Slide } from '../components/Slide/index.ts';
import { slideCompletion } from '../containers/SlideEditorArticle/slide-completion.ts';
import { slideHighlight } from '../containers/SlideEditorArticle/slide-highlight.ts';

export type SlideWorkbenchProps = Util.ThemedClassName<
  Omit<MarkdownSlideProps, 'content'> & {
    /** The slide's markdown; the editor starts from it and the slide follows every edit. */
    content: string;
    onContentChange?: (content: string) => void;
  }
>;

/**
 * A slide over the markdown that renders it, in a live editor: typing in the lower pane re-renders the slide above
 * it. Shared by the stories, where it is both the illustration of a feature and the way to try it.
 */
export const SlideWorkbench = ({ classNames, content, onContentChange, ...props }: SlideWorkbenchProps) => {
  const split = useHalfSplit();
  const [value, setValue] = useState(content);
  // A story that changes its `content` arg (the Storybook control) restarts the editor from it.
  useLayoutEffect(() => setValue(content), [content]);
  const handleChange = useCallback(
    (value: string) => {
      setValue(value);
      onContentChange?.(value);
    },
    [onContentChange],
  );

  return (
    <Splitter.Root {...split} orientation='vertical' resizable classNames={classNames ?? 'size-full'}>
      <Splitter.Panel position='start'>
        <Slide.Frame inset classNames='min-h-0'>
          <MarkdownSlide content={value} {...props} />
        </Slide.Frame>
      </Splitter.Panel>
      <Splitter.ResizeTrigger aria-label='Resize' />
      <Splitter.Panel position='end'>
        <SlideSourceEditor value={value} onChange={handleChange} />
      </Splitter.Panel>
    </Splitter.Root>
  );
};

type SlideSourceEditorProps = {
  value: string;
  onChange: (value: string) => void;
};

/** The slide's markdown in the same editor the plugin uses, minus the parts that need an ECHO document. */
const SlideSourceEditor = ({ value, onChange }: SlideSourceEditorProps) => {
  const themeMode = Hooks.useThemeMode();
  const extensions = useMemo(
    () => [
      createBasicExtensions({ lineWrapping: true }),
      createThemeExtensions({ themeMode, slots: documentSlots }),
      createMarkdownExtensions(),
      // As in the slide editor: fenced code is drawn, the rest stays source so `---` frontmatter is not a rule.
      decorateMarkdown({ nodes: ['FencedCode'] }),
      slideHighlight(),
      // Layout names only; a story has no translations to describe them with.
      slideCompletion({ describeLayout: (layout) => layout }),
      NaturalEditorView.theme({ '.cm-content': { paddingInlineStart: '32px' } }),
      scrollbarAutohide(),
    ],
    [themeMode],
  );

  return (
    <Editor.Root>
      <Editor.View classNames={editorClassNames()} extensions={extensions} value={value} onChange={onChange} />
    </Editor.Root>
  );
};

/**
 * Starts the seam at half the container's height. The splitter sizes its panes in rem, so the half has to be
 * measured; a container that is not laid out yet measures zero, so the observer waits for the first real height.
 * After that the size is the user's, and the observer stops.
 */
const useHalfSplit = () => {
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const [size, setSize] = useState<number>();
  useLayoutEffect(() => {
    if (!root || size !== undefined) {
      return;
    }
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const apply = (height: number) => height > 0 && setSize(height / 2 / rem);
    apply(root.getBoundingClientRect().height);
    const observer = new ResizeObserver(([entry]) => apply(entry.contentRect.height));
    observer.observe(root);
    return () => observer.disconnect();
  }, [root, size]);
  return { ref: setRoot, size, onSizeChange: setSize };
};
