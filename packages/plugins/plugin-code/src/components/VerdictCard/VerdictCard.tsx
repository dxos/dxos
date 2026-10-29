//
// Copyright 2026 DXOS.org
//

import React from 'react';

import {
  type SourceKey,
  type Verdict,
  type VerdictStatus,
  formatSourceKey,
  parseSourceKey,
  walkthroughOf,
} from '@dxos/deus/review';
import * as Card from '@dxos/react-ui/Card';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import * as Menu from '@dxos/react-ui/Menu';
import * as Tag from '@dxos/react-ui/Tag';
import * as Util from '@dxos/react-ui/Util';

import { meta } from '#meta';

import { type SourceReader } from '../SpecEditor/snippet-card.ts';
import { STATUS_STYLE } from '../SpecModel/index.ts';
import { Walkthrough } from './Walkthrough.tsx';

/** Status icon colours, matching the review chips in the editor's margin. */
const STATUS_TEXT: Record<VerdictStatus, string> = {
  done: 'text-success-text',
  untested: 'text-info-text',
  partial: 'text-warning-text',
  diverged: 'text-orange-text',
  missing: 'text-error-text',
};

export type VerdictCardProps = {
  verdict: Verdict;
  /** Shows the judged item in the spec. */
  onReveal?: (id: string) => void;
  /** Opens one of the verdict's evidence keys. */
  onOpenCode?: (key: SourceKey) => void;
  /** The verdict the host has made current; Card.Root owns `aria-current`, so the host's attribute would be lost. */
  current?: boolean;
  /** The checkout's text of a file, for the walkthrough the current card expands to. */
  read?: SourceReader;
};

/**
 * One verdict of a spec review as a card: the item it judges and its status up top, the menu top right (reveal the
 * item, open its code), and the reviewer's summary and note in the body. Focus, selection and opening belong to the
 * host's tile, so the card is `asChild`-friendly.
 */
export const VerdictCard = Util.composable<HTMLDivElement, VerdictCardProps>(
  ({ verdict, onReveal, onOpenCode, current, read, ...props }, forwardedRef) => {
    const { t } = Hooks.useTranslation(meta.profile.key);
    const { id, status, summary, note, evidence } = verdict;
    const keys = evidence.map(parseSourceKey).filter((key) => key !== undefined);
    const style = STATUS_STYLE[status];
    // Expanded only on the current card, so the list stays scannable.
    const steps = current ? walkthroughOf(verdict) : undefined;
    return (
      <Card.Root
        {...props}
        grid
        selected={current}
        data-testid='verdict-card'
        data-verdict={id}
        data-status={status}
        ref={forwardedRef}
      >
        <Card.Header>
          <Layout.Block rail='start'>
            <Icon.Icon icon={style.icon} classNames={STATUS_TEXT[status]} />
          </Layout.Block>
          <Card.Title truncate classNames='font-mono'>
            {id}
          </Card.Title>
          {(onReveal || (onOpenCode && keys.length > 0)) && (
            <Layout.Block rail='end'>
              <Card.Menu label={t('verdict-card.menu.label')}>
                {onReveal && (
                  <Menu.Item
                    item={{ value: 'reveal', label: t('verdict-card.reveal.label'), icon: 'ph--crosshair--regular' }}
                    data-testid='verdict-card.reveal'
                    onClick={() => onReveal(id)}
                  />
                )}
                {onReveal && onOpenCode && keys.length > 0 && <Menu.Separator />}
                {onOpenCode &&
                  keys.map((key) => (
                    <Menu.Item
                      key={formatSourceKey(key)}
                      item={{
                        value: formatSourceKey(key),
                        label: key.fragment ?? key.path.split('/').pop() ?? key.path,
                        icon: 'ph--file-code--regular',
                      }}
                      data-testid='verdict-card.open-code'
                      onClick={() => onOpenCode(key)}
                    />
                  ))}
              </Card.Menu>
            </Layout.Block>
          )}
        </Card.Header>
        <Card.Body>
          {summary && (
            <Card.Row>
              <Card.Text lines={2}>{summary}</Card.Text>
            </Card.Row>
          )}
          {note && (
            <Card.Row>
              <Card.Text lines={4} variant='muted'>
                {note}
              </Card.Text>
            </Card.Row>
          )}
          {steps && (
            <Card.Row>
              <Walkthrough steps={steps} read={read} onOpenCode={onOpenCode} />
            </Card.Row>
          )}
          <Card.Row>
            <Layout.Flex wrap gap='xs'>
              <Tag.Tag hue={style.hue}>{style.label}</Tag.Tag>
              {keys.length > 0 && <Tag.Tag>{t('verdict-card.evidence.label', { count: keys.length })}</Tag.Tag>}
            </Layout.Flex>
          </Card.Row>
        </Card.Body>
      </Card.Root>
    );
  },
);

VerdictCard.displayName = 'VerdictCard';
