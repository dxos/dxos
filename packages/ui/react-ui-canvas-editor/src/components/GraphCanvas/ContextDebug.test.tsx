//
// Copyright 2024 DXOS.org
//

import { render, screen } from '@testing-library/react';
import React, { useContext } from 'react';
import { describe, expect, test } from 'vitest';

import { ThemeProvider } from '@dxos/react-ui';

import { EditorContext } from '../../hooks';
import { Editor } from '../Editor';

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const DebugComponent = () => {
  const context = useContext(EditorContext);
  return <div>Context: {context ? 'Found' : 'Missing'}</div>;
};

describe('Editor Context', () => {
  test('Editor.Root provides context', () => {
    render(
      <ThemeProvider>
        <Editor.Root id='test'>
          <DebugComponent />
        </Editor.Root>
      </ThemeProvider>,
    );
    expect(screen.getByText('Context: Found')).toBeDefined();
  });

  test('Editor.Canvas (GraphCanvas) renders inside Editor.Root', () => {
    // This will throw if context is missing because GraphCanvas calls useEditorContext
    const { container } = render(
      <ThemeProvider>
        <Editor.Root id='test-canvas'>
          <Editor.Canvas />
        </Editor.Root>
      </ThemeProvider>,
    );
    expect(container).toBeDefined();
  });
});
