//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';

import { type Parser } from '@dxos/nlp';
import {
  Button,
  IconButton,
  Input,
  Panel,
  ScrollArea,
  Select,
  type ThemedClassName,
  Toolbar,
  useThemeContext,
} from '@dxos/react-ui';
import { Editor } from '@dxos/react-ui-editor';
import { Empty } from '@dxos/react-ui-list';
import {
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  pos,
} from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';

export type InputMode = 'document' | 'dataset' | 'record';

/** A message preview row shown for a selected dataset. */
export type InputDatasetMessage = {
  id: string;
  from: string;
  subject: string;
  preview: string;
};

/** A named input dataset (e.g. a sample inbox) the user can feed to the pipeline. */
export type InputDataset = {
  id: string;
  label: string;
  messages: InputDatasetMessage[];
};

/** The current input handed to the pipeline when the user runs it. */
export type InputPayload =
  | { mode: 'document'; text: string }
  | { mode: 'dataset'; datasetId: string }
  | { mode: 'record'; transcript: string };

export type InputPanelProps = ThemedClassName<{
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
  initialDocument = '',
  parse,
  datasets = [],
  sampleTranscript = '',
  busy,
  defaultDatasetCount = 100,
  onLoadDataset,
  onInput,
}: InputPanelProps) => {
  const { themeMode } = useThemeContext();
  const [mode, setMode] = useState<InputMode>('document');
  const [text, setText] = useState(initialDocument);
  const [underline, setUnderline] = useState(false);
  const [datasetId, setDatasetId] = useState(datasets[0]?.id ?? '');
  const [count, setCount] = useState(defaultDatasetCount);
  const [transcript, setTranscript] = useState('');

  // Report the active tab's input so the pipeline column can run it (the run trigger lives there).
  useEffect(() => {
    switch (mode) {
      case 'document':
        return onInput?.({ mode: 'document', text });
      case 'dataset':
        return onInput?.({ mode: 'dataset', datasetId });
      case 'record':
        return onInput?.({ mode: 'record', transcript: transcript || sampleTranscript });
    }
  }, [mode, text, datasetId, transcript, sampleTranscript, onInput]);

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

  const dataset = datasets.find((item) => item.id === datasetId) ?? datasets[0];

  return (
    <Panel.Root classNames={classNames}>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Button variant={mode === 'document' ? 'primary' : 'ghost'} onClick={() => setMode('document')}>
            Document
          </Button>
          <Button variant={mode === 'dataset' ? 'primary' : 'ghost'} onClick={() => setMode('dataset')}>
            Dataset
          </Button>
          <Button variant={mode === 'record' ? 'primary' : 'ghost'} onClick={() => setMode('record')}>
            Record
          </Button>
          <div role='none' className='grow' />
          {mode === 'document' && parse && (
            <Input.Root>
              <div className='flex items-center gap-2 px-2'>
                <Input.Switch checked={underline} onCheckedChange={(checked) => setUnderline(checked === true)} />
                <Input.Label classNames='text-sm text-description'>POS</Input.Label>
              </div>
            </Input.Root>
          )}
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content classNames='min-h-0'>
        {mode === 'document' && (
          <Editor.Root>
            <Editor.View value={text} onChange={setText} extensions={extensions} />
          </Editor.Root>
        )}

        {mode === 'dataset' && (
          <Panel.Root>
            <Panel.Toolbar asChild>
              <Toolbar.Root>
                <Select.Root value={datasetId} onValueChange={setDatasetId}>
                  <Select.TriggerButton placeholder='Dataset' />
                  <Select.Portal>
                    <Select.Content>
                      <Select.Viewport>
                        {datasets.map((item) => (
                          <Select.Option key={item.id} value={item.id}>
                            {item.label}
                          </Select.Option>
                        ))}
                      </Select.Viewport>
                      <Select.Arrow />
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
                {onLoadDataset && (
                  <>
                    <div role='none' className='grow' />
                    <Input.Root>
                      <Input.TextInput
                        type='number'
                        min={1}
                        value={String(count)}
                        onChange={(event) => setCount(Math.max(1, Number(event.target.value) || 1))}
                        classNames='w-20'
                      />
                    </Input.Root>
                    <Button disabled={busy} onClick={() => onLoadDataset(count)}>
                      Load
                    </Button>
                  </>
                )}
              </Toolbar.Root>
            </Panel.Toolbar>
            <Panel.Content asChild>
              <ScrollArea.Root padding>
                <ScrollArea.Viewport classNames='flex flex-col gap-2 py-1'>
                  {!dataset || dataset.messages.length === 0 ? (
                    <Empty label='No messages.' />
                  ) : (
                    dataset.messages.map((message) => (
                      <div
                        key={message.id}
                        className='flex flex-col min-w-0 bg-card-surface border border-subdued-separator rounded-sm px-3 py-2'
                      >
                        <span className='font-medium truncate'>{message.subject}</span>
                        <span className='text-sm text-description truncate'>{message.from}</span>
                        <span className='text-sm truncate'>{message.preview}</span>
                      </div>
                    ))
                  )}
                </ScrollArea.Viewport>
              </ScrollArea.Root>
            </Panel.Content>
          </Panel.Root>
        )}

        {mode === 'record' && (
          <div className='flex flex-col gap-3 p-3 h-full'>
            <IconButton
              icon={transcript ? 'ph--microphone-slash--regular' : 'ph--microphone--regular'}
              label={transcript ? 'Clear recording' : 'Record'}
              onClick={() => setTranscript((current) => (current ? '' : sampleTranscript))}
            />
            <span className='text-sm text-description'>
              {transcript ? 'Captured transcript (sample):' : 'Tap the mic to capture a sample transcript.'}
            </span>
            {transcript && (
              <div
                className={mx(
                  'whitespace-pre-wrap text-sm bg-card-surface border border-subdued-separator rounded-sm p-2',
                )}
              >
                {transcript}
              </div>
            )}
          </div>
        )}
      </Panel.Content>
    </Panel.Root>
  );
};
