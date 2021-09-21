# Protocols Docs

## Testing

To spin up this repo documentation on your local environment:

```bash
$ yarn
$ yarn dev
```

## Troubleshooting

- Edit `node_modules/gatsby-theme-apollo-docs/node-config.js` to debug.
- There must be an `content/index.md[x]` file.
- There must be AT LEAST one `.md` AND one `.mdx` file.

## Deploy

To deploy the docs into the publish URL, you will need to update your `production` local branch and then push it, this will trigger Netlify CI and automatically publish it.

```bash
$ git fetch
$ git checkout production
$ git rebase origin/main
$ git push origin production
```