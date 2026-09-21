# DOSSIER — a brutalist news system

A mobile-friendly, multi-file rebuild of the dossier board demo.

## Run it

Serve the folder over HTTP (file:// won't load posts due to browser security):

```bash
cd dossier && python3 -m http.server 8000
```

Then open http://localhost:8000

## Structure

```
dossier/
├── index.html              # shell: ticker, slim masthead, tabs, views
├── assets/
│   ├── css/style.css       # mobile-first, 3 themes (light/dark/brutalism)
│   └── js/
│       ├── marked.min.js   # vendored markdown parser (offline-safe)
│       └── app.js          # router, board, dossier view, theme, search
├── posts/
│   ├── manifest.json       # the file list the board reads
│   └── 023-*.md            # the articles
└── README.md
```

## Publishing (GitHub workflow)

1. Write a post as Markdown in `/posts`, starting with frontmatter:

```yaml
---
title: "Headline"
fileNo: "023-05"
type: "LEAD"        # LEAD / LEAK / DATA / MEMO
date: "21.09.26"
author: "DOSSIER DESK"
status: "verified"  # or "unverified"
standfirst: "One-line summary under the headline."
tags: [infra, leak]
summary: "Card text shown on the board."
---
```

2. Add the file to `posts/manifest.json`.
3. Push. Set `REPO: "yourname/yourrepo"` at the top of `assets/js/app.js`
   and the board will pull posts from `raw.githubusercontent.com` —
   no rebuild, no redeploy.

## Field components (markdown extensions)

| Syntax | Renders as |
|---|---|
| `\|\|spoiler\|\|` | blurred text, tap to reveal |
| `==redacted==` | black-bar redaction |
| `![alt](img.jpg "spoiler: reason")` | sealed image, tap to unseal |
| `[[023-02]]` / `[[023-02\|label]]` | internal link to another file |
| `[text](dossier:023-02)` | internal link (alt syntax) |
| `[^1]` + `[^1]: note` | footnotes |
| `:::memo Title` … `:::` | field-memo callout box |
| `:::pull` … `:::` | pull quote |
| `> quote` | styled blockquote |
| every `## heading` | gets a `#anchor` link + TOC entry |

## Hosting

Any static host works: GitHub Pages, Netlify, Vercel, Cloudflare Pages.
Push this folder and you're live.
