//
// Copyright 2022 DXOS.org
//

import styled from '@emotion/styled';
import extend from 'lodash/extend';
import partition from 'lodash/partition';
import PropTypes from 'prop-types';
import React, { Component, Fragment } from 'react';
import { remark } from 'remark';
// TODO(wittjosiah): Deprecated.
// import remark2react from 'remark-react';

const TableWrapper = styled.div({
  overflow: 'auto',
  marginBottom: '1.45rem'
});

const StyledTable = styled.table({
  border: 'none',
  borderSpacing: 0,
  borderRadius: 0,
  thead: {
    tr: {
      border: '1px solid var(--ifm-toc-border-color)'
    }
  },
  th: {
    letterSpacing: '0.142em',
    textTransform: 'uppercase',
    fontSize: 13,
    fontWeight: 'normal',
    color: 'black',
    textAlign: 'inherit',
    padding: '5px 10px',
    '&:last-child': {
      width: '99%'
    }
  },
  td: {
    padding: '5px 10px',
    verticalAlign: 'top',
    p: {
      fontSize: 'inherit',
      lineHeight: 'inherit'
    },
    code: {
      whiteSpace: 'normal'
    },
    '> :last-child': {
      marginBottom: 0
    }
  },
  '&.field-table': {
    td: {
      padding: '5px 10px',
      h6: {
        fontSize: 'inherit',
        lineHeight: 'inherit',
        fontWeight: 'bold',
        marginBottom: '5px'
      }
    },
    'tr.required td': {
      background: 'black'
    }
  }
});

const Header = styled.div({});

const MainHeading = styled.h3({
  paddingTop: 20
});

const StyledCode = styled.code({
  padding: '0 !important',
  background: 'none !important'
});

const Subheading = styled.h6({
  marginTop: 12,
  marginBottom: 10
});

const Body = styled.div({});

const BodySubheading = styled.h6({
  fontWeight: 'bold'
});

const _allText = (data) => [data.shortText, data.text].filter(Boolean).join('\n\n');

const _summary = (rawData) => {
  if (rawData.comment) {
    return _allText(rawData.comment);
  }
  return (
    rawData.signatures &&
    rawData.signatures[0].comment &&
    _allText(rawData.signatures[0].comment)
  );
};

const _isReflectedProperty = (data) => data.kindString === 'Property' &&
    data.type &&
    data.type.type === 'reflection';

const _parameterString = (names: string[], leftDelim?: string, rightDelim?: string) => {
  leftDelim = leftDelim || '(';
  rightDelim = rightDelim || ')';
  return leftDelim + names.join(', ') + rightDelim;
};

const _typeId = (type) => type.fullName || type.name;

const isReadableName = (name) => name.substring(0, 2) !== '__';

/*
* remark2react uses:
* <pre>
*   <code>
*     Code here...
*   </code>
* </pre>
*/
// const CodeComponent = ({ children }) => {
//   // Parse manually code children to avoid colission with `code` tag.
//   const codeContent = children?.[0]?.props.children?.toString();
//   return (
//     <HighlightedCode code={codeContent} language='tsx' />
//   );
// };

// TODO(wittjosiah): Code syntax highlighting. Docusaurus MDX?
const mdToReact = (text) => {
  const sanitized = text.replace(/\{@link (\w*)\}/g, '[$1](#$1)');
  return remark()
    // .use(remark2react, {
    //   remarkReactComponents: {
    //     pre: CodeComponent // This replaces any `pre` tag with our CodeComponent.
    //   }
    // })
    .processSync(sanitized).toString();
};

// Based on https://github.com/apollographql/gatsby-theme-apollo/blob/6e9f6ce4166d495b5768edd30a593c24e8b46dae/packages/gatsby-theme-apollo-docs/src/components/typescript-api-box.js
// TODO(wittjosiah): Rewrite in Typescript, better handle React components, reduce edge cases which fall back to displaying 'any'.
export class TypescriptApiBox extends Component<{ name: string, docs: any, react: any }> {
  static propTypes = {
    name: PropTypes.string.isRequired,
    docs: PropTypes.any.isRequired,
    react: PropTypes.any
  };

  get dataByKey () {
    const dataByKey = {};

    const traverse = (tree: any, parentName?: string) => {
      let { name } = tree;
      if (['Accessor', 'Constructor', 'Interface', 'Method', 'Namespace', 'Property'].includes(tree.kindString)) {
        name = `${parentName}.${tree.name}`;
        // add the parentName to the data so we can reference it for ids
        tree.parentName = parentName;
        tree.fullName = name;
      }

      dataByKey[name] = tree;

      if (tree.children) {
        tree.children.forEach(child => {
          traverse(child, name);
        });
      }
    };

    traverse(this.props.docs);

    return dataByKey;
  }

  templateArgs (rawData, isReact = false) {
    const parameters = this._parameters(rawData, this.dataByKey, isReact);
    const split = partition(parameters, 'isOptions');
    const groups: { name: string, members: any[] }[] = [];
    if (split[1]?.length > 0) {
      groups.push({
        name: 'Arguments',
        members: split[1]
      });
    }
    if (split[0]?.length > 0) {
      groups.push({
        name: isReact ? 'Props' : 'Options',
        // the properties of the options parameter are the things listed in this group
        members: split[0][0].properties
      });
    }

    if (rawData.kindString === 'Interface') {
      groups.push({
        name: 'Properties',
        members: this._objectProperties(rawData)
      });
    }

    let type;
    if (rawData.kindString === 'Type alias') {
      // this means it's an object type
      if (rawData.type.declaration && rawData.type.declaration.children) {
        groups.push({
          name: 'Properties',
          members: this._objectProperties(rawData.type.declaration)
        });
      } else {
        type = this._type(rawData);
      }
    }

    const children = rawData.children?.filter(child => !child.flags.isPrivate) ?? [];

    return {
      id: _typeId(rawData),
      name: rawData.name,
      type,
      signature: this._signature(rawData, parameters),
      summary: _summary(rawData),
      groups,
      repo: 'dxos/protocols',
      // TODO(wittjosiah): point to release tag.
      branch: 'main',
      filepath: rawData.sources?.[0].fileName,
      lineno: rawData.sources?.[0].line,
      children: {
        properties: children.filter(child => child.kindString === 'Property'),
        accessors: children.filter(child => child.kindString === 'Accessor'),
        methods: children.filter(child => child.kindString === 'Method')
      }
    };
  }

  // This is just literally the name of the type, nothing fancy, except for references
  _typeName = (type: any) => {
    if (type.type === 'array') {
      return `[${this._typeName(type.elementType)}]`;
    } else if (type.type === 'intrinsic') {
      if (type.isArray) {
        return '[' + type.name + ']';
      }
      return type.name;
    } else if (type.type === 'union') {
      const typeNames: string[] = [];
      for (let i = 0; i < type.types.length; i++) {
        // Try to get the type name for this type.
        const typeName = this._typeName(type.types[i]);
        // Propogate undefined type names by returning early. Otherwise just add the
        // type name to our array.
        if (typeof typeName === 'undefined') {
          return;
        } else {
          typeNames.push(typeName);
        }
      }
      // Join all of the types together.
      return typeNames.join(' | ');
    } else if (type.type === 'reference') {
      // check to see if the reference type is a simple type alias
      const referencedData = this.dataByKey[type.name];
      if (referencedData?.kindString === 'Type alias') {
        // Is it an "objecty" type? We can't display it in one line if so
        if (
          !referencedData.type.declaration ||
          !referencedData.type.declaration.children
        ) {
          return this._type(referencedData);
        }
      }

      // it used to be this: return _link(_typeId(type), type.name);
      return _typeId(type);
    } else if (type.type === 'literal') {
      return '"' + type.value + '"';
    }
  };

  _objectProperties (rawData) {
    const signatures = Array.isArray(rawData.indexSignature)
      ? rawData.indexSignature
      : [];
    return signatures
      .map(signature => {
        const parameterString = this._indexParameterString(signature);
        return extend(this._parameter(signature), { name: parameterString });
      })
      .concat(rawData.children.map(this._parameter));
  }

  _indexParameterString (signature) {
    const parameterNamesAndTypes = signature.parameters.map(
      param => param.name + ':' + this._typeName(param.type)
    );
    return _parameterString(parameterNamesAndTypes, '[', ']');
  }

  // Render the type of a data object. It's pretty confusing, to say the least
  _type = (data: any, skipSignature?: any) => {
    const { type } = data;

    if (data.kindString === 'Method') {
      return this._type(data.signatures[0]);
    }

    if (data.kindString === 'Call signature' && !skipSignature) {
      const paramTypes = Array.isArray(data.parameters)
        ? data.parameters.map(this._type)
        : [];
      const args = '(' + paramTypes.join(', ') + ')';
      return args + ' => ' + this._type(data, true);
    }

    const isReflected =
      data.kindString === 'Type alias' || type?.type === 'reflection';
    if (isReflected && type?.declaration) {
      const { declaration } = type;
      if (declaration.signatures) {
        return this._type(declaration.signatures[0]);
      }

      if (declaration.indexSignature) {
        const signature = Array.isArray(declaration.indexSignature)
          ? declaration.indexSignature[0]
          : declaration.indexSignature;
        return (
          this._indexParameterString(signature) + ':' + this._type(signature)
        );
      }
    }

    let typeName = type && this._typeName(type);
    if (!typeName) {
      // console.error(
      //   'unknown type name for',
      //   data.name,
      //   'using the type name `any`'
      // );
      // console.trace();
      typeName = 'any';
    }

    if (type?.typeArguments) {
      return (
        typeName +
        _parameterString(type.typeArguments.map(this._typeName), '<', '>')
      );
    }
    return typeName;
  };

  // XXX: not sure whether to use the 'kind' enum from TS or just run with the
  // strings. Strings seem safe enough I guess
  _signature (rawData, parameters) {
    let dataForSignature = rawData;
    if (_isReflectedProperty(rawData)) {
      dataForSignature = rawData.type.declaration;
    }

    const escapedName = escape(rawData.name);

    if (rawData.kindString === 'Class') {
      return escapedName;
    }

    // if it is a function, and therefore has arguments
    const signature = dataForSignature.signatures?.[0];
    if (signature) {
      const { name } = rawData;
      const parameterString = _parameterString(
        parameters.map(param => param.name)
      );
      let returnType = '';
      if (rawData.kindString !== 'Constructor') {
        const type = this._type(signature, true);
        if (type !== 'void') {
          returnType = ': ' + this._type(signature, true);
        }
      }

      return name + parameterString + returnType;
    }

    const type = this._type(rawData.getSignature?.[0] || rawData, true);

    return `${escapedName}: ${type}`;
  }

  _parameter = param => ({
    name: param.name,
    type: this._type(param),
    description:
      param.comment && (param.comment.text || param.comment.shortText)
  });

  // Takes the data about a function / constructor and parses out the named params
  _parameters (rawData, dataByKey, isReact = false) {
    if (_isReflectedProperty(rawData)) {
      return this._parameters(rawData.type.declaration, dataByKey);
    }

    const signature = rawData.signatures && rawData.signatures[0];
    if (!signature || !Array.isArray(signature.parameters)) {
      return [];
    }

    return signature.parameters.map(param => {
      let name;
      try {
        if (isReadableName(param.name)) {
          name = param.name; // eslint-disable-line prefer-destructuring
        } else if (isReadableName(param.originalName)) {
          name = param.originalName;
        }
      } catch (error) {
        // Set name of parameter as 'option' if it's not readable.
        // console.error(error);
        name = isReact ? 'props' : 'options';
      }

      let properties = [];
      if (param.type && param.type.declaration) {
        properties = Array.isArray(param.type.declaration.children)
          ? param.type.declaration.children.map(this._parameter)
          : [];
      } else if (param.type && param.type.type === 'reference') {
        const dataForProperties = dataByKey[param.type.name] || {};
        properties = Array.isArray(dataForProperties.children)
          ? dataForProperties.children.map(this._parameter)
          : [];
      }

      return extend(this._parameter(param), {
        name,
        isOptions: name === (isReact ? 'props' : 'options'),
        optional: !!param.defaultValue,
        properties
      });
    });
  }

  render () {
    const rawData = this.dataByKey[this.props.name];
    if (typeof rawData === 'undefined') {
      // TODO: account for things that past versions may reference, but have
      // been removed in current version docs.json
      return null;
    }
    const args = this.templateArgs(rawData, this.props.react);
    return (
      <>
        <Header>
          <MainHeading title={args.name} id={args.id}>
            <StyledCode className='language-'>
              <a href={`#${args.id}`}>{args.signature}</a>
            </StyledCode>
          </MainHeading>
          {args.filepath && (
            <Subheading>
              <a
                href={`https://github.com/${args.repo}/blob/${args.branch}/${args.filepath}#L${args.lineno}`}
                target='_blank'
                rel='noopener noreferrer'
              >
                ({args.filepath}, line {args.lineno})
              </a>
            </Subheading>
          )}
        </Header>
        <Body>
          {args.summary && mdToReact(args.summary)}
          {args.type && <div>{args.type}</div>}
          {args.groups
            .filter(group => group.members.length)
            .map((group, index) => (
              <Fragment key={index}>
                <BodySubheading>{group.name}</BodySubheading>
                <TableWrapper>
                  <StyledTable className='field-table'>
                    <thead>
                      <tr>
                        <th>
                          Name /<br />
                          Type
                        </th>
                        <th>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.members.map((member, index) => (
                        <tr key={index}>
                          <td>
                            <h6>
                              <StyledCode className='language-'>
                                {member.name}
                              </StyledCode>
                            </h6>
                            <p>
                              <StyledCode className='language-'>
                                {member.type}
                              </StyledCode>
                            </p>
                          </td>
                          <td>
                            {member.description &&
                              mdToReact(member.description)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </StyledTable>
                </TableWrapper>
              </Fragment>
            ))}
        </Body>
        {args.children.properties.length > 0 && <MainHeading>Properties</MainHeading>}
        {args.children.properties.map(child => {
          return (
            <TypescriptApiBox
              key={child.name}
              docs={this.props.docs}
              name={`${this.props.name}.${child.name}`}
            />
          );
        })}
        {args.children.accessors.length > 0 && <MainHeading>Accessors</MainHeading>}
        {args.children.accessors.map(child => {
          return (
            <TypescriptApiBox
              key={child.name}
              docs={this.props.docs}
              name={`${this.props.name}.${child.name}`}
            />
          );
        })}
        {args.children.methods.length > 0 && <MainHeading>Methods</MainHeading>}
        {args.children.methods.map(child => {
          return (
            <TypescriptApiBox
              key={child.name}
              docs={this.props.docs}
              name={`${this.props.name}.${child.name}`}
            />
          );
        })}
      </>
    );
  }
}
