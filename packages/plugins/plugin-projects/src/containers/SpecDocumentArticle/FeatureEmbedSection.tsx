//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { type KeyboardEvent, type MouseEvent, useCallback, useEffect, useRef } from 'react';

import { type Database, Filter, Obj, Query } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { useAttention, useAttentionAttributes } from '@dxos/react-ui-attention';
import * as UiHooks from '@dxos/react-ui/Hooks';
import { type ObjectLinkProps } from '@dxos/ui-editor';

import { Feature, FeatureEmbed } from '#types';

import { ProjectsNamespace } from '../../namespace.ts';
import { FeatureSection } from '../FeatureSection/index.ts';

const isId = Schema.is(Obj.ID);

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
  const { t } = UiHooks.useTranslation(ProjectsNamespace.key);
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

  // Inert until attended, so the field can take focus only once attention has followed the container's.
  useEffect(() => {
    const field = focusing.current;
    if (!hasAttention || !field) {
      return;
    }
    focusing.current = undefined;
    // The description is rich text, the only editable element in the form.
    const selector = field === 'name' ? 'input[data-testid="name"]' : '[contenteditable="true"]';
    const element = containerRef.current?.querySelector<HTMLElement>(selector);
    element?.focus();
    element instanceof HTMLInputElement && element.select();
  }, [hasAttention]);

  const handleMouseDown = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (!hasAttention && event.currentTarget === event.target) {
        event.currentTarget.focus();
      }
    },
    [hasAttention],
  );

  // While attended, keys stay in the form; Escape hands attention back to the text.
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (!hasAttention) {
        return;
      }
      event.stopPropagation();
      if (event.key === 'Escape' && !event.defaultPrevented && view) {
        event.preventDefault();
        view.focus();
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
      className='py-1 outline-hidden whitespace-normal'
      data-testid='feature-embed'
      data-feature={feature.id}
      {...attentionAttributes}
      onMouseDown={handleMouseDown}
      onKeyDown={handleKeyDown}
      onKeyUp={(event) => hasAttention && event.stopPropagation()}
    >
      <div
        className={`border rounded-md ${hasAttention ? 'border-focus-ring-subtle' : 'border-separator-subtle'}`}
        inert={hasAttention ? undefined : true}
      >
        <FeatureSection subject={feature} attendableId={embedId} />
      </div>
    </div>
  );
};
