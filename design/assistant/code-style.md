# Code style

This document defines the repository code style.

> To be used with LLMs to generate consistent code.

## Classes

- Class constructors should define a params interface that is defined just above the class with `<className>Params` name:

```ts
export interface AnthropicBackendParams {
  apiKey: string;
}

export class AnthropicBackend implements AIBackend {
private readonly _apiKey: string;
private readonly _client: Anthropic;

constructor(params: AnthropicBackendParams) {
  this._apiKey = params.apiKey;
  this._client = new Anthropic({ apiKey: params.apiKey });
}
```

- We use typescript private fields and not ES #private fields.

```ts
private _name: string;
```

- Fields that are not changed should be marked as `readonly`.

## Order of code in the file

- Unexported functions should be placed at the bottom of the file.
- Constants that define important configuration should be placed at the top.
