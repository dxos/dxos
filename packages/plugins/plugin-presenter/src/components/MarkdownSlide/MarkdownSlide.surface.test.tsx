//
// Copyright 2026 DXOS.org
//
// @vitest-environment happy-dom

import { cleanup, render } from '@testing-library/react';
import React, { useEffect } from 'react';
import { afterEach, describe, test } from 'vitest';

import { MarkdownSlide } from './MarkdownSlide.tsx';

const content = '<Surface ref="echo:///01J00000000000000000000000" />';

describe('MarkdownSlide surfaces', () => {
  afterEach(() => cleanup());

  test('an inline renderSurface does not remount the surface', ({ expect }) => {
    let mounts = 0;
    const Probe = ({ label }: { label: string }) => {
      useEffect(() => {
        mounts++;
      }, []);
      return <i>{label}</i>;
    };

    const { rerender, getByText } = render(
      <MarkdownSlide content={content} step={0} renderSurface={({ uri }) => <Probe label={`first ${uri}`} />} />,
    );
    rerender(
      <MarkdownSlide content={content} step={1} renderSurface={({ uri }) => <Probe label={`second ${uri}`} />} />,
    );

    expect(getByText('second echo:///01J00000000000000000000000')).toBeTruthy();
    expect(mounts).toBe(1);
  });
});
