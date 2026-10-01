//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';

import { type Parser } from '@dxos/nlp';
import { Next, type ThemedClassName } from '@dxos/react-ui';
import { Editor } from '@dxos/react-ui-editor';
import {
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  pos,
} from '@dxos/ui-editor';

export type InputMode = 'document' | 'dataset' | 'record';

/** A message preview row shown for a selected dataset. */
export type InputDatasetMessage = {
  id: string;
  from: string;
  subject: string;
  body: string;
};

/** A named input dataset (e.g. a sample inbox) the user can feed to the pipeline. */
export type InputDataset = {
  id: string;
  label: string;
  messages: InputDatasetMessage[];
};

/** The current input handed to the pipeline when the user runs it. */
export type InputPayload =
  | {
      mode: 'document';
      text: string;
    }
  | {
      mode: 'dataset';
      datasetId: string;
    }
  | {
      mode: 'record';
      transcript: string;
    };

export type InputPanelProps = ThemedClassName<{
  /** The active input tab (controlled, so the parent can keep it in sync with the selected pipeline). */
  mode: InputMode;
  /** Switch the active input tab. */
  onModeChange: (mode: InputMode) => void;
  /** Initial markdown for the Document tab (component owns subsequent edits). */
  initialDocument?: string;
  /** POS tagger wired into the Document editor's `pos` decoration; omit to disable. */
  parse?: Parser;
  /** Datasets offered in the Dataset tab. */
  datasets?: InputDataset[];
  /** Canned transcript the Record tab captures (real audio capture is out of scope for this harness). */
  sampleTranscript?: string;
  /** Disables the dataset loader while a run is in flight. */
  busy?: boolean;
  /** Default message count for the Dataset tab's loader. */
  defaultDatasetCount?: number;
  /** Load the first N messages of a remote dataset (e.g. Enron) into the Dataset tab. */
  onLoadDataset?: (count: number) => void;
  /** Reports the current input (active tab + value) so the pipeline column can run it. */
  onInput?: (payload: InputPayload) => void;
}>;

/**
 * Inputs column: a tabbed source selector feeding the pipeline — a markdown Document editor (with POS
 * decorations), a Dataset picker (sample inbox → message previews), and a Record tab whose mic button
 * captures a transcript. The toolbar's run trigger hands the active tab's input to the parent.
 */
export const InputPanel = ({
  classNames,
  mode,
  onModeChange,
  initialDocument = '',
  parse,
  datasets = [],
  sampleTranscript = '',
  busy,
  defaultDatasetCount = 100,
  onLoadDataset,
  onInput,
}: InputPanelProps) => {
  const themeMode = Next.useThemeMode();
  const [text, setText] = useState(initialDocument);
  const [underline, setUnderline] = useState(false);
  const [datasetId, setDatasetId] = useState(datasets[0]?.id ?? '');
  const [count, setCount] = useState(defaultDatasetCount);
  const [transcript, setTranscript] = useState('');

  // The effective dataset — falls back to the first when `datasetId` hasn't caught up (e.g. datasets
  // loaded after mount). Both the Select display and the emitted payload use this, so they can't desync.
  const dataset = datasets.find((item) => item.id === datasetId) ?? datasets[0];

  // Report the active tab's input so the pipeline column can run it (the run trigger lives there).
  useEffect(() => {
    switch (mode) {
      case 'document':
        return onInput?.({ mode: 'document', text });
      case 'dataset':
        return onInput?.({ mode: 'dataset', datasetId: dataset?.id ?? '' });
      case 'record':
        return onInput?.({ mode: 'record', transcript: transcript || sampleTranscript });
    }
  }, [mode, text, dataset, transcript, sampleTranscript, onInput]);

  const extensions = useMemo(
    () => [
      createBasicExtensions({ lineWrapping: true }),
      createThemeExtensions({ themeMode }),
      createMarkdownExtensions(),
      decorateMarkdown(),
      ...(parse ? [pos({ parse, popover: true, underline })] : []),
    ],
    [themeMode, parse, underline],
  );

  return (
    <Next.Panel.Root classNames={classNames}>
      <Next.Panel.Header>
        <Next.Toolbar.Root>
          <Next.Button variant={mode === 'document' ? 'primary' : 'ghost'} onClick={() => onModeChange('document')}>
            Document
          </Next.Button>
          <Next.Button variant={mode === 'dataset' ? 'primary' : 'ghost'} onClick={() => onModeChange('dataset')}>
            Dataset
          </Next.Button>
          <Next.Button variant={mode === 'record' ? 'primary' : 'ghost'} onClick={() => onModeChange('record')}>
            Record
          </Next.Button>
          <div className='grow' />
          {mode === 'document' && parse && (
            <Next.Field.Root>
              <div className='flex items-center gap-2 px-2'>
                <Next.Switch checked={underline} onCheckedChange={({ checked }) => setUnderline(checked === true)} />
                <Next.Field.Label classNames='text-sm text-description'>POS</Next.Field.Label>
              </div>
            </Next.Field.Root>
          )}
        </Next.Toolbar.Root>
      </Next.Panel.Header>
      <Next.Panel.Body>
        {mode === 'document' && (
          <Editor.Root>
            <Editor.View classNames='p-2' value={text} onChange={setText} extensions={extensions} />
          </Editor.Root>
        )}

        {mode === 'dataset' && (
          <Next.Panel.Root>
            <Next.Panel.Header>
              <Next.Toolbar.Root>
                <Next.Select.Root
                  value={[dataset?.id ?? '']}
                  onValueChange={({ value: [value] }) => setDatasetId(value)}
                  items={datasets.map((item) => ({ value: item.id, label: item.label }))}
                >
                  <Next.Select.Trigger placeholder='Dataset' />
                  <Next.Select.Content>
                    {datasets.map((item) => (
                      <Next.Select.Item key={item.id} item={{ value: item.id, label: item.label }} />
                    ))}
                  </Next.Select.Content>
                </Next.Select.Root>
                {onLoadDataset && (
                  <>
                    <Next.Toolbar.Separator />
                    <Next.Field.Root>
                      <Next.Input
                        min={1}
                        value={String(count)}
                        onChange={(event) => setCount(Math.max(1, Number(event.target.value) || 1))}
                        classNames='w-20'
                        type='number'
                      />
                    </Next.Field.Root>
                    <Next.Button disabled={busy} onClick={() => onLoadDataset(count)}>
                      Load
                    </Next.Button>
                  </>
                )}
              </Next.Toolbar.Root>
            </Next.Panel.Header>
            <Next.Panel.Body asChild>
              <Next.ScrollArea.Root>
                <Next.ScrollArea.Viewport classNames='flex flex-col gap-2 py-1'>
                  {!dataset || dataset.messages.length === 0 ? (
                    <Next.Empty>No messages.</Next.Empty>
                  ) : (
                    dataset.messages.map((message) => (
                      <div
                        key={message.id}
                        className='flex flex-col min-w-0 dx-card-surface border border-subdued-separator rounded-sm px-3 py-2'
                      >
                        <div className='font-medium truncate'>{message.subject}</div>
                        <div className='text-sm text-description truncate'>{message.from}</div>
                        <div className='text-sm line-clamp-3'>{message.body}</div>
                      </div>
                    ))
                  )}
                </Next.ScrollArea.Viewport>
              </Next.ScrollArea.Root>
            </Next.Panel.Body>
          </Next.Panel.Root>
        )}

        {mode === 'record' && (
          <Next.Panel.Root>
            <Next.Panel.Header>
              <Next.Toolbar.Root>
                <Next.Button
                  icon={transcript ? 'ph--microphone-slash--regular' : 'ph--microphone--regular'}
                  label={transcript ? 'Clear recording' : 'Record'}
                  onClick={() => setTranscript((current) => (current ? '' : sampleTranscript))}
                />
              </Next.Toolbar.Root>
            </Next.Panel.Header>
            <Next.Panel.Body>
              {transcript && (
                <Editor.Root>
                  <Editor.View classNames='p-2' value={transcript} extensions={extensions} />
                </Editor.Root>
              )}
            </Next.Panel.Body>
          </Next.Panel.Root>
        )}
      </Next.Panel.Body>
    </Next.Panel.Root>
  );
};
