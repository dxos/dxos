//
// Copyright 2026 DXOS.org
//

import React, { Fragment, type ReactNode, useState } from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as Card from '@dxos/react-ui/Card';
import * as Layout from '@dxos/react-ui/Layout';
import { Tag, type TagHue } from '@dxos/react-ui/Tag';

import { type Demo, type Environment } from './types.ts';

/** How safe an environment is to poke at: deployed ones are coloured so a production take stands out. */
const ENVIRONMENT_HUES: Record<string, TagHue> = {
  local: 'neutral',
  test: 'neutral',
  dev: 'amber',
  preview: 'blue',
  labs: 'blue',
  staging: 'emerald',
  production: 'emerald',
};

/** Flush columns, as Composer's panels are: no card frame of their own. */
const SQUARE = 'rounded-none border-0 bg-transparent shadow-none';

const isGithub = (remote?: string) => !!remote && /^https:\/\/github\.com\//.test(remote);

const ExternalLink = ({ href, children }: { href?: string; children: ReactNode }) =>
  href ? (
    <a
      href={href}
      target='_blank'
      rel='noopener'
      className='underline decoration-separator underline-offset-2 hover:decoration-accent-text'
    >
      {children}
    </a>
  ) : (
    <>{children}</>
  );

const EnvironmentValue = ({ value, version }: { value?: Environment; version?: string }) => {
  if (!value?.url && !value?.environment) {
    return null;
  }
  const local = !value.url || /localhost|127\.0\.0\.1/.test(value.url);
  return (
    <Layout.Flex gap='sm' align='center' wrap>
      {value.environment && <Tag hue={ENVIRONMENT_HUES[value.environment] ?? 'neutral'}>{value.environment}</Tag>}
      {value.url && (
        <span className='font-mono text-sm'>
          <ExternalLink href={local ? undefined : value.url}>{value.url.replace(/^https?:\/\//, '')}</ExternalLink>
        </span>
      )}
      {version && <span className='text-sm text-fg-muted'>v{version}</span>}
    </Layout.Flex>
  );
};

/** Where and from what the take was recorded, so a viewer knows which build it shows. */
export const Slate = ({ demo }: { demo: Demo }) => {
  const { recording } = demo;
  const git = recording.git ?? {};
  const github = isGithub(git.remote);
  const rows: [string, ReactNode][] = [
    [
      'Branch',
      git.branch && (
        <Layout.Flex gap='sm' align='center' wrap classNames='font-mono text-sm'>
          <ExternalLink href={github ? `${git.remote}/tree/${git.branch}` : undefined}>{git.branch}</ExternalLink>
          {git.commit && (
            <span className='text-fg-muted'>
              @{' '}
              <ExternalLink href={github ? `${git.remote}/commit/${git.commit}` : undefined}>
                {git.commit.slice(0, 9)}
              </ExternalLink>
            </span>
          )}
          {git.dirty && <Tag hue='amber'>uncommitted changes</Tag>}
        </Layout.Flex>
      ),
    ],
    ['Composer', <EnvironmentValue key='composer' value={recording.composer} version={recording.composer?.version} />],
    ['EDGE', <EnvironmentValue key='edge' value={recording.edge} />],
    ['Template', recording.template],
    [
      'Flow',
      recording.flow && (
        <span className='font-mono text-sm break-words'>
          <ExternalLink href={github && git.commit ? `${git.remote}/blob/${git.commit}/${recording.flow}` : undefined}>
            {recording.flow}
          </ExternalLink>
        </span>
      ),
    ],
    ['Spec', recording.mdl && <span className='font-mono text-sm break-words'>{recording.mdl}</span>],
    ['Serve', recording.app && <span className='text-sm'>{recording.app}</span>],
    [
      'Recorded',
      recording.recordedAt &&
        new Date(recording.recordedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }),
    ],
    ['Audio', demo.narrated ? 'Narrated voice-over' : 'No narration'],
  ];
  return (
    <Card.Root classNames={SQUARE}>
      <Card.Header>
        <Card.Title>Recorded on</Card.Title>
      </Card.Header>
      <Card.Row>
        <Layout.Grid cols={['max', 'fill']} gap='sm' align='baseline' grow={false} classNames='py-2 whitespace-normal'>
          {rows
            .filter(([, value]) => value)
            .map(([label, value]) => (
              <Fragment key={label}>
                <span className='text-xs uppercase tracking-wide text-fg-muted'>{label}</span>
                <span className='min-w-0'>{value}</span>
              </Fragment>
            ))}
        </Layout.Grid>
      </Card.Row>
    </Card.Root>
  );
};

/** Copies with the clipboard API, falling back to a selection where an embedding view refuses it. */
const copyText = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.append(area);
    area.select();
    const copied = document.execCommand('copy');
    area.remove();
    return copied;
  }
};

export const useCopy = () => {
  const [copied, setCopied] = useState<string>();
  const copy = async (key: string, text: string) => {
    if (await copyText(text)) {
      setCopied(key);
      setTimeout(() => setCopied((current) => (current === key ? undefined : current)), 1500);
    }
  };
  return { copied, copy };
};

/** A titled block of preformatted text with a copy button: the agent prompt, or the flow's source. */
export const CopyBlock = ({
  title,
  text,
  copied,
  onCopy,
}: {
  title: string;
  text: string;
  copied: boolean;
  onCopy: () => void;
}) => (
  <Card.Root classNames={SQUARE}>
    <Card.Header>
      <Card.Title classNames='truncate'>{title}</Card.Title>
      <Button.Root
        variant='ghost'
        icon={copied ? 'ph--check--regular' : 'ph--copy--regular'}
        label={copied ? 'Copied' : 'Copy'}
        onClick={onCopy}
      />
    </Card.Header>
    <Card.Row>
      <pre className='whitespace-pre-wrap break-words bg-input-surface p-3 font-mono text-xs'>{text}</pre>
    </Card.Row>
  </Card.Root>
);
