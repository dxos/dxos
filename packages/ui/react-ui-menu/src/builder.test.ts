//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { Node } from '@dxos/app-graph';

import { MenuBuilder } from './builder';
import { MenuSeparatorType } from './types';

describe('MenuBuilder', () => {
  test('builds a flat menu with actions', ({ expect }) => {
    const graph = MenuBuilder.make()
      .root({ label: 'toolbar' })
      .action('bold', { label: 'Bold', icon: 'ph--text-b--regular' }, () => {})
      .action('italic', { label: 'Italic', icon: 'ph--text-italic--regular' }, () => {})
      .build();

    expect(graph.nodes).toHaveLength(3);
    expect(graph.edges).toHaveLength(2);
    expect(graph.edges).toEqual([
      { source: 'root', target: 'bold', relation: 'child' },
      { source: 'root', target: 'italic', relation: 'child' },
    ]);
  });

  test('builds nested groups', ({ expect }) => {
    const graph = MenuBuilder.make()
      .root({ label: 'toolbar' })
      .group('formatting', { label: 'Formatting' }, (group) => {
        group
          .action('bold', { label: 'Bold', icon: 'ph--text-b--regular' }, () => {})
          .action('italic', { label: 'Italic', icon: 'ph--text-italic--regular' }, () => {});
      })
      .build();

    expect(graph.nodes).toHaveLength(4);
    expect(graph.edges).toEqual([
      { source: 'root', target: 'formatting', relation: 'child' },
      { source: 'formatting', target: 'bold', relation: 'child' },
      { source: 'formatting', target: 'italic', relation: 'child' },
    ]);
  });

  test('builds deeply nested hierarchy', ({ expect }) => {
    const graph = MenuBuilder.make()
      .root({ label: 'toolbar' })
      .group('text', { label: 'Text' }, (text) => {
        text
          .group('headings', { label: 'Headings' }, (headings) => {
            headings
              .action('h1', { label: 'Heading 1', icon: 'ph--text-h-one--regular' }, () => {})
              .action('h2', { label: 'Heading 2', icon: 'ph--text-h-two--regular' }, () => {});
          })
          .group('formatting', { label: 'Formatting' }, (formatting) => {
            formatting.action('bold', { label: 'Bold', icon: 'ph--text-b--regular' }, () => {});
          });
      })
      .build();

    // root + text + headings + h1 + h2 + formatting + bold = 7 nodes.
    expect(graph.nodes).toHaveLength(7);
    expect(graph.edges).toEqual([
      { source: 'root', target: 'text', relation: 'child' },
      { source: 'text', target: 'headings', relation: 'child' },
      { source: 'headings', target: 'h1', relation: 'child' },
      { source: 'headings', target: 'h2', relation: 'child' },
      { source: 'text', target: 'formatting', relation: 'child' },
      { source: 'formatting', target: 'bold', relation: 'child' },
    ]);
  });

  test('merges pre-built subgraph', ({ expect }) => {
    const headings = MenuBuilder.make()
      .root({ label: 'headings' })
      .group('headings', { label: 'Headings', variant: 'dropdownMenu' }, (group) => {
        group
          .action('h1', { label: 'H1', icon: 'ph--text-h-one--regular' }, () => {})
          .action('h2', { label: 'H2', icon: 'ph--text-h-two--regular' }, () => {});
      })
      .build();

    const graph = MenuBuilder.make()
      .root({ label: 'toolbar' })
      .action('search', { label: 'Search', icon: 'ph--magnifying-glass--regular' }, () => {})
      .subgraph(headings)
      .build();

    // root (toolbar) + search + root (headings) + headings group + h1 + h2 = 6 nodes.
    expect(graph.nodes).toHaveLength(6);
    // search → root, headings root→headings group, h1→headings, h2→headings.
    const headingsEdge = graph.edges.find((edge) => edge.target === 'headings');
    expect(headingsEdge).toEqual({ source: 'root', target: 'headings', relation: 'child' });
  });

  test('separators are inserted between groups', ({ expect }) => {
    const graph = MenuBuilder.make()
      .root({ label: 'toolbar' })
      .action('bold', { label: 'Bold', icon: 'ph--text-b--regular' }, () => {})
      .separator()
      .action('search', { label: 'Search', icon: 'ph--magnifying-glass--regular' }, () => {})
      .build();

    const separatorNode = graph.nodes.find((node) => node.type === MenuSeparatorType);
    expect(separatorNode).toBeDefined();
    expect(separatorNode!.properties).toEqual({ variant: 'gap' });

    const separatorEdge = graph.edges.find((edge) => edge.target === separatorNode!.id);
    expect(separatorEdge).toEqual({ source: 'root', target: separatorNode!.id, relation: 'child' });
  });

  test('subgraph callback adds children to current group', ({ expect }) => {
    const graph = MenuBuilder.make()
      .root({ label: 'toolbar' })
      .subgraph((sub) => {
        sub
          .group('headings', { label: 'Headings', variant: 'dropdownMenu' }, (group) => {
            group
              .action('h1', { label: 'H1', icon: 'ph--text-h-one--regular' }, () => {})
              .action('h2', { label: 'H2', icon: 'ph--text-h-two--regular' }, () => {});
          })
          .group('formatting', { label: 'Formatting' }, (group) => {
            group.action('bold', { label: 'Bold', icon: 'ph--text-b--regular' }, () => {});
          });
      })
      .build();

    // root + headings + h1 + h2 + formatting + bold = 6 nodes.
    expect(graph.nodes).toHaveLength(6);
    expect(graph.edges).toEqual([
      { source: 'root', target: 'headings', relation: 'child' },
      { source: 'headings', target: 'h1', relation: 'child' },
      { source: 'headings', target: 'h2', relation: 'child' },
      { source: 'root', target: 'formatting', relation: 'child' },
      { source: 'formatting', target: 'bold', relation: 'child' },
    ]);
  });

  test('subgraph callback scoped to nested group', ({ expect }) => {
    const graph = MenuBuilder.make()
      .root({ label: 'toolbar' })
      .group('text', { label: 'Text' }, (text) => {
        text.subgraph((sub) => {
          sub.action('bold', { label: 'Bold', icon: 'ph--text-b--regular' }, () => {});
          sub.action('italic', { label: 'Italic', icon: 'ph--text-italic--regular' }, () => {});
        });
      })
      .build();

    // root + text + bold + italic = 4 nodes.
    expect(graph.nodes).toHaveLength(4);
    expect(graph.edges).toEqual([
      { source: 'root', target: 'text', relation: 'child' },
      { source: 'text', target: 'bold', relation: 'child' },
      { source: 'text', target: 'italic', relation: 'child' },
    ]);
  });

  test('composable curried subgraph functions', ({ expect }) => {
    // Simulates the curried pattern: addX(args) returns (builder) => void.
    const addHeadingsSection = () => (builder: import('./builder').ActionGroupBuilder) => {
      builder.group('headings', { label: 'Headings', variant: 'dropdownMenu' }, (group) => {
        group
          .action('h1', { label: 'H1', icon: 'ph--text-h-one--regular' }, () => {})
          .action('h2', { label: 'H2', icon: 'ph--text-h-two--regular' }, () => {});
      });
    };

    const addFormattingSection = () => (builder: import('./builder').ActionGroupBuilder) => {
      builder.group('formatting', { label: 'Formatting' }, (group) => {
        group.action('bold', { label: 'Bold', icon: 'ph--text-b--regular' }, () => {});
      });
    };

    const graph = MenuBuilder.make()
      .root({ label: 'toolbar' })
      .subgraph(addHeadingsSection())
      .separator()
      .subgraph(addFormattingSection())
      .build();

    expect(graph.nodes).toHaveLength(7); // root + headings + h1 + h2 + separator + formatting + bold.
    expect(graph.edges[0]).toEqual({ source: 'root', target: 'headings', relation: 'child' });
    expect(graph.edges[3]).toEqual({ source: 'root', target: 'separator-1', relation: 'child' });
    expect(graph.edges[4]).toEqual({ source: 'root', target: 'formatting', relation: 'child' });
  });

  test('subgraph skips falsy values', ({ expect }) => {
    const showHeadings = false;
    const graph = MenuBuilder.make()
      .root({ label: 'toolbar' })
      .subgraph(
        showHeadings &&
          ((builder) => {
            builder.group('headings', { label: 'Headings' }, () => {});
          }),
      )
      .action('bold', { label: 'Bold', icon: 'ph--text-b--regular' }, () => {})
      .subgraph(undefined)
      .subgraph(null)
      .build();

    // root + bold = 2 nodes; headings skipped.
    expect(graph.nodes).toHaveLength(2);
    expect(graph.edges).toHaveLength(1);
  });

  test('nodes have correct types', ({ expect }) => {
    const graph = MenuBuilder.make()
      .root({ label: 'toolbar' })
      .action('bold', { label: 'Bold', icon: 'ph--text-b--regular' }, () => {})
      .group('headings', { label: 'Headings' }, () => {})
      .build();

    const rootNode = graph.nodes.find((node) => node.id === 'root');
    const actionNode = graph.nodes.find((node) => node.id === 'bold');
    const groupNode = graph.nodes.find((node) => node.id === 'headings');

    expect(rootNode!.type).toBe(Node.ActionGroupType);
    expect(actionNode!.type).toBe(Node.ActionType);
    expect(groupNode!.type).toBe(Node.ActionGroupType);
  });
});
