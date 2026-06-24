//
// Copyright 2026 DXOS.org
//

import React, { type ReactNode, useMemo } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface, AttentionSigil, type AttentionSigilAction } from '@dxos/app-toolkit/ui';
import { type Node } from '@dxos/plugin-graph';
import { Icon, type ThemedClassName, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { useAttentionAttributes } from '@dxos/react-ui-attention';

import { meta } from '#meta';

import { Pane } from '../Pane';

export type PlankProps = ThemedClassName<{
  node: Node.Node;
  /** Attendable id; defaults to the node id. */
  attendableId?: string;
  /** Grouped sigil menu actions; when present the sigil opens a menu, otherwise it is a plain button. */
  actions?: AttentionSigilAction[][];
  onAction?: (action: AttentionSigilAction) => void;
  /** Toolbar controls rendered after the title (e.g. close/solo/fullscreen). */
  controls?: ReactNode;
}>;

/**
 * A higher-level deck pane bound to a graph {@link Node}: renders the node's sigil, title and content
 * Surface inside a {@link Pane}, and makes itself the node's attendable region. Toolbar controls
 * (close/solo/etc.) are supplied by the container as `controls` so this component stays free of
 * capabilities/operations.
 */
export const Plank = ({ node, attendableId = node.id, actions, onAction, controls, classNames }: PlankProps) => {
  const { t } = useTranslation(meta.profile.key);
  const attentionAttrs = useAttentionAttributes(attendableId);
  const icon = node.properties?.icon ?? 'ph--circle-dashed--regular';
  const label = toLocalizedString(node.properties?.label ?? '', t);
  const surfaceData = useMemo<AppSurface.ArticleData>(
    () => ({ attendableId, subject: node.data, properties: node.properties }),
    [attendableId, node.data, node.properties],
  );

  return (
    <Pane.Root classNames={classNames} tabIndex={0} {...attentionAttrs}>
      <Pane.Toolbar>
        {actions && actions.length > 0 ? (
          <AttentionSigil
            icon={icon}
            attendableId={attendableId}
            actions={actions}
            onAction={onAction}
            triggerLabel={label}
          />
        ) : (
          <Pane.Sigil attendableId={attendableId}>
            <span className='sr-only'>{label}</span>
            <Icon icon={icon} />
          </Pane.Sigil>
        )}
        <Pane.Title attendableId={attendableId}>{label}</Pane.Title>
        {controls}
      </Pane.Toolbar>
      <Pane.Content>
        <Surface.Surface type={AppSurface.Article} data={surfaceData} limit={1} />
      </Pane.Content>
    </Pane.Root>
  );
};
