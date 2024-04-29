//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { type ChainType } from '@braneframe/types';
import { getSpace } from '@dxos/react-client/echo';
import { DensityProvider, Main, Select, useTranslation } from '@dxos/react-ui';
import { baseSurface, mx, textBlockWidth, topbarBlockPaddingStart } from '@dxos/react-ui-theme';
import { nonNullable } from '@dxos/util';

import { PromptTemplate, Section } from './PromptTemplate';
import { CHAIN_PLUGIN } from '../meta';
import { type Preset, presets } from '../presets';

const ChainMain: FC<{ chain: ChainType }> = ({ chain }) => {
  const space = getSpace(chain);
  if (!space) {
    return null;
  }

  const handleSelectPreset = (preset: Preset) => {
    chain.title = preset.title;
    chain.prompts.filter(nonNullable).forEach((p) => space.db.remove(p));
    chain.prompts = [preset.prompt()];
  };

  return (
    <Main.Content classNames={[baseSurface, topbarBlockPaddingStart]}>
      <div role='none' className={mx(textBlockWidth, 'pli-2')}>
        <div className='flex flex-col my-2'>
          {chain.prompts.filter(nonNullable).map((prompt, i) => (
            <PromptTemplate key={i} prompt={prompt} />
          ))}
        </div>
        <Presets presets={presets} onSelect={handleSelectPreset} />
      </div>
    </Main.Content>
  );
};

const Presets: FC<{ presets: Preset[]; onSelect: (preset: Preset) => void }> = ({ presets, onSelect }) => {
  const { t } = useTranslation(CHAIN_PLUGIN);

  return (
    <DensityProvider density='fine'>
      <Section title='Presets'>
        <div className='p-2'>
          <Select.Root
            onValueChange={(value) => {
              onSelect(presets.find(({ id }) => id === value)!);
            }}
          >
            <Select.TriggerButton placeholder={t('select preset template placeholder')} />
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
        </div>
      </Section>
    </DensityProvider>
  );
};

export default ChainMain;
