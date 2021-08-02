# DXOS Help Guide

## Frequently Asked Questions

---

## Troubleshooting

---

### TypeError: data.copy is not a function

---

#### **Problem**

This error is caused because [Node Buffer](https://nodejs.org/api/buffer.html) is interpreted as [Uint8Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array) when running in a browser.

#### **Solution**

To make this work as expected we need to polyfill Node's Buffer in the following way:

In your Webpack file:

- set `node.Buffer` to false to prevent Webpack from automatically providing anything when requiring Buffer

```js
node: {
  Buffer: false;
}
```

- inject the following plugin in order to tell Webpack what should provide when Buffer is required

```js
new webpack.ProvidePlugin({
  Buffer: [require.resolve('buffer/'), 'Buffer'],
});
```

## Common workflows

### Run command in each package

---

```
npm i -g @sfomin/for-each-package
```

From repo root:

```
for-each-package "yarn lint --fix || true"
```
