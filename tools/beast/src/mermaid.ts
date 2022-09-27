//
// Copyright 2022 DXOS.org
//

import defaultsDeep from 'lodash.defaultsdeep';

// TODO(burdon): Make types relevant to ERD, etc.

type Style = {
  readonly id: string
  readonly properties: any
}

type Node = {
  readonly id: string
  readonly label?: string
  readonly className?: string
  readonly style?: any
  readonly href?: string
}

type Link = {
  readonly source: string
  readonly target: string
  readonly style?: any
}

type Subgraph = {
  readonly id: string
  readonly label?: string
  readonly style?: any
}

interface SubgraphBuilder {
  addNode (node: Node): SubgraphBuilder
  addSubgraph (subgraph: Subgraph): SubgraphBuilder
  build (indent?: number): string[]
}

const ROOT_SUBGRAPH_ID = '_root_';

/**
 * Sub-graph (also used for root graph).
 */
class SubgraphImpl implements Subgraph, SubgraphBuilder {
  private readonly _nodes = new Set<Node>();
  private readonly _subgraphs = new Set<SubgraphBuilder>();

  constructor (
    readonly id: string,
    readonly label?: string,
    readonly style?: string
  ) {}

  addSubgraph ({ id, label, style }: Subgraph) {
    const subgraph = new SubgraphImpl(id, label, style);
    this._subgraphs.add(subgraph);
    // console.log('<<<<<<<<<<<<<<', this.id, id);
    return subgraph;
  }

  addNode (node: Node) {
    this._nodes.add(node);
    return this;
  }

  build (indent = -1): string[] {
    const line = (str: string, i = indent) => ' '.repeat(i * 2) + str;

    const section = (lines: string[]) => lines.length ? lines : undefined;

    const sections = [
      // Current style.
      this.style && line(`style ${this.id} ${Flowchart.renderProperties(this.style)}`, indent + 1),

      // Nodes.
      section(Array.from(this._nodes.values())
        .map(node => Flowchart.renderNode(node).map(str => line(str, indent + 1))).flat()),

      // Recursively render subgraphs.
      section(Array.from(this._subgraphs.values())
        .map(subgraph => ['', subgraph.build(indent + 1)].flat()).flat())
    ].filter(Boolean).flat() as string[];

    if (this.id === 'common') {
      // console.log('>>>>>>>>>>>', this.id, this._subgraphs.size, sections);
    }

    if (indent >= 0) {
      return [
        line(`subgraph ${this.id} [${this.label ?? this.id}]`),
        sections,
        line('end')
      ].flat();
    } else {
      return sections;
    }
  }
}

type FlowchartOptions = {
  direction?: 'LR' | 'RL' | 'TD'
  curve?: 'basis' | 'bump' | 'normal' | 'step'
  linkStyle?: any
}

export const FlowchartDefaultOptions: FlowchartOptions = {
  direction: 'LR',
  curve: 'basis'
};

/**
 * Mermaid Flowchart builder.
 * https://mermaid.live
 * https://mermaid-js.github.io/mermaid/#/README
 */
export class Flowchart implements SubgraphBuilder {
  private readonly _classDefs = new Set<Style>();
  private readonly _root: SubgraphBuilder = new SubgraphImpl(ROOT_SUBGRAPH_ID);
  private readonly _links = new Set<Link>();
  private readonly _options: FlowchartOptions;
  private readonly _config: any;

  constructor (
    options?: FlowchartOptions
  ) {
    this._options = defaultsDeep({}, options, FlowchartDefaultOptions);
    this._config = {
      flowchart: {
        curve: this._options.curve
      }
    };
  }

  addNode = this._root.addNode.bind(this._root);
  addSubgraph = this._root.addSubgraph.bind(this._root);

  addClassDef (id: string, properties: any) {
    this._classDefs.add({ id, properties });
    return this;
  }

  addLink (link: Link) {
    this._links.add(link);
    return this;
  }

  /**
   * Generate mermaid document.
   */
  build () {
    const section = (label: string, lines: string[]) => lines.length ? ['', `%% ${label}`, ...lines] : undefined;

    const sections = [
      section('Classes', Array.from(this._classDefs.values()).map(classDef => Flowchart.renderClassDef(classDef))),
      section('Nodes', this._root.build()),
      section('Links', [
        this._options.linkStyle && Flowchart.renderLinkStyle({ id: 'default', properties: this._options.linkStyle }),
        Array.from(this._links.values()).map((link, i) => Flowchart.renderLink(link, i)).flat()
      ].filter(Boolean).flat())
    ].filter(Boolean).flat();

    return [
      '```mermaid',
      Flowchart.renderDirective('init', this._config),
      '',
      `flowchart ${this._options.direction}`,
      ...sections.flat(),
      '```'
    ].flat() as string[];
  }

  render () {
    return this.build().join('\n');
  }

  //
  // Renderers
  //

  // https://mermaid-js.github.io/mermaid/#/directives
  static renderDirective (directive: string, properties: any): string {
    return `%%{ ${directive}: ${JSON.stringify(properties).replace(/"/g, '\'')} }%%`;
  }

  static renderProperties (properties: any): string {
    return Object.entries(properties).map(([key, value]) => `${key}:${value}`).join(',');
  }

  static renderStyle ({ id, properties }: Style): string {
    return `style ${id} ${Flowchart.renderProperties(properties)}`;
  }

  static renderLinkStyle ({ id, properties }: Style): string {
    return `linkStyle ${id} ${Flowchart.renderProperties(properties)}`;
  }

  // https://mermaid-js.github.io/mermaid/#/flowchart?id=styling-and-classes
  static renderClassDef ({ id, properties }: Style): string {
    return `classDef ${id} ${Flowchart.renderProperties(properties)}`;
  }

  static renderNode (node: Node): string[] {
    const def = [
      node.id,
      node.label && `("${node.label}")`,
      node.className && `:::${node.className}`
    ].filter(Boolean).join('');

    return [
      def,
      node.style && `style ${node.id} ${Flowchart.renderProperties(node.style)}`,

      // https://mermaid-js.github.io/mermaid/#/flowchart?id=interaction
      node.href && `click ${node.id} "${node.href}"`
    ].filter(Boolean) as string[];
  }

  static renderLink (link: Link, i: number): string[] {
    return [
      `${link.source} --> ${link.target}`,
      link.style && Flowchart.renderLinkStyle({ id: String(i), properties: link.style })
    ].filter(Boolean);
  }
}
