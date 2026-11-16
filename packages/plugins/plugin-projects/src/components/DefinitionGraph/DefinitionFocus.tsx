//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import * as Hooks from '@dxos/react-ui/Hooks';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Status from '@dxos/react-ui/Status';

import { ProjectsNamespace } from '../../namespace.ts';
import { type DefinitionModel } from '../SpecModel/index.ts';
import { DefinitionRelated } from './DefinitionRelated.tsx';
import { nearestDefinition } from './nearest-definition.ts';
import { type DefinitionViewOptions, useDefinitionView } from './useDefinitionView.ts';

export type DefinitionFocusProps = DefinitionViewOptions & {
  /** The offset in `content` of the editor's cursor. */
  cursor?: number;
  /** An external block opens its spec or code; a local one is shown in the spec. */
  onActivate?: (definition: DefinitionModel) => void;
};

/**
 * The block nearest the editor's cursor and everything it touches, following the cursor as it moves. A card clicked
 * takes the centre until the cursor moves again.
 */
export const DefinitionFocus = ({ content, cursor, onActivate, ...options }: DefinitionFocusProps) => {
  const { t } = Hooks.useTranslation(ProjectsNamespace.key);
  const { view, edges, decisions } = useDefinitionView({ content, ...options });
  const nearest = useMemo(
    () => (cursor === undefined ? undefined : nearestDefinition(content, cursor, (id) => view.byId.has(id))),
    [content, cursor, view],
  );
  // A pick holds only while the block nearest the cursor is the one it was made from.
  const [picked, setPicked] = useState<{ id: string; from?: string }>();
  const focus = picked && picked.from === nearest ? picked.id : nearest;
  const handleOpen = useCallback(
    (id: string) => {
      const definition = view.byId.get(id);
      if (definition?.external) {
        onActivate?.(definition);
      } else if (definition) {
        setPicked({ id, from: nearest });
      }
    },
    [view, nearest, onActivate],
  );
  const handleShow = useCallback(
    (id: string) => {
      const definition = view.byId.get(id);
      definition && onActivate?.(definition);
    },
    [view, onActivate],
  );

  if (focus === undefined) {
    return (
      <Status.Empty classNames='dx-fill' data-testid='definition-focus.empty'>
        {t('definition-focus.empty.message')}
      </Status.Empty>
    );
  }

  return (
    <ScrollArea.Root orientation='vertical' classNames='dx-fill' data-testid='definition-focus'>
      <ScrollArea.Viewport classNames='p-2'>
        <DefinitionRelated
          view={view}
          edges={edges}
          decisions={decisions}
          focus={focus}
          onOpen={handleOpen}
          onShow={onActivate && handleShow}
        />
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  );
};
