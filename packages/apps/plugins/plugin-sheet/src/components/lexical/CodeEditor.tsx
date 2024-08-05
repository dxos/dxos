//
// Copyright 2024 DXOS.org
//

import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary';
import { createEmptyHistoryState, HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { $selectAll } from '@lexical/selection';
import { $rootTextContent } from '@lexical/text';
import { mergeRegister } from '@lexical/utils';
import {
  $getRoot,
  $getSelection,
  COMMAND_PRIORITY_CRITICAL,
  KEY_ENTER_COMMAND,
  LineBreakNode,
  SELECTION_CHANGE_COMMAND,
  TextNode,
  type EditorState,
  type Klass,
  type LexicalEditor,
  type LexicalNode,
  type SerializedEditorState,
} from 'lexical';
import React, {
  createElement,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  type ForwardedRef,
} from 'react';

import { groupSurface, mx } from '@dxos/react-ui-theme';

import LexicalEditorRefSetter from './LexicalEditorRefSetter';
import CodeNode from './plugins/code/CodeNode';
import CodePlugin from './plugins/code/CodePlugin';
import parseTokens from './plugins/code/utils/parseTokens';
import parsedTokensToCodeTextNode from './plugins/code/utils/parsedTokensToCodeTextNode';
import FormPlugin from './plugins/form/FormPlugin';
import CodeCompletionPlugin from './plugins/spreadsheet-completion/CodeCompletionPlugin';

// Diffing is simplest when the Code plug-in has a flat structure.
const NODES: Array<Klass<LexicalNode>> = [LineBreakNode, CodeNode, TextNode];

export type ImperativeHandle = {
  focus: () => void;
};

type Props = {
  allowWrapping?: boolean;
  autoFocus?: boolean;
  autoSelect?: boolean;
  dataTestId?: string;
  dataTestName?: string;
  editable: boolean;
  forwardedRef?: ForwardedRef<ImperativeHandle>;
  initialValue?: string;
  onBlur?: () => void;
  onCancel?: (value: string) => void;
  onChange?: (value: string, editorState: SerializedEditorState) => void;
  onSave?: (value: string, editorState: SerializedEditorState) => void;
  placeholder?: string;
  preventTabFocusChange?: boolean;
};

const CodeEditor = ({
  allowWrapping = true,
  autoFocus = false,
  autoSelect = false,
  dataTestId,
  dataTestName,
  editable,
  forwardedRef,
  initialValue = '',
  onBlur,
  onCancel,
  onChange,
  onSave,
  placeholder = '',
  preventTabFocusChange = false,
}: Props): JSX.Element => {
  const historyState = useMemo(() => createEmptyHistoryState(), []);

  const editorRef = useRef<LexicalEditor>(null);
  const backupEditorStateRef = useRef<EditorState | null>(null);

  useImperativeHandle(
    forwardedRef,
    () => ({
      focus: () => {
        editorRef.current?.focus();
      },
    }),
    [],
  );

  const didMountRef = useRef(false);
  useLayoutEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;

      if (autoSelect) {
        const editor = editorRef.current;
        if (editor) {
          editor.update(() => {
            const root = $getRoot();
            const firstChild = root.getFirstChild();
            if (firstChild) {
              const selection = firstChild.select(0, 0);
              $selectAll(selection);
            }
          });
        }
      }
    }
  }, [autoSelect]);

  useEffect(() => {
    const editor = editorRef.current;
    if (editor) {
      const element = editor.getRootElement();
      if (element) {
        if (dataTestId) {
          element.setAttribute('data-test-id', dataTestId);
        } else {
          element.removeAttribute('data-test-id');
        }

        if (dataTestName) {
          element.setAttribute('data-test-name', dataTestName);
        } else {
          element.removeAttribute('data-test-name');
        }
      }
    }
  }, [editorRef, dataTestId, dataTestName]);

  const onFormCancel = (_: EditorState) => {
    if (onCancel !== undefined) {
      onCancel(initialValue);
    }

    const editor = editorRef.current;
    if (editor) {
      editor.update(() => {
        const editorState = backupEditorStateRef.current;
        if (editorState) {
          editor.setEditorState(editorState);
        }
      });
    }
  };

  const onFormChange = (editorState: EditorState) => {
    if (typeof onChange === 'function') {
      const editor = editorRef.current;
      if (editor !== null) {
        editorState.read(() => {
          const textContent = $rootTextContent();
          onChange(textContent, editorState.toJSON());
        });
      }
    }
  };

  useEffect(() => {
    if (!allowWrapping) {
      const editor = editorRef.current;
      if (editor) {
        const onEnter = (event: KeyboardEvent) => {
          if (event.shiftKey) {
            event.preventDefault();
            return true;
          }

          return false;
        };

        // Make sure the cursor is visible (if there is overflow)
        const onSelectionChange = () => {
          const selection = $getSelection();
          if (selection) {
            const nodes = selection.getNodes();
            if (nodes?.length > 0) {
              const node = nodes[0];
              const element = editor.getElementByKey(node.__key);
              if (element) {
                element.scrollIntoView({ block: 'nearest', inline: 'nearest' });
              }
            }
          }

          return false;
        };

        return mergeRegister(
          editor.registerCommand(SELECTION_CHANGE_COMMAND, onSelectionChange, COMMAND_PRIORITY_CRITICAL),
          editor.registerCommand(KEY_ENTER_COMMAND, onEnter, COMMAND_PRIORITY_CRITICAL),
        );
      }
    }
  }, [allowWrapping, editorRef]);

  const onFormSubmit = (editorState: EditorState) => {
    const editor = editorRef.current;
    if (editor !== null) {
      const textContent = $rootTextContent();
      if (onSave) {
        onSave(textContent, editorState.toJSON());
      }

      backupEditorStateRef.current = editorState;
    }
  };

  const rootElementRef = useRef<HTMLDivElement>(null);

  // useContentEditableNoUserSelect(rootElementRef, {
  //   autoFocus: autoFocus === true,
  //   disableSelectionWhenNotFocused: disableSelectionWhenNotFocused === true,
  // });

  return (
    <LexicalComposer initialConfig={createInitialConfig(initialValue, editable)}>
      <div
        className={mx(groupSurface, 'z-[10] w-full p-[4px] border-blue-500 border')}
        onBlur={onBlur}
        ref={rootElementRef}
      >
        <LexicalEditorRefSetter editorRef={editorRef} />
        {autoFocus && <AutoFocusPlugin />}
        <HistoryPlugin externalHistoryState={historyState} />
        <RichTextPlugin
          contentEditable={<ContentEditable className='border-none outline-none' />}
          placeholder={<div className='absolute top-0 left-0 text-slate-100'>{placeholder}</div>}
          ErrorBoundary={LexicalErrorBoundary}
        />
        <FormPlugin onCancel={onFormCancel} onChange={onFormChange} onSubmit={onFormSubmit} />
        <CodePlugin preventTabFocusChange={preventTabFocusChange} />
        <CodeCompletionPlugin
          dataTestId={dataTestId ? `${dataTestId}-CodeTypeAhead` : undefined}
          dataTestName={dataTestName ? `${dataTestName}-CodeTypeAhead` : undefined}
        />
      </div>
    </LexicalComposer>
  );
};

const CodeEditorForwardRef = forwardRef<ImperativeHandle, Props>((props: Props, ref: ForwardedRef<ImperativeHandle>) =>
  createElement(CodeEditor, { ...props, forwardedRef: ref }),
);
CodeEditorForwardRef.displayName = 'ForwardRef<CodeEditor>';

export default CodeEditorForwardRef;

const createInitialConfig = (code: string, editable: boolean) => ({
  editable,
  editorState: () => {
    const root = $getRoot();
    if (root.getFirstChild() === null) {
      const tokens = parseTokens(code);
      if (tokens !== null) {
        const node = parsedTokensToCodeTextNode(tokens);
        root.append(node);
      }
    }
  },
  namespace: 'CodeEditor',
  nodes: NODES,
  onError: (error: Error) => {
    throw error;
  },
  theme: LexicalTheme,
});

// The Code editor has its own built-in styling.
// It does not rely on Lexical's rich text theme.
const LexicalTheme = {};
