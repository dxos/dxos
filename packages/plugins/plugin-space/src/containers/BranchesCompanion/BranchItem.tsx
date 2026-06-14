//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { IconButton, ListItem, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';

export type BranchItemProps = {
  /** Branch name; `'main'` is the implicit trunk. */
  name: string;
  /** Whether this is the branch the device currently views. */
  current: boolean;
  /** Switch the subtree to this branch (no-op affordance when it is already current). */
  onSwitch: (name: string) => void;
  /** Fold this branch back into `'main'`. */
  onMerge: (name: string) => void;
  /** Delete this branch. */
  onDelete: (name: string) => void;
};

/**
 * A single branch row: name plus switch / merge / delete controls. Pure and presentational — the
 * affordance rules are intrinsic to the branch (`'main'` cannot be merged or deleted; the current
 * branch cannot be switched to or deleted) so the row is self-describing and the parent only wires
 * handlers.
 */
export const BranchItem = ({ name, current, onSwitch, onMerge, onDelete }: BranchItemProps) => {
  const { t } = useTranslation(meta.id);
  const isMain = name === 'main';
  return (
    <ListItem.Root classNames='items-center gap-1' aria-current={current ? 'true' : undefined}>
      <ListItem.Heading classNames={mx('grow pli-2', current && 'text-accentText')}>
        {isMain ? t('branch-main.label') : name}
      </ListItem.Heading>
      <ListItem.Endcap asChild>
        <IconButton
          iconOnly
          variant='ghost'
          icon={current ? 'ph--check-circle--regular' : 'ph--circle--regular'}
          label={t(current ? 'branch-current.label' : 'branch-switch.label')}
          disabled={current}
          onClick={() => onSwitch(name)}
        />
      </ListItem.Endcap>
      <ListItem.Endcap asChild>
        <IconButton
          iconOnly
          variant='ghost'
          icon='ph--git-merge--regular'
          label={t('branch-merge.label')}
          disabled={isMain}
          onClick={() => onMerge(name)}
        />
      </ListItem.Endcap>
      <ListItem.Endcap asChild>
        <IconButton
          iconOnly
          variant='ghost'
          icon='ph--trash--regular'
          label={t('branch-delete.label')}
          disabled={isMain || current}
          onClick={() => onDelete(name)}
        />
      </ListItem.Endcap>
    </ListItem.Root>
  );
};
