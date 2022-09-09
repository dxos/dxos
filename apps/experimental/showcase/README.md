# @dxos/showcase

## Components

### ShowcaseComponent
Component similar to MUI, gets a component and all the RawJS and RawTS|RawTSX to display it and also its code.

### TypescriptApiBox
Component that helps you link to an API Reference from Typedoc.
First you need to wrap `TypescriptApiBox` into a High Order Component, example:

```jsx
import React from 'react';

import { TypescriptApiBox } from '@dxos/showcase';

import docs from "../data/dxos-api.json";

export const APIReference = ({ name }) => {
    return (
        <TypescriptApiBox docs={docs} name={name} />
    );
};
```

This passes the docs json object from a Typedoc output into the component.
See: https://typedoc.org/guides/options/#json.

## Usage

```jsx
import { ShowcaseComponent } from '@dxos/showcase';
import { APIReference } from '../../src/components';

// Import the component using `?@dxos/showcase` query.
import * as Hello from '../../src/testing/hello/Hello.js?@dxos/showcase';

## Components

### Hello Component
<ShowcaseComponent 
  component={Hello.component} 
  rawContent={Hello.rawContent} 
/>

### useClient
<APIReference name='useClient' />

```


## Loader

The file `loader.js` parses the JS file and their TS|TSX files to use it along with `ShowcaseComponent`.
