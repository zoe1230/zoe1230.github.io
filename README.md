# zoe1230.github.io

Personal site of [Zhanhong Chen](https://zoe1230.github.io/).

```bash
npm ci
npm run docs:dev
```

Tutorial Markdown is copied in at build time:

- [tutorial-generative-foundations](https://github.com/zoe1230/tutorial-generative-foundations)
- Local sibling `tutorial-fine-detail-depth/`, with a copy under `tutorials/fine-detail-depth/` until that folder is also a GitHub repository

After pushing `main`, finish publishing in GitHub:

1. This repo → Settings → Pages → Source: **GitHub Actions**
2. This repo → Settings → Default branch: **main** (keep `master` as the old Jekyll archive)
3. [tutorial-generative-foundations](https://github.com/zoe1230/tutorial-generative-foundations) → Settings → Pages → **Disable**
