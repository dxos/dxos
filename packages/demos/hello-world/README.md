# Hello World

To deploy:

```bash
dx dxns deploy --config ./tmp/dx.yml --path ./dist --tag latest --version false
```

To view the deployed resource:

```bash
dx ns resource get <DOMAIN>:app.hello-world
```
