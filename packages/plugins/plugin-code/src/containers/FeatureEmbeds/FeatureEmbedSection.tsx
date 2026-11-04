//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useEffect, useRef } from 'react';

import { type Database, Filter, Obj, Query } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { useAttention, useAttentionAttributes } from '@dxos/react-ui-attention';
import { Editor } from '@dxos/react-ui-editor';
import * as UiHooks from '@dxos/react-ui/Hooks';
import { type ObjectLinkProps } from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';

import { Feature, FeatureEmbed } from '#types';

import { CodeNamespace } from '../../namespace.ts';
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
 * attended, so the wheel passes through it; a click or the arrows select it, and Enter and Escape move into its form
 * and back out.
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

  if (!feature) {
    return (
      <div className='p-2 text-fg-muted' data-testid='feature-embed.missing'>
        {t('feature-embed.missing.message', { label })}
      </div>
    );
  }

  return (
    <div className='py-1'>
      <Editor.BlockFrame
        ref={containerRef}
        view={view}
        attended={hasAttention}
        enterTarget='input[data-testid="name"]'
        classNames={mx('border overflow-hidden', hasAttention ? 'border-focus-ring-subtle' : 'border-separator-subtle')}
        data-testid='feature-embed'
        data-feature={feature.id}
        {...attentionAttributes}
      >
        <FeatureSection subject={feature} attended={hasAttention} />
      </Editor.BlockFrame>
    </div>
  );
};
