//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';

import { Iri, Model } from '#graph';
import { translations } from '#translations';

import { NodeDetails, type NodeDetailsProps } from './NodeDetails.tsx';

const pkg = (name: string) => `${Iri.PACKAGE}@dxos/${name}`;

const meta: Meta<NodeDetailsProps> = {
  title: 'plugins/plugin-code-graph/components/NodeDetails',
  component: NodeDetails,
  render: (args) => (
    <div className='relative dx-fill'>
      <NodeDetails classNames='absolute top-2 right-2 bottom-2 w-96' {...args} />
    </div>
  ),
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { translations: [...translations, ...reactUiTranslations] },
};

export default meta;

/** A package's facts as the index reports them, including the duplicate `type` row it states twice. */
export const Default: StoryObj<typeof meta> = {
  args: {
    node: Model.makeNode(pkg('echo')),
    facts: [
      { predicate: 'rdf:type', object: 'deus:Package' },
      { predicate: 'rdf:type', object: 'deus:Package' },
      ...['async', 'effect', 'keys', 'log', 'util'].map((name) => ({
        predicate: 'deus:declaresDep',
        object: pkg(name),
      })),
    ],
    incoming: [
      { predicate: 'deus:usesPackage', count: 186 },
      { predicate: 'deus:declaresDep', count: 181 },
    ],
  },
};

const symbol = `${Iri.FILE}packages/plugins/plugin-code/src/types/CodeCapabilities.ts#SpecSync`;

/** A symbol: its name as the title, its class as the kind, and its definition highlighted above the facts. */
export const SymbolNode: StoryObj<typeof meta> = {
  args: {
    node: Model.makeNode(symbol, { label: 'CodeCapabilities.ts#SpecSync' }),
    kind: 'capability',
    facts: [
      { predicate: 'rdf:type', object: 'deus:Capability' },
      { predicate: 'rdf:type', object: 'deus:Symbol' },
      { predicate: 'deus:kind', object: 'variable' },
      {
        predicate: 'deus:snippet',
        object: [
          'export const SpecSync = Capability.makeSingleton<{',
          '  readonly state: Atom.Writable<SpecSyncState>;',
          '',
          '  readonly syncNow: () => void;',
          '}>()(`${meta.profile.key}.capability.specSync`);',
        ].join('\n'),
      },
      { predicate: 'deus:line', object: '89' },
    ],
    incoming: [{ predicate: 'deus:implDependsOn', count: 3 }],
  },
};

/** The index could not answer. */
export const Failed: StoryObj<typeof meta> = {
  args: {
    node: Model.makeNode(pkg('echo')),
    error: 'no code-index route at /api/code-index; run Composer under `vite dev` with CodeIndexVitePlugin',
  },
};
