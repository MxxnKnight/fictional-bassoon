/* ═══════════════════════════════════════════════
   DOSSIER — app.js
   Board + dossier reader. Posts are Markdown files.
   Set REPO to "user/repo" to pull /posts from GitHub,
   or leave "" to serve /posts locally / from Pages.
   ═══════════════════════════════════════════════ */
"use strict";

const CONFIG = {
  REPO: "MxxnKnight/fictional-bassoon", // GitHub repo — posts load from raw.githubusercontent.com
  BRANCH: "main",
  POSTS_DIR: "posts",
};

const POSTS_BASE = CONFIG.REPO
  ? `https://raw.githubusercontent.com/${CONFIG.REPO}/${CONFIG.BRANCH}/${CONFIG.POSTS_DIR}/`
  : `${CONFIG.POSTS_DIR}/`;

const THEMES = ["light", "dark", "brutalism"];
const THEME_META = {
  light:     { icon: "☀", label: "LIGHT" },
  dark:      { icon: "☾", label: "DARK" },
  brutalism: { icon: "▣", label: "BRUTAL" },
};

let POSTS = [];   // manifest entries, newest-first by fileNo desc

/* ───────── utils ───────── */
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const slugify = (t) => t.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").slice(0, 60);

async function getJSON(url) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`HTTP ${r.status} — ${url}`);
  return r.json();
}
async function getText(url) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`HTTP ${r.status} — ${url}`);
  return r.text();
}

/* ───────── theme: one compact button, cycles ───────── */
function currentTheme() {
  return document.documentElement.dataset.theme || "light";
}
function applyTheme(name, save = true) {
  document.documentElement.dataset.theme = name;
  $("#themeIcon").textContent = THEME_META[name].icon;
  $("#themeLabel").textContent = THEME_META[name].label;
  $("#themeBtn").setAttribute("aria-label", `Theme: ${name}. Activate to switch.`);
  const tag = $("#buildTag");
  if (tag) tag.textContent = `BUILD: v023.4 // ${name.toUpperCase()} ACTIVE`;
  if (save) { try { localStorage.setItem("dossier-theme", name); } catch (_) {} }
}
function initTheme() {
  let t = null;
  try { t = localStorage.getItem("dossier-theme"); } catch (_) {}
  if (!t || !THEMES.includes(t)) {
    t = (window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
  }
  applyTheme(t, false);
  $("#themeBtn").addEventListener("click", () => {
    const next = THEMES[(THEMES.indexOf(currentTheme()) + 1) % THEMES.length];
    applyTheme(next);
  });
}

/* ───────── markdown pipeline ───────── */

/** Split YAML-ish frontmatter off the top of a post. */
function parseFrontmatter(src) {
  const m = src.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!m) return { meta: {}, body: src };
  const meta = {};
  let listKey = null;
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (kv) {
      listKey = null;
      let v = kv[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (v === "") { meta[kv[1]] = []; listKey = kv[1]; }
      else meta[kv[1]] = v;
    } else {
      const li = line.match(/^\s*-\s*(.+)$/);
      if (li && listKey && Array.isArray(meta[listKey])) meta[listKey].push(li[1].trim());
    }
  }
  return { meta, body: m[2] };
}

/** Footnotes: collect [^id]: defs, replace [^id] refs, append section. */
function extractFootnotes(md) {
  const defs = new Map();
  const order = [];
  md = md.replace(/^\[\^([^\]]+)\]:\s*(.+)$/gm, (_, id, text) => {
    if (!defs.has(id)) { defs.set(id, text.trim()); order.push(id); }
    return "";
  });
  const seen = new Map();
  md = md.replace(/\[\^([^\]]+)\]/g, (_, id) => {
    if (!defs.has(id)) return _;
    if (!seen.has(id)) seen.set(id, seen.size + 1);
    const n = seen.get(id);
    return `@@FNREF:${id}:${n}@@`;
  });
  return { md, defs, order: order.filter((id) => seen.has(id)) };
}

/** Custom inline/block components, pre-marked. */
function preprocessComponents(md) {
  // ||spoiler|| → placeholder (inline, non-greedy)
  md = md.replace(/\|\|([\s\S]+?)\|\|/g, (_, t) => `@@SPOILER:${btoa(unescape(encodeURIComponent(t)))}@@`);
  // ==redacted== → placeholder
  md = md.replace(/==([^=\n]+?)==/g, (_, t) => `@@REDACTED:${btoa(unescape(encodeURIComponent(t)))}@@`);
  // :::memo Title ... :::  and  :::pull ... :::
  md = md.replace(/^:::(memo|pull)\s*(.*)$\n([\s\S]*?)^:::$/gm, (_, kind, title, body) =>
    `\n@@BLOCK:${kind}:${btoa(unescape(encodeURIComponent(title.trim())))}:${btoa(unescape(encodeURIComponent(body)))}@@\n`);
  // [[023-02]] or [[023-02|label]] → internal link
  md = md.replace(/\[\[([\w-]+)(?:\|([^\]]+))?\]\]/g, (_, id, label) => `@@WIKI:${id}:${btoa(unescape(encodeURIComponent(label || id)))}@@`);
  return md;
}

function decodeB64(s) { try { return decodeURIComponent(escape(atob(s))); } catch (_) { return ""; } }

/** Restore placeholders into final HTML after marked runs. */
function postprocessHTML(html, ctx) {
  // footnote refs
  html = html.replace(/@@FNREF:([^:]+):(\d+)@@/g, (_, id, n) =>
    `<a class="footnote-ref" id="fnref-${esc(id)}" href="#fn-${esc(id)}" aria-label="Footnote ${n}">[${n}]</a>`);
  // spoilers
  html = html.replace(/@@SPOILER:([A-Za-z0-9+/=]+)@@/g, (_, b) =>
    `<span class="spoiler" tabindex="0" role="button" aria-label="Spoiler, activate to reveal">${esc(decodeB64(b))}</span>`);
  // redactions
  html = html.replace(/@@REDACTED:([A-Za-z0-9+/=]+)@@/g, (_, b) =>
    `<span class="redacted" aria-label="Redacted">${esc(decodeB64(b))}</span>`);
  // wiki links
  html = html.replace(/@@WIKI:([\w-]+):([A-Za-z0-9+/=]+)@@/g, (_, id, b) => {
    const target = POSTS.find((p) => p.fileNo === id || p.id === id);
    const href = target ? `#/file/${target.id}` : `#/file/${esc(id)}`;
    return `<a class="wiki-link" href="${href}">◈ ${esc(decodeB64(b))}</a>`;
  });
  // blocks: memo / pull — body gets a nested marked render
  html = html.replace(/@@BLOCK:(memo|pull):([A-Za-z0-9+/=]*):([A-Za-z0-9+/=]+)@@/g, (_, kind, tb, bb) => {
    const title = decodeB64(tb), body = decodeB64(bb);
    const inner = marked.parse(body, { breaks: false });
    if (kind === "memo") return `<aside class="memo"><div class="memo__title">${esc(title) || "FIELD MEMO"}</div>${inner}</aside>`;
    return `<aside class="pull">${inner}</aside>`;
  });
  // footnotes section
  if (ctx.footnotes.order.length) {
    const items = ctx.footnotes.order.map((id) => {
      const n = id; // display: use definition order number
      const idx = ctx.footnotes.order.indexOf(id) + 1;
      return `<li id="fn-${esc(id)}">${esc(ctx.footnotes.defs.get(id))} <a class="footnote-back" href="#fnref-${esc(id)}" aria-label="Back to reference">↩</a></li>`;
    }).join("");
    html += `<section class="footnotes" aria-label="Footnotes"><ol>${items}</ol></section>`;
  }
  return html;
}

/* marked renderer: heading anchors + smart links + sealed images + table wrap */
function buildRenderer() {
  const renderer = new marked.Renderer();
  const headings = [];

  renderer.heading = (text, level) => {
    const id = "h-" + slugify(text.replace(/<[^>]+>/g, ""));
    if (level <= 3) headings.push({ level, text: text.replace(/<[^>]+>/g, ""), id });
    return `<h${level} id="${id}">${text}<a class="h-anchor" href="#${id}" aria-label="Link to this section">#</a></h${level}>`;
  };

  renderer.link = (href, title, text) => {
    // internal dossier: links
    if (href && href.startsWith("dossier:")) {
      const id = href.slice(8);
      const target = POSTS.find((p) => p.fileNo === id || p.id === id);
      return `<a href="#/file/${target ? target.id : esc(id)}">◈ ${text}</a>`;
    }
    const isExt = href && /^(https?:)?\/\//i.test(href);
    const t = title ? ` title="${esc(title)}"` : "";
    if (isExt) return `<a class="ext" href="${esc(href)}"${t} target="_blank" rel="noopener noreferrer">${text}</a>`;
    return `<a href="${esc(href)}"${t}>${text}</a>`;
  };

  renderer.image = (href, title, text) => {
    // resolve relative images against posts base
    let src = href || "";
    if (!/^(https?:|data:|\/)/i.test(src)) src = POSTS_BASE + src;
    const alt = esc(text || "");
    if (title && /^spoiler\s*:/i.test(title)) {
      const reason = esc(title.replace(/^spoiler\s*:\s*/i, ""));
      return `<figure class="sealed" data-sealed><img src="${esc(src)}" alt="${alt}" loading="lazy">` +
        `<button class="sealed__cover" type="button"><span class="sealed__label">SEALED EVIDENCE — TAP TO UNSEAL</span>` +
        (reason ? `<span class="sealed__reason">${reason}</span>` : "") + `</button>` +
        (alt ? `<figcaption>${alt}</figcaption>` : "") + `</figure>`;
    }
    const cap = title ? ` title="${esc(title)}"` : "";
    return `<figure><img src="${esc(src)}" alt="${alt}"${cap} loading="lazy">` +
      (alt ? `<figcaption>${alt}</figcaption>` : "") + `</figure>`;
  };

  renderer.table = (header, body) =>
    `<div class="table-wrap"><table><thead>${header}</thead><tbody>${body}</tbody></table></div>`;

  return { renderer, headings };
}

function renderMarkdown(src) {
  const { meta, body } = parseFrontmatter(src);
  const { md, defs, order } = extractFootnotes(body);
  const pre = preprocessComponents(md);
  const { renderer, headings } = buildRenderer();
  marked.setOptions({ renderer, breaks: false, gfm: true });
  let html = marked.parse(pre);
  html = postprocessHTML(html, { footnotes: { defs, order } });
  return { meta, html, headings };
}

/* ───────── board ───────── */
function stampClass(type) {
  const t = (type || "").toLowerCase();
  if (t.includes("lead")) return "stamp--lead";
  if (t.includes("leak")) return "stamp--leak";
  if (t.includes("data")) return "stamp--data";
  if (t.includes("memo")) return "stamp--memo";
  return "";
}

function cardHTML(p) {
  const tags = (p.tags || []).map((t) => `<span class="tag">#${esc(t)}</span>`).join("");
  return `<a class="card" href="#/file/${p.id}">
    <div class="card__top">
      <span class="stamp ${stampClass(p.type)}">${esc((p.type || "FILE").toUpperCase())} // ${esc(p.fileNo)}</span>
      <span class="card__go" aria-hidden="true">↗</span>
    </div>
    <h2 class="card__title">${esc(p.title)}</h2>
    <p class="card__sum">${esc(p.summary || "")}</p>
    <div class="card__tags">${tags}</div>
  </a>`;
}

function renderBoard(filter = "") {
  const q = filter.trim().toLowerCase();
  const list = POSTS.filter((p) => {
    if (!q) return true;
    return [p.title, p.summary, p.fileNo, p.type, (p.tags || []).join(" ")].join(" ").toLowerCase().includes(q);
  });
  const grid = $("#cardGrid");
  grid.innerHTML = list.length
    ? list.map(cardHTML).join("") +
      `<div class="card card--note" aria-hidden="true">
         <h2 class="card__title">SYSTEM NOTE</h2>
         <p class="card__sum">Board is sorted by file number, not recency. Newest leaks sink to bottom until verified. Click any file to open dossier.</p>
       </div>`
    : `<p class="empty">NO FILES MATCH “${esc(filter)}”. TRY ANOTHER QUERY.</p>`;
  $("#activeCount").textContent = POSTS.length;
  $("#fileCount").textContent = `${POSTS.length} FILES`;
  // newest file number carries the latest update
  $("#lastUpdate").textContent = POSTS.length ? POSTS[0].date || "—" : "—";
}

/* ───────── dossier view ───────── */
function tocHTML(headings) {
  if (!headings.length) return "";
  const items = headings.map((h) => `<li><a href="#${h.id}">${esc(h.text)}</a></li>`).join("");
  return `<details class="dossier__toc"><summary>CONTENTS — ${headings.length} SECTIONS</summary><ol>${items}</ol></details>`;
}

async function renderFile(id) {
  const post = POSTS.find((p) => p.id === id);
  const article = $("#dossierArticle");
  if (!post) {
    article.innerHTML = `<p class="empty">FILE NOT FOUND. <a href="#/board">RETURN TO BOARD</a>.</p>`;
    return;
  }
  $("#dossierFileNo").textContent = `FILE // ${post.fileNo}`;
  article.innerHTML = `<p class="empty">OPENING FILE ${esc(post.fileNo)}…</p>`;
  try {
    const src = await getText(POSTS_BASE + post.file);
    const { meta, html, headings } = renderMarkdown(src);
    const type = meta.type || post.type || "FILE";
    const date = meta.date || post.date || "";
    const byline = meta.author || post.author || "DOSSIER DESK";
    const tags = (meta.tags && meta.tags.length ? meta.tags : post.tags || [])
      .map((t) => `<span class="tag">#${esc(String(t))}</span>`).join(" ");
    article.innerHTML = `
      ${meta.dateline ? `<span class="dateline">${esc(meta.dateline)}</span>` : ""}
      <div class="dossier__kicker">
        <span class="stamp ${stampClass(type)}">${esc(String(type).toUpperCase())} // ${esc(post.fileNo)}</span>
        ${meta.status ? `<span class="chip chip--verified">${esc(String(meta.status).toUpperCase())}</span>` : ""}
      </div>
      <h1 class="dossier__title">${esc(meta.title || post.title)}</h1>
      ${meta.standfirst ? `<p class="dossier__standfirst">${esc(meta.standfirst)}</p>` : ""}
      <div class="dossier__byline"><span>BY ${esc(byline)}</span>${date ? `<span>// ${esc(date)}</span>` : ""}<span>// ${tags}</span></div>
      ${tocHTML(headings)}
      <div class="dossier__body">${html}</div>`;
    bindArticleInteractions(article);
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  } catch (e) {
    article.innerHTML = `<p class="empty">COULD NOT OPEN FILE ${esc(post.fileNo)}.<br><span style="font-size:11px">${esc(e.message)}</span><br><br><a href="#/board">← RETURN TO BOARD</a></p>`;
  }
}

function bindArticleInteractions(root) {
  root.querySelectorAll(".spoiler").forEach((el) => {
    const toggle = () => el.classList.toggle("revealed");
    el.addEventListener("click", toggle);
    el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } });
  });
  root.querySelectorAll("[data-sealed]").forEach((fig) => {
    const btn = fig.querySelector(".sealed__cover");
    if (btn) btn.addEventListener("click", () => fig.classList.add("unsealed"));
  });
}

/* ───────── router ───────── */
function setTab(name) {
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("is-active", t.dataset.tab === name));
}
function showView(name) {
  ["board", "file", "publish"].forEach((v) => { $(`#view-${v}`).hidden = v !== name; });
}
async function route() {
  const hash = location.hash || "#/board";
  const m = hash.match(/^#\/file\/([\w-]+)/);
  if (m) { setTab(""); showView("file"); await renderFile(m[1]); return; }
  if (hash.startsWith("#/publish")) { setTab("publish"); showView("publish"); window.scrollTo(0, 0); return; }
  setTab("board"); showView("board"); renderBoard($("#searchInput").value);
}

/* ───────── boot ───────── */
async function boot() {
  initTheme();
  try {
    const manifest = await getJSON(POSTS_BASE + "manifest.json");
    POSTS = (manifest.posts || [])
      .slice()
      .sort((a, b) => String(b.fileNo).localeCompare(String(a.fileNo), undefined, { numeric: true }));
  } catch (e) {
    $("#cardGrid").innerHTML = `<p class="empty">MANIFEST NOT FOUND.<br><span style="font-size:11px">${esc(e.message)}</span></p>`;
    return;
  }
  let deb;
  $("#searchInput").addEventListener("input", (e) => {
    clearTimeout(deb);
    deb = setTimeout(() => { if (!$("#view-board").hidden) renderBoard(e.target.value); }, 160);
  });
  window.addEventListener("hashchange", route);
  route();
}

document.addEventListener("DOMContentLoaded", boot);
