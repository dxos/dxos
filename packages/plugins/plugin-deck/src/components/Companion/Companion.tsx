//
// Copyright 2026 DXOS.org
//

import React, { type ReactNode, useMemo } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { type Node } from '@dxos/plugin-graph';
import { type ThemedClassName, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { getLinkedVariant } from '@dxos/react-ui-attention';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';

import { type PaneTab, Pane } from '../Pane';

//
// Companion
//
// A higher-level companion pane bound to a set of companion {@link Node}s: a {@link Pane} whose toolbar
// holds the companion tab strip and whose body renders the companions' content Surfaces. All panels stay
// mounted (inactive hidden) so switching tabs preserves each companion's state. Shares attention with the
// primary plank via `attendableId`. Controls (e.g. close) are supplied by the container.
//

export type CompanionProps = ThemedClassName<{
  companions: Node.Node[];
  /** Selected companion id. */
  value?: string;
  onValueChange?: (id: string) => void;
  /** Primary plank attendable id; the companion shares its attention. */
  attendableId?: string;
  /** Primary plank subject; companion Article surfaces filter on (and operate against) `companionTo`. */
  companionTo?: unknown;
  /** Toolbar controls rendered after the tabs (e.g. close). */
  controls?: ReactNode;
}>;

export const Companion = ({
  classNames,
  companions,
  value,
  onValueChange,
  attendableId,
  companionTo,
  controls,
}: CompanionProps) => {
  const { t } = useTranslation(meta.profile.key);

  // Fall back to the first companion when uncontrolled so a panel is always visible.
  const selected = value ?? companions[0]?.id;
  const tabs = useMemo<PaneTab[]>(
    () =>
      companions.map((node) => ({
        id: node.id,
        icon: node.properties?.icon ?? 'ph--circle-dashed--regular',
        label: toLocalizedString(node.properties?.label ?? '', t),
      })),
    [companions, t],
  );

  return (
    <Pane.Root classNames={classNames}>
      <Pane.Toolbar>
        <Pane.Tabs tabs={tabs} value={selected} onValueChange={onValueChange} attendableId={attendableId} related />
        {controls}
      </Pane.Toolbar>
      {/* Panels stay mounted; the inactive ones are hidden so switching companions preserves their state. */}
      {companions.map((node) => (
        <Pane.Content key={node.id} classNames={mx(node.id !== selected && 'hidden')}>
          <Surface.Surface
            type={AppSurface.Article}
            data={{
              attendableId,
              subject: node.data,
              companionTo,
              variant: getLinkedVariant(node.id),
              properties: node.properties,
            }}
            limit={1}
          />
        </Pane.Content>
      ))}
    </Pane.Root>
  );
};
