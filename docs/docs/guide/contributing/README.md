---
position: 0
label: Contributor Guide
dir:
  text: Contributing
  order: 40
---

# Contributing to DXOS

:::note
This section is under development
:::

We welcome all your input! Our [mission](https://docs.dxos.org/guide/why) is to enable developers to build a fully decentralized alternative to the existing Cloud, and we believe the path ahead involves all kinds of developers from far and wide collaborating here. Thank you for being here and contributing.

## We Develop with Github

We use github to host code, to track issues and feature requests, as well as accept pull requests. We Use [Github Flow](https://guides.github.com/introduction/flow/index.html), So All Code Changes Happen Through Pull Requests.

## Submitting Issues

We love your input. Please submit an issue for any of these reasons:

*   Reporting a reproducible bug
*   Discussing the current state of the code
*   Proposing new features, ideas, or process

Some of these other needs are not best handled by github issues:

*   Asking a question about something not working -> StackOverflow tag #dxos
*   A security vulnerability or incident -> email security@braneframe.com directly. do NOT post anywhere else please.
*   Any other needs to reach the development team -> Discord

## Submitting PRs

We welcome your pull requests:

1.  Fork the repo and create your branch from `main`.
2.  If you've added code that should be tested, add tests.
3.  If you've changed APIs, ensure you have JSDoc style `/** */` comments .
4.  Ensure the test suite passes `pnpm test`.
5.  Make sure your code lints `pnmp lint`.
6.  Create the pull request!

## Any contributions you make will be under the MIT Software License

In short, when you submit code changes, your submissions are understood to be under the same [MIT License](https://github.com/dxos/dxos/tree/main/LICENSE) that covers the project. Feel free to contact the maintainers if that's a concern.

## Report bugs using Github's [issues](https://github.com/dxos/dxos/issues)

We use GitHub issues to track public bugs. Report a bug by [opening a new issue](https://github.com/dxos/dxos/issues); it's that easy!

Please write bug reports with detail, background, and sample code.

**Great Bug Reports** tend to have:

*   A quick summary and/or background
*   Steps to reproduce
    *   Be specific!
    *   Give sample code reproducing the issue if you can.
*   What you expected would happen
*   What actually happens
*   Notes (possibly including why you think this might be happening, or stuff you tried that didn't work)

We *love* thorough bug reports. Thank you.

## Coding Style

We use `prettier` and `eslint`

*   2 spaces for indentation rather than tabs
*   no trailing commas

Run `pnpm lint` to conform the code.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
