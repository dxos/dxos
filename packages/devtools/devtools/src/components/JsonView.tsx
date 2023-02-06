//
// Copyright 2023 DXOS.org
//

import * as pb from 'protobufjs';
import React, { FC } from 'react';
import SyntaxHighlighter from 'react-syntax-highlighter';
// eslint-disable-next-line no-restricted-imports
import style from 'react-syntax-highlighter/dist/esm/styles/hljs/a11y-light';

import { mx } from '@dxos/react-components';

const prettifyData = (data: any, type: pb.Type) => {
  let result: any = {};
  type.fieldsArray.forEach((field) => {
    field.resolve();
    if (!field.repeated) {
      if (field.resolvedType instanceof pb.Enum) {
        result[field.name] = Object.entries(field.resolvedType.values).filter(
          ([key, value]) => value === data[field.name]
        )[0];
      } else if (field.resolvedType instanceof pb.Type) {
        result[field.name] = prettifyData(data[field.name], field.resolvedType);
      } else if (!field.resolvedType) {
        result[field.name] = data[field.name];
      }
    }
  });
  if (Object.keys(result).length === 0) {
    result = data;
    console.log('result is empty', result);
  }
  return result;
};

// TODO(mykola): Add proto schema. Decode bytes.
export const JsonView: FC<{ data: Object; className?: string; type?: pb.Type }> = ({ data, className, type }) => {
  const prettifiedData = type ? prettifyData(data, type) : data;
  return (
    <SyntaxHighlighter className={mx('flex flex-1 text-xs', className)} language='json' style={style}>
      {JSON.stringify(prettifiedData, undefined, 2)}
    </SyntaxHighlighter>
  );
};
