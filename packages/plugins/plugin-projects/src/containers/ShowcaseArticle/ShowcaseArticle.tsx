//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useCallback, useMemo } from 'react';

import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Filter, Obj, Query, type Ref, Type } from '@dxos/echo';
import { useObject, useQuery, useResolveRef } from '@dxos/echo-react';
import * as SchemaAST from '@dxos/effect/SchemaAST';
import { Form } from '@dxos/react-ui-form';
import * as Card from '@dxos/react-ui/Card';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';

import { meta } from '#meta';
import { Showcase } from '#types';

import { useOpenObject } from '../../hooks/index.ts';

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
  const openObject = useOpenObject(db, attendableId);

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
        <ScrollArea.Root orientation='vertical' classNames='dx-cover'>
          <ScrollArea.Viewport classNames='p-4'>
            <Layout.Flex column gap='lg'>
              <Form.Root db={db} schema={Values} defaultValues={defaultValues} onValuesChanged={handleValuesChanged}>
                <Form.Content>
                  <Form.Fields />
                </Form.Content>
              </Form.Root>

              {targets.length > 0 && (
                <Layout.Flex asChild wrap gap='sm'>
                  <section aria-label={t('showcase-article.targets.label')}>
                    {targets.map((target) => (
                      <Card.Root
                        key={target.id}
                        onClick={() => void openObject(target.id)}
                        data-testid='showcase-article.target'
                      >
                        <Card.Header>
                          <Card.Title>{Obj.getLabel(target) ?? target.id}</Card.Title>
                        </Card.Header>
                      </Card.Root>
                    ))}
                  </section>
                </Layout.Flex>
              )}

              {content && (
                <Surface.Surface type={AppSurface.Section} data={{ subject: content, attendableId }} limit={1} />
              )}

              <ObjectCards
                label={t('showcase-article.artifacts.label')}
                refs={showcase.artifacts}
                onOpen={(id) => void openObject(id)}
              />
            </Layout.Flex>
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Body>
    </Panel.Root>
  );
};

type ObjectCardsProps = {
  label: string;
  refs: readonly Ref.Ref<Obj.Unknown>[];
  onOpen: (id: string) => void;
};

/** Each object as the app's card for its type: a file shows its image or video, a pull request its state. */
const ObjectCards = ({ label, refs, onOpen }: ObjectCardsProps) => {
  const items = useMemo(() => [...refs], [refs]);
  if (items.length === 0) {
    return null;
  }
  return (
    <Layout.Flex asChild column gap='sm'>
      <section aria-label={label}>
        <h2 className='text-sm text-description'>{label}</h2>
        {/* An auto-filling track count has no `cols` form, so the template stays a class. */}
        <Layout.Grid gap='md' align='start' classNames='grid-cols-[repeat(auto-fill,minmax(16rem,1fr))]'>
          {items.map((ref) => (
            <ObjectCard key={ref.uri} objectRef={ref} onOpen={onOpen} />
          ))}
        </Layout.Grid>
      </section>
    </Layout.Flex>
  );
};

const ObjectCard = ({ objectRef, onOpen }: { objectRef: Ref.Ref<Obj.Unknown>; onOpen: (id: string) => void }) => {
  const object = useResolveRef(objectRef);
  if (!object) {
    return null;
  }
  return (
    <Card.Root onClick={() => onOpen(object.id)}>
      <Card.Header>
        <Card.Title>{Obj.getLabel(object) ?? object.id}</Card.Title>
      </Card.Header>
      <Surface.Surface type={AppSurface.CardContent} data={{ subject: object }} limit={1} />
    </Card.Root>
  );
};
