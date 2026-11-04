//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { type KeyboardEvent, type MouseEvent, useCallback, useEffect, useRef } from 'react';

import { type Database, Filter, Obj, Query } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { useAttention, useAttentionAttributes } from '@dxos/react-ui-attention';
import * as UiHooks from '@dxos/react-ui/Hooks';
import { type ObjectLinkProps, handleBlockWidgetKey } from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';

import { Feature, FeatureEmbed } from '#types';

import { CodeNamespace } from '../../namespace.ts';
import { FeatureSection } from '../FeatureSection/index.ts';

const isId = Schema.is(Obj.ID);

/** Selected from the keyboard (focused itself, not a field inside it), the section rings like a focused control. */
const EMBED_SELECTED_RING =
  'group-focus-visible/embed:border-(--dx-focus-ring-color) group-focus-visible/embed:outline group-focus-visible/embed:outline-(--dx-focus-ring-color)';

/** The field of a new feature's section the cursor goes to. */
export type FeatureEmbedField = 'name' | 'description';

export type FeatureEmbedSectionProps = ObjectLinkProps & {
  db?: Database.Database;
  /** The editor's attendable id; the embed is attended beneath it. */
  attendableId?: string;
  /** For the feature `/feature` just made, once: the field that then takes the cursor. */
  claimFocus?: (id: string) => FeatureEmbedField | undefined;
};

/**
 * A feature embedded in a spec document, drawn as its editable section. Like any section embed it is inert until
 * attended, so the cursor and the wheel pass through it; a click or Escape moves attention in or back to the text.
 */
export const FeatureEmbedSection = ({ eid, label, view, db, attendableId, claimFocus }: FeatureEmbedSectionProps) => {
  const { t } = UiHooks.useTranslation(CodeNamespace.key);
  const id = FeatureEmbed.entityId(eid);
  // Any object link in the document draws here, including one whose URI names no valid id.
  const [object] = useQuery(db, Query.select(isId(id) ? Filter.id(id) : Filter.nothing()));
  const feature = Feature.instanceOf(object) ? object : undefined;

  const embedId = attendableId ? `${attendableId}/${id}` : id;
  const attentionAttributes = useAttentionAttributes(embedId);
  const { hasAttention } = useAttention(embedId);
  const containerRef = useRef<HTMLDivElement>(null);
  const focusing = useRef<FeatureEmbedField | undefined>(undefined);

  useEffect(() => {
    const field = feature && claimFocus?.(feature.id);
    if (field) {
      focusing.current = field;
      containerRef.current?.focus();
    }
  }, [feature, claimFocus]);

  // Inert until attended, so the field can take focus only once attention has followed the container's; a frame later,
  // since an empty description mounts only once attended.
  useEffect(() => {
    const field = focusing.current;
    if (!hasAttention || !field) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      focusing.current = undefined;
      // The description is the form's only contenteditable.
      const selector = field === 'name' ? 'input[data-testid="name"]' : '[contenteditable="true"]';
      const element = containerRef.current?.querySelector<HTMLElement>(selector);
      element?.focus();
      element instanceof HTMLInputElement && element.select();
    });
    return () => cancelAnimationFrame(frame);
  }, [hasAttention, feature]);

  const handleMouseDown = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      // The fold toggle works without attention; a click anywhere else gives the section attention.
      if (!hasAttention && !(event.target instanceof Element && event.target.closest('button'))) {
        event.currentTarget.focus();
      }
    },
    [hasAttention],
  );

  // While attended, keys stay in the form. Focused itself, the section is selected: Enter edits its name, and the rest
  // are the editor's keys for a selected block. From a field, Escape selects the section again.
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (!hasAttention) {
        return;
      }
      event.stopPropagation();
      const container = event.currentTarget;
      if (event.defaultPrevented || !view) {
        return;
      }
      if (event.target !== container) {
        if (event.key === 'Escape') {
          event.preventDefault();
          container.focus();
        }
        return;
      }
      switch (event.key) {
        case 'Enter': {
          const name = container.querySelector<HTMLInputElement>('input[data-testid="name"]');
          if (name) {
            event.preventDefault();
            name.focus();
            name.select();
          }
          break;
        }
        default: {
          if (handleBlockWidgetKey(view, container, event)) {
            event.preventDefault();
          }
        }
      }
    },
    [hasAttention, view],
  );

  if (!feature) {
    return (
      <div className='p-2 text-fg-muted' data-testid='feature-embed.missing'>
        {t('feature-embed.missing.message', { label })}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className='group/embed py-1 outline-hidden whitespace-normal'
      data-testid='feature-embed'
      data-feature={feature.id}
      {...attentionAttributes}
      onMouseDown={handleMouseDown}
      onKeyDown={handleKeyDown}
      onKeyUp={(event) => hasAttention && event.stopPropagation()}
    >
      <div
        className={mx(
          'border rounded-md overflow-hidden',
          hasAttention ? 'border-focus-ring-subtle' : 'border-separator-subtle',
          EMBED_SELECTED_RING,
        )}
      >
        <FeatureSection subject={feature} attended={hasAttention} />
      </div>
    </div>
  );
};
