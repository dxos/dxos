//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { Obj, Type } from '@dxos/echo';
import { type AnyProperties } from '@dxos/echo/internal';
import { SchemaEx } from '@dxos/effect';
import { useObject } from '@dxos/react-client/echo';
import { Button, Icon, ScrollArea, Tag, useTranslation } from '@dxos/react-ui';
import { Form, type FormUpdateMeta, omitId } from '@dxos/react-ui-form';
import { MarkdownView } from '@dxos/react-ui-markdown';

import { meta } from '#meta';
import { Book } from '#types';

// The user's per-book reading state — the editable subset of the Book schema. The catalog metadata is
// read-only (sourced from BookHive), so it is presented above but excluded from the form.
const ACTIVITY_FIELDS = [
  'status',
  'stars',
  'review',
  'startedAt',
  'finishedAt',
  'owned',
  'purchasePrice',
  'purchaseDate',
  'shelfLocation',
] as const;

// The user's personal rating is 1–10; halve it for a 0–5 star display.
const STARS_PER_STAR = 2;

const STATUS_LABELS: Record<Book.Status, string> = {
  finished: 'Finished',
  reading: 'Reading',
  wantToRead: 'Want to read',
  abandoned: 'Abandoned',
};

/**
 * Read-only catalog view of a book (modeled on the BookHive book page, minus social features) over an
 * editable "Your Activity" form. Catalog metadata — cover, title, authors, rating, publication details,
 * genres, description — is sourced from BookHive and never editable here.
 */
export const BookInfo = ({ book }: { book: Book.Book }) => {
  const { t } = useTranslation(meta.profile.key);
  // Subscribe so external edits re-render (and the form reflects saved values); writes still target the
  // original `book` (subject).
  const [live = book] = useObject(book);
  const catalog = live.catalog;
  const cover = catalog?.cover ?? catalog?.thumbnail;
  const authors = catalog?.authors ?? [];
  const stars = live.stars;
  const publication = [
    catalog?.publicationYear,
    catalog?.publisher,
    catalog?.language,
    catalog?.numPages ? t('pages.label', { count: catalog.numPages }) : undefined,
  ]
    .filter(Boolean)
    .join(' · ');
  // External catalog links shown next to the publication line.
  const externalLinks: { label: string; href: string }[] = [];
  if (catalog?.identifiers?.goodreadsId) {
    externalLinks.push({ label: 'Goodreads', href: `https://www.goodreads.com/book/show/${catalog.identifiers.goodreadsId}` });
  }
  if (catalog?.identifiers?.hiveId) {
    externalLinks.push({ label: 'BookHive', href: `https://bookhive.buzz/books/${catalog.identifiers.hiveId}` });
  }
  const description = catalog?.description;

  const [expanded, setExpanded] = useState(false);
  // Only offer the show-more toggle when the clamped description actually overflows. Re-measured on
  // width/content changes (the panel is CSS-resized without remounting) via a ResizeObserver; the clamp
  // only applies while collapsed, so measure then and keep the toggle shown while expanded.
  const descriptionRef = useRef<HTMLDivElement>(null);
  const [descriptionOverflows, setDescriptionOverflows] = useState(false);
  useLayoutEffect(() => {
    const element = descriptionRef.current;
    if (!element) {
      return;
    }
    const measure = () => {
      if (!expanded) {
        setDescriptionOverflows(element.scrollHeight > element.clientHeight + 1);
      }
    };
    measure();
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [description, expanded]);
  const showDescriptionToggle = descriptionOverflows || expanded;

  // The editable subset of the schema; catalog fields are omitted (read-only above).
  const activitySchema = useMemo(() => omitId(Type.getSchema(Book.Book)).pipe(Schema.pick(...ACTIVITY_FIELDS)), []);

  // The activity form is uncontrolled — seeded once from the object, then each change written straight
  // back to it — mirroring ObjectProperties. A controlled `values` form re-seeds on every reactive
  // update and fights live typing.
  const activityValues = useMemo(() => ({ ...book }), [book]);
  const handleChange = useCallback(
    (values: Partial<AnyProperties>, { isValid, changed }: FormUpdateMeta<AnyProperties>) => {
      if (!isValid) {
        return;
      }
      // `Object.keys` widens the branded JsonPath keys to `string`; re-narrow to iterate them.
      const paths = (Object.keys(changed) as SchemaEx.JsonPath[]).filter((path) => changed[path]);
      if (paths.length === 0) {
        return;
      }
      Obj.update(book, () => {
        for (const path of paths) {
          Obj.setValue(book, SchemaEx.splitJsonPath(path), SchemaEx.getValue(values, path));
        }
      });
    },
    [book],
  );

  // TODO(wittjosiah): This whole page should be a Form with sections, partially read-only.
  return (
    <ScrollArea.Root orientation='vertical'>
      <ScrollArea.Viewport>
        <div role='none' className='mli-auto flex max-is-[48rem] flex-col gap-4 p-4'>
          {/* Header — cover + catalog identity. */}
          <section className='flex gap-4 rounded-lg border border-separator p-4'>
            {cover ? (
              <img src={cover} alt='' className='is-[6rem] aspect-[2/3] shrink-0 self-start rounded object-cover' />
            ) : (
              <div role='none' className='grid is-[8rem] aspect-[2/3] shrink-0 place-items-center rounded bg-input'>
                <Icon icon='ph--book--regular' size={8} classNames='text-description' />
              </div>
            )}
            <div role='none' className='flex min-is-0 flex-col gap-2'>
              <h1 className='text-xl font-semibold'>{catalog?.title}</h1>
              {authors.length > 0 && (
                <p className='text-description'>{t('by-author.label', { authors: authors.join(', ') })}</p>
              )}
              {/* The user's own rating (1–10) as five stars in half-star increments. */}
              {stars != null && <StarRating value={stars / STARS_PER_STAR} />}
              <div role='none' className='flex flex-wrap items-center gap-1'>
                {live.status && <Tag hue='info'>{STATUS_LABELS[live.status]}</Tag>}
                {live.owned && <Tag hue='neutral'>{t('owned.label')}</Tag>}
              </div>
              {(publication || externalLinks.length > 0) && (
                <p className='text-sm text-description'>
                  {publication}
                  {externalLinks.map((link, index) => (
                    <React.Fragment key={link.label}>
                      {(publication || index > 0) && ' · '}
                      <a
                        href={link.href}
                        target='_blank'
                        rel='noreferrer'
                        className='dx-focus-ring rounded text-accentText'
                      >
                        {link.label}
                      </a>
                    </React.Fragment>
                  ))}
                </p>
              )}
              {catalog?.genres && catalog.genres.length > 0 && (
                <div role='none' className='flex flex-wrap gap-1'>
                  {catalog.genres.map((genre) => (
                    <Tag key={genre} hue='neutral'>
                      {genre}
                    </Tag>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Description — stored as markdown (converted from BookHive's HTML on ingest). */}
          {description && (
            <section className='flex flex-col gap-2 rounded-lg border border-separator p-4'>
              <h2 className='text-base font-semibold'>{t('description.label')}</h2>
              <div ref={descriptionRef} role='none' className={expanded ? '' : 'max-bs-52 overflow-hidden'}>
                <MarkdownView content={description} classNames='text-sm' />
              </div>
              {showDescriptionToggle && (
                <Button variant='ghost' classNames='self-start' onClick={() => setExpanded((value) => !value)}>
                  {t(expanded ? 'show-less.label' : 'show-more.label')}
                </Button>
              )}
            </section>
          )}

          {/* Your Activity — the editable per-book reading state (review renders a markdown editor). */}
          <section className='flex flex-col gap-2 rounded-lg border border-separator p-4'>
            <h2 className='text-base font-semibold'>{t('your-activity.label')}</h2>
            <Form.Root
              schema={activitySchema}
              defaultValues={activityValues}
              db={Obj.getDatabase(book)}
              onValuesChanged={handleChange}
            >
              <Form.Content>
                <Form.FieldSet />
              </Form.Content>
            </Form.Root>
          </section>
        </div>
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  );
};

/**
 * Renders a 0–5 rating as five stars in half-star increments: filled/half stars are accented, empty
 * stars are a muted outline. The color must sit on each `Icon` (it does not inherit from the parent).
 */
const StarRating = ({ value }: { value: number }) => (
  <span role='img' aria-label={`${value.toFixed(1)} / 5`} className='flex items-center gap-0.5'>
    {Array.from({ length: 5 }, (_, index) => {
      const remainder = value - index;
      const filled = remainder >= 0.75;
      const half = !filled && remainder >= 0.25;
      return (
        <Icon
          key={index}
          icon={filled ? 'ph--star--fill' : half ? 'ph--star-half--fill' : 'ph--star--regular'}
          size={5}
          classNames={filled || half ? 'text-primary-500' : 'text-subdued'}
        />
      );
    })}
  </span>
);
