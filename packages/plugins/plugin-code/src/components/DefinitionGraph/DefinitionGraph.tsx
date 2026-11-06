//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Hooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';

import { CodeNamespace } from '../../namespace.ts';
import { type DefinitionModel } from '../SpecModel/index.ts';
import { DefinitionCanvas } from './DefinitionCanvas.tsx';
import { type DefinitionViewOptions, useDefinitionView } from './useDefinitionView.ts';

export type DefinitionGraphProps = DefinitionViewOptions & {
  /** An external block opens its spec or code; a local one is shown in the spec. */
  onActivate?: (definition: DefinitionModel) => void;
};

/**
 * A spec's definitions on a canvas, grouped by what names them. Its levels nest: the clusters, one cluster's groups,
 * then a block, each drilled into by double-clicking its card, with the canvas's own trail back up.
 */
export const DefinitionGraph = ({ onActivate, ...options }: DefinitionGraphProps) => {
  const { t } = Hooks.useTranslation(CodeNamespace.key);
  const { view, edges } = useDefinitionView(options);
  return (
    <Layout.Flex column classNames='dx-fill' data-testid='definition-graph'>
      <p className='px-2 py-1 text-xs text-description' data-testid='definition-graph.hint'>
        {t('definition-graph.hint')}
      </p>
      <DefinitionCanvas view={view} edges={edges} onActivate={onActivate} />
    </Layout.Flex>
  );
};
