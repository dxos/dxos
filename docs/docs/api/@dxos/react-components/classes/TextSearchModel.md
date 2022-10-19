# Class `TextSearchModel`
> Declared in [`packages/sdk/react-components/src/SearchAutocomplete/SearchModel.ts`]()

Simple text search model.

## Constructors
```ts
new TextSearchModel <T> (_values: SearchResult<T>[], _delay: number) => TextSearchModel<T>
```

## Properties
### `_results: SearchResult<T>[]`
### `_timeout: Timeout`
### `_update: Event<SearchResult<T>[]>`

## Functions
```ts
setText (text: string) => void
```
```ts
subscribe (callback: function) => function
```