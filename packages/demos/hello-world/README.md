# Hello World

Check your profile is set-up:

```bash
dx profile config
```

To deploy:

```bash
dx dxns deploy --config ./tmp/dx.yml --tag latest --version false
```

To view the deployed resource:

```bash
dx ns resource get <DOMAIN>:app.hello-world
```
