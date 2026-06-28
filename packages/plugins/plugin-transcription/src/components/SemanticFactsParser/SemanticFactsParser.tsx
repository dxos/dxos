//
// Copyright 2026 DXOS.org
//

import React, { useRef, useState } from 'react';

import { Button, Panel, ScrollArea, Tag, Toolbar, type ThemedClassName } from '@dxos/react-ui';
import { type EditorController, Editor } from '@dxos/react-ui-editor';
import { type Type } from '@dxos/semantic-index';

import { SemanticFactsViewer } from '../SemanticFactsViewer/SemanticFactsViewer';

export type SemanticFactsParserProps = ThemedClassName<{
  /** Runs extraction over the editor text and resolves the generated facts. */
  onParse: (text: string) => Promise<Type.Fact[]>;
  initialText?: string;
}>;

/**
 * Interactive harness: an editor + Parse button that runs an extraction callback and renders the
 * resulting facts via {@link SemanticFactsViewer}. Presentational only — the caller supplies the
 * `onParse` engine (e.g. `extractFacts` over an `AiService`); this component holds no Effect/runtime.
 */
export const SemanticFactsParser = ({ classNames, onParse, initialText = '' }: SemanticFactsParserProps) => {
  const editorRef = useRef<EditorController>(null);
  const [facts, setFacts] = useState<Type.Fact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleParse = async () => {
    const text = editorRef.current?.getText() ?? '';
    setLoading(true);
    setError(null);
    try {
      const result = await onParse(text);
      setFacts(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Panel.Root classNames={classNames}>
      <Panel.Toolbar asChild>
        <Toolbar.Root classNames='justify-between'>
          <Button variant='primary' disabled={loading} onClick={handleParse}>
            {loading ? 'Parsing…' : 'Parse'}
          </Button>
          {error && <Tag hue='red'>{error}</Tag>}
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content asChild>
        <ScrollArea.Root orientation='vertical'>
          <ScrollArea.Viewport classNames='flex flex-col gap-4'>
            <Editor.Root ref={editorRef}>
              <Editor.View value={initialText} classNames='border border-separator rounded-sm p-2 min-bs-24' />
            </Editor.Root>
            <SemanticFactsViewer facts={facts} />
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Content>
    </Panel.Root>
  );
};
