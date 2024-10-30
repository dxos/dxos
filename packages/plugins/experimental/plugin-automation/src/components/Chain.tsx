//
// Copyright 2024 DXOS.org
//

import React, { type FC } from 'react';

import { getSpace } from '@dxos/react-client/echo';
import { Select, useTranslation } from '@dxos/react-ui';
import { nonNullable } from '@dxos/util';

import { AUTOMATION_PLUGIN } from '../meta';
import { chainPresets, type Preset } from '../presets';
import { type ChainType } from '../types';
import { PromptTemplate, Section } from './PromptTemplate';

export type ChainProps = {
  chain: ChainType;
};

export const Chain = ({ chain }: ChainProps) => {
  const space = getSpace(chain);
  if (!space) {
    return null;
  }

  const handleSelectPreset = (preset: Preset) => {
    chain.name = preset.title;
    // TODO(burdon): API issue.
    chain.prompts?.filter(nonNullable).forEach((prompt) => space.db.remove(prompt));
    chain.prompts = [preset.createPrompt()];
  };

  return (
    <div className='flex flex-col my-2 gap-4'>
      {chain.prompts?.filter(nonNullable).map((prompt, i) => <PromptTemplate key={i} prompt={prompt} />)}
      <Section title='Presets'>
        <div className='p-2'>
          <ChainPresets presets={chainPresets} onSelect={handleSelectPreset} />
        </div>
      </Section>
    </div>
  );
};

export const ChainPresets: FC<{ presets: Preset[]; onSelect: (preset: Preset) => void }> = ({ presets, onSelect }) => {
  const { t } = useTranslation(AUTOMATION_PLUGIN);

  return (
    <Select.Root
      onValueChange={(value) => {
        onSelect(presets.find(({ id }) => id === value)!);
      }}
    >
      <Select.TriggerButton classNames='w-full' placeholder={t('select preset template placeholder')} />
      <Select.Portal>
        <Select.Content>
          <Select.Viewport>
            {presets.map(({ id, title }) => (
              <Select.Option key={id} value={id}>
                {title}
              </Select.Option>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
};
