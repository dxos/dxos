//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useCallback, useMemo } from 'react';

import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Filter, Obj, Query, Type } from '@dxos/echo';
import { useObject, useQuery, useResolveRef } from '@dxos/echo-react';
import * as SchemaAST from '@dxos/effect/SchemaAST';
import { Form } from '@dxos/react-ui-form';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';

import { ObjectGallery } from '#components';
import { meta } from '#meta';
import { Showcase } from '#types';

import { useOpenObject, useRefTargets } from '../../hooks/index.ts';

type Values = Pick<Showcase.Showcase, 'name'>;

const Values = Schema.make<Schema.Codec<Values, any>>(SchemaAST.pick(Type.getSchema(Showcase.Showcase).ast, ['name']));

export type ShowcaseArticleProps = AppSurface.ObjectArticleProps<Showcase.Showcase>;

/**
 * Article surface for a {@link Showcase.Showcase}: its name, the markdown write-up (edited through the app's
 * text section), its artifacts as the app's card for each type, and what it demonstrates.
 */
export const ShowcaseArticle = ({ role, subject, attendableId }: ShowcaseArticleProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const [showcase, updateShowcase] = useObject(subject);
  const db = Obj.getDatabase(subject);
  const content = useResolveRef(showcase.content);
  const targets = useQuery(db, Query.select(Filter.id(subject.id)).sourceOf(Showcase.Demonstrates).target());
  const artifacts = useRefTargets(showcase.artifacts);
  const openObject = useOpenObject(db, attendableId);
  const handleOpen = useCallback((object: Obj.Unknown) => void openObject(object.id), [openObject]);

  // Read once per showcase; the uncontrolled form owns edits after mount.
  const defaultValues = useMemo<Partial<Values>>(() => ({ name: subject.name }), [subject]);
  const handleValuesChanged = useCallback(
    (values: Partial<Values>) =>
      updateShowcase((showcase) => {
        if (values.name !== undefined) {
          showcase.name = values.name;
        }
      }),
    [updateShowcase],
  );

  return (
    <Panel.Root role={role}>
      <Panel.Body asChild>
        <ScrollArea.Root orientation='vertical'>
          <ScrollArea.Viewport classNames='p-4'>
            <Layout.Flex column gap='lg'>
              <Form.Root db={db} schema={Values} defaultValues={defaultValues} onValuesChanged={handleValuesChanged}>
                <Form.Content>
                  <Form.Fields />
                </Form.Content>
              </Form.Root>

              {targets.length > 0 && (
                <section aria-label={t('showcase-article.targets.label')}>
                  <ObjectGallery objects={targets} onOpen={handleOpen} testId='showcase-article.target' />
                </section>
              )}

              {content && (
                <Surface.Surface type={AppSurface.Section} data={{ subject: content, attendableId }} limit={1} />
              )}

              {artifacts.length > 0 && (
                <Layout.Flex asChild column gap='sm'>
                  <section aria-label={t('showcase-article.artifacts.label')}>
                    <h2 className='text-sm text-description'>{t('showcase-article.artifacts.label')}</h2>
                    <ObjectGallery objects={artifacts} onOpen={handleOpen} />
                  </section>
                </Layout.Flex>
              )}
            </Layout.Flex>
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Body>
    </Panel.Root>
  );
};
