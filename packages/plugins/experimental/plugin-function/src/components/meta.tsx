//
// Copyright 2024 DXOS.org
//

import React, { type FC } from 'react';

import { GameType } from '@dxos/chess-app';
import { create } from '@dxos/echo-schema';
import { type FunctionTrigger } from '@dxos/functions/types';
import { ChainPresets, chainPresets, PromptTemplate } from '@dxos/plugin-chain';
import { type ChainPromptType } from '@dxos/plugin-chain/types';
import { FileType } from '@dxos/plugin-ipfs/types';
import { DocumentType } from '@dxos/plugin-markdown';
import { DiagramType } from '@dxos/plugin-sketch/types';
import { CollectionType, MessageType } from '@dxos/plugin-space';
import { Input } from '@dxos/react-ui';
import { safeParseInt } from '@dxos/util';

import { InputRow } from './Form';

type TriggerId = string;

const stateInitialValues = {
  schemas: [
    // TODO(burdon): Get all schema from API.
    DocumentType,
    FileType,
    GameType,
    MessageType,
    DiagramType,
    CollectionType,
  ] as any[],
  selectedSchema: {} as Record<TriggerId, any>,
};

// TODO(burdon): ???
export const state = create<typeof stateInitialValues>(stateInitialValues);

//
// Trigger meta.
// TODO(burdon): Custom/generated UX to provide values to functions from types/other metadata.
//

type MetaProps<T> = { meta: T } & { triggerId?: string };
type MetaExtension<T> = {
  initialValue?: () => T;
  component: FC<MetaProps<T>>;
};

/**
 * Create meta type from function.
 * @param trigger
 */
export const getMeta = (trigger: FunctionTrigger): MetaExtension<any> | undefined => {
  // TODO(burdon): Currently matches hardcoded function uri.
  return trigger?.function ? metaExtensions[trigger.function] : undefined;
};

//
// Default (generic).
// TODO(burdon): Create property editor.
//

type DefaultMeta = {};

const DefaultMetaProps = ({ meta }: MetaProps<DefaultMeta>) => {
  return <></>;
};

//
// Chess
//

type ChessMeta = { level?: number };

const ChessMetaProps = ({ meta }: MetaProps<ChessMeta>) => {
  return (
    <>
      <InputRow label='Level'>
        <Input.TextInput
          type='number'
          value={meta.level ?? 1}
          onChange={(event) => (meta.level = safeParseInt(event.target.value))}
          placeholder='Engine strength.'
        />
      </InputRow>
    </>
  );
};

//
// Email
//

type EmailWorkerMeta = { account?: string };

const EmailWorkerMetaProps = ({ meta }: MetaProps<EmailWorkerMeta>) => {
  return (
    <>
      <InputRow label='Account'>
        <Input.TextInput
          value={meta.account ?? ''}
          onChange={(event) => (meta.account = event.target.value)}
          placeholder='https://'
        />
      </InputRow>
    </>
  );
};

//
// Chain
//

type ChainPromptMeta = { model?: string; prompt?: ChainPromptType };

const ChainPromptMetaProps = ({ meta, triggerId }: MetaProps<ChainPromptMeta>) => {
  const schema = triggerId ? state.selectedSchema[triggerId] : undefined;
  return (
    <>
      <InputRow label='Model'>
        <Input.TextInput
          value={meta.model ?? ''}
          onChange={(event) => (meta.model = event.target.value)}
          placeholder='llama2'
        />
      </InputRow>
      <InputRow label='Presets'>
        <ChainPresets
          presets={chainPresets}
          onSelect={(preset) => {
            // TODO(burdon): Throws.
            meta.prompt = preset.createPrompt();
          }}
        />
      </InputRow>
      {meta.prompt && (
        <InputRow label='Prompt'>
          <PromptTemplate prompt={meta.prompt} schema={schema} />
        </InputRow>
      )}
    </>
  );
};

//
// Embedding
//

type EmbeddingMeta = { model?: string; prompt?: ChainPromptType };

const EmbeddingMetaProps = ({ meta }: MetaProps<EmbeddingMeta>) => {
  return (
    <>
      <InputRow label='Model'>
        <Input.TextInput
          value={meta.model ?? ''}
          onChange={(event) => (meta.model = event.target.value)}
          placeholder='llama2'
        />
      </InputRow>
    </>
  );
};

const metaExtensions: Record<string, MetaExtension<any>> = {
  __DEFAULT__: {
    initialValue: () => ({}),
    component: DefaultMetaProps,
  } satisfies MetaExtension<DefaultMeta>,

  'dxos.org/function/chess': {
    initialValue: () => ({ level: 2 }),
    component: ChessMetaProps,
  } satisfies MetaExtension<ChessMeta>,

  'dxos.org/function/email-worker': {
    initialValue: () => ({ account: 'hello@dxos.network' }),
    component: EmailWorkerMetaProps,
  } satisfies MetaExtension<EmailWorkerMeta>,

  'dxos.org/function/gpt': {
    initialValue: () => ({ model: 'llama2' }),
    component: ChainPromptMetaProps,
  } satisfies MetaExtension<ChainPromptMeta>,

  'dxos.org/function/embedding': {
    initialValue: () => ({ model: 'llama2' }),
    component: EmbeddingMetaProps,
  } satisfies MetaExtension<EmbeddingMeta>,
};