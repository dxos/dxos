//
// Copyright 2024 DXOS.org
//
import React from 'react';

import { Dialog } from '@dxos/react-ui';
import { getSize } from '@dxos/react-ui-theme';
import { withTheme } from '@dxos/storybook-utils';

import { Tabs as NaturalTabs } from './Tabs';

const content = {
  t1: {
    title: 'Rig Veda',
    panel:
      "Muse about Rig Veda finite but unbounded Drake Equation star stuff harvesting star light not a sunrise but a galaxyrise. Invent the universe bits of moving fluff courage of our questions from which we spring radio telescope kindling the energy hidden in matter. Globular star cluster another world globular star cluster emerged into consciousness invent the universe extraordinary claims require extraordinary evidence. A very small stage in a vast cosmic arena with pretty stories for which there's little good evidence two ghostly white figures in coveralls and helmets are softly dancing vanquish the impossible white dwarf across the centuries.",
  },
  t2: {
    title: 'Sea of Tranquility',
    panel:
      "Another world take root and flourish prime number venture rings of Uranus Sea of Tranquility? Shores of the cosmic ocean kindling the energy hidden in matter a still more glorious dawn awaits gathered by gravity Orion's sword something incredible is waiting to be known. With pretty stories for which there's little good evidence a mote of dust suspended in a sunbeam across the centuries a mote of dust suspended in a sunbeam a very small stage in a vast cosmic arena preserve and cherish that pale blue dot.",
  },
  t3: {
    title: 'Apollonius of Perga',
    panel:
      'Invent the universe not a sunrise but a galaxyrise rings of Uranus astonishment kindling the energy hidden in matter prime number. Rogue Apollonius of Perga shores of the cosmic ocean a very small stage in a vast cosmic arena cosmic fugue extraordinary claims require extraordinary evidence. A mote of dust suspended in a sunbeam vastness is bearable only through love are creatures of the cosmos concept of the number one rich in mystery stirred by starlight?',
  },
};

export default {
  title: 'react-ui-tabs/Tabs',
  component: NaturalTabs.Root,
  decorators: [withTheme],
  // parameters: { translations },
};

export const Tabs = {
  render: () => {
    return (
      <Dialog.Root open>
        <Dialog.Overlay blockAlign='start'>
          <Dialog.Content classNames='is-[calc(100dvw-4rem)] !max-is-full'>
            <NaturalTabs.Root orientation='vertical' defaultValue={Object.keys(content)[0]}>
              <NaturalTabs.Viewport>
                <NaturalTabs.Tablist>
                  {Object.entries(content).map(([id, { title }]) => {
                    return (
                      <NaturalTabs.Tab key={id} value={id}>
                        {title}
                      </NaturalTabs.Tab>
                    );
                  })}
                </NaturalTabs.Tablist>
                {Object.entries(content).map(([id, { panel }]) => {
                  return (
                    <NaturalTabs.Tabpanel key={id} value={id} classNames='m-1'>
                      <NaturalTabs.BackButton density='fine' classNames='is-full gap-2 text-start @md:hidden mbe-2'>
                        <svg className={getSize(4)}>
                          <use href='/icons.svg#ph--arrow-left--bold' />
                        </svg>
                        <span>Back to tab list</span>
                      </NaturalTabs.BackButton>
                      <p className='pli-1'>{panel}</p>
                    </NaturalTabs.Tabpanel>
                  );
                })}
              </NaturalTabs.Viewport>
            </NaturalTabs.Root>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Root>
    );
  },
};
