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
  PRESS_CODE: "ink", // access code for the secret press room (#/press) — obscurity, not security
};

const POSTS_BASE = CONFIG.REPO
  ? `https://raw.githubusercontent.com/${CONFIG.REPO}/${CONFIG.BRANCH}/${CONFIG.POSTS_DIR}/`
  : `${CONFIG.POSTS_DIR}/`;

const THEMES = ["light", "dark", "brutalism"];
const THEME_META = {
  light:     { icon: "☀", label: "LIGHT" },
  dark:      { icon: "☾", label: "DARK" },
  brutalism: { icon: "◼", label: "BRUTALISM" },
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
  const tl = $("#themeLabel");
  if (tl) tl.textContent = THEME_META[name].label;
  $("#themeBtn").setAttribute("aria-label", `Theme: ${name}. Activate to switch.`);
  const tag = $("#buildTag");
  if (tag) { const m = tag.textContent.match(/BUILD:\s*(v[\d.]+)/); tag.textContent = `BUILD: ${m ? m[1] : "?"} // ${name.toUpperCase()} ACTIVE`; }
  if (save) { try { localStorage.setItem("dossier-theme", name); } catch (_) {} }
}
/** v1 theme-switch glitch: shake the page + white flash. */
function glitchSwitch() {
  if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const app = document.getElementById("app");
  if (app) {
    app.classList.add("glitch-active");
    setTimeout(() => app.classList.remove("glitch-active"), 400);
  }
  const flash = document.createElement("div");
  flash.className = "theme-flash";
  flash.setAttribute("aria-hidden", "true");
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 160);
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
    if (next === currentTheme()) return;
    applyTheme(next);
    glitchSwitch();
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

/* Base64 for placeholders: padding stripped so "==" redaction syntax
   can never match inside a placeholder. decodeB64 re-pads. */
const b64e = (s) => btoa(unescape(encodeURIComponent(String(s)))).replace(/=+$/, "");
function decodeB64(s) {
  try {
    s = String(s);
    s += "=".repeat((4 - (s.length % 4)) % 4);
    return decodeURIComponent(escape(atob(s)));
  } catch (_) { return ""; }
}

const BLOCK_KINDS = new Set(["memo", "pull", "timeline", "tabs", "codetabs", "collapse", "box", "section", "stat", "person", "movie", "bar", "pie", "table", "editor", "correction", "update", "tldr", "factcheck"]);

/** Apply fn only to text outside fenced code blocks, so examples stay literal.
    Closing fence must be at least as long as the opening fence (CommonMark). */
function outsideCode(md, fn) {
  const lines = md.split("\n");
  let fence = null; // the opening fence run (``` or ~~~) while inside code
  const buf = [], out = [];
  const flush = () => {
    if (buf.length) { out.push(fence ? buf.join("\n") : fn(buf.join("\n"))); buf.length = 0; }
  };
  for (const line of lines) {
    const m = line.match(/^(`{3,}|~{3,})/);
    if (m) {
      const run = m[1];
      if (!fence) { flush(); out.push(line); fence = run; }
      else if (run[0] === fence[0] && run.length >= fence.length) { flush(); out.push(line); fence = null; }
      else buf.push(line); // shorter/inner fence — content, not a boundary
    } else buf.push(line);
  }
  flush();
  return out.join("\n");
}

/** Custom inline/block components, pre-marked. Never touches fenced code. */
function preprocessComponents(md) {
  md = encodeFenceFlags(md);
  md = extractCodeTabs(md);
  return outsideCode(md, (chunk) => {
    // shield inline code spans so `{% %}`, tooltips etc. inside them stay literal
    const codes = [];
    chunk = chunk.replace(/`[^`\n]+`/g, (m) => { codes.push(m); return `@@CODE${codes.length - 1}@@`; });
    // tooltips: [text](tooltip: tip shown on hover / tap)
    chunk = chunk.replace(/\[([^\]]+)\]\(tooltip:\s*([^)]+)\)/g, (_, t, tip) =>
      `@@TIP:${b64e(t)}:${b64e(tip.trim())}@@`);
    // badges & tags: :badge[..] :badge-red[..] :badge-ghost[..] :tag[..]
    chunk = chunk.replace(/:(badge(?:-red|-ghost)?|tag)\[([^\]]+)\]/g, (_, kind, t) =>
      `@@BADGE:${kind}:${b64e(t)}@@`);
    // text highlights: :hl[text] and color variants :hl-red[text] :hl-blue[text] :hl-green[text]
    chunk = chunk.replace(/:hl-(red|blue|green)\[([^\]]+)\]/g, (_, c, t) => `@@HL:${c}:${b64e(t)}@@`);
    chunk = chunk.replace(/:hl\[([^\]]+)\]/g, (_, t) => `@@HL::${b64e(t)}@@`);
    // ||spoiler|| → placeholder (inline, non-greedy); ||~text|| → blurred spoiler
    chunk = chunk.replace(/\|\|([\s\S]+?)\|\|/g, (_, t) => {
      let blur = false;
      if (t.startsWith("~")) {
        blur = true;
        t = t.slice(1);
        if (t.endsWith("~")) t = t.slice(0, -1); // tolerate ||~text~||
      }
      return `@@SPOILER:${blur ? "1" : "0"}:${b64e(t)}@@`;
    });
    // ==redacted== → placeholder
    chunk = chunk.replace(/==([^=\n]+?)==/g, (_, t) => `@@REDACTED:${b64e(t)}@@`);
    // :::kind args ... :::  directive blocks (memo, pull, timeline, tabs, collapse, box, section, stat, person, movie).
    // Blocks nest: replace innermost-first (bodies containing no nested opener), looping until stable,
    // so e.g. a :::table can live inside a :::box or :::tabs.
    const blockRe = /^:::(\w+)([^\n]*)\n((?:(?!^:::)[\s\S])*?)^:::$/gm;
    let prevChunk;
    do {
      prevChunk = chunk;
      chunk = chunk.replace(blockRe, (_, kind, args, body) => {
        if (!BLOCK_KINDS.has(kind.toLowerCase())) return _;
        return `\n@@BLOCK:${kind.toLowerCase()}:${b64e(args.trim())}:${b64e(body)}@@\n`;
      });
    } while (chunk !== prevChunk);
    // {% youtube|video|audio|embed|tweet|x|reddit ... %} embeds
    chunk = chunk.replace(/\{%\s*(youtube|video|audio|embed|tweet|x|reddit)\s+([^%]*?)%\}/g, (_, kind, args) =>
      `@@EMBED:${kind}:${b64e(args.trim())}@@`);
    // {% download|logo|img|stars ... %} inline directives
    chunk = chunk.replace(/\{%\s*(download|logo|img|stars)\s+([^%]*?)%\}/g, (_, kind, args) =>
      `@@DIRECTIVE:${kind}:${b64e(args.trim())}@@`);
    // :stars[4.5] inline rating
    chunk = chunk.replace(/:stars\[([^\]]+)\]/g, (_, v) => `@@DIRECTIVE:stars:${b64e(v.trim())}@@`);
    // fancy divider: a line of only ***
    chunk = chunk.replace(/^[ \t]*\*{3,}[ \t]*$/gm, "@@DIVIDER@@");
    // alerts: > [!KIND] optional title, then > body lines
    chunk = chunk.replace(/^>[ \t]*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*([^\n]*)\n((?:^[ \t]*>[^\n]*\n?)*)/gim,
      (_, kind, first, rest) => {
        const title = first.trim();
        const body = rest.replace(/^[ \t]*>[ \t]?/gm, "").replace(/\s+$/, "");
        return `\n@@ALERT:${kind.toLowerCase()}:${b64e(title)}:${b64e(body)}@@\n`;
      });
    // [[023-02]] or [[023-02|label]] → internal link
    chunk = chunk.replace(/\[\[([\w-]+)(?:\|([^\]]+))?\]\]/g, (_, id, label) => `@@WIKI:${id}:${b64e(label || id)}@@`);
    // restore shielded inline code spans
    chunk = chunk.replace(/@@CODE(\d+)@@/g, (_, i) => codes[+i] ?? "");
    return chunk;
  });
}

/** Render a markdown fragment (nested component bodies). Headings stay out of the TOC. */
function renderInner(md) {
  if (!md || !md.trim()) return "";
  const { renderer } = buildRenderer();
  marked.setOptions({ renderer, breaks: false, gfm: true });
  return postprocessHTML(marked.parse(preprocessComponents(md)), { footnotes: { defs: new Map(), order: [] } });
}

/** key="value" pairs plus an optional bare first token (used as src). */
function parseKV(s) {
  const kv = {};
  const re = /(\w+)="([^"]*)"/g;
  let m;
  while ((m = re.exec(s))) kv[m[1]] = m[2];
  const bare = s.replace(/(\w+)="([^"]*)"/g, " ").trim().split(/\s+/)
    .filter(Boolean).map((t) => t.replace(/^"|"$/g, ""));
  if (bare.length && !kv.src) kv.src = bare[0];
  return kv;
}

function resolveMedia(src) {
  if (/^(https?:|data:|\/|#)/i.test(src)) return src;
  return POSTS_BASE + src;
}

function renderTimeline(body) {
  const items = [];
  for (const line of body.split("\n")) {
    const m = line.match(/^\s*-\s*(.+)$/);
    if (!m) continue;
    const text = m[1].trim();
    const sp = text.match(/^(.*?)\s*(?:—|\||--)\s*(.+)$/);
    const time = sp ? sp[1].trim() : "";
    const event = sp ? sp[2] : text;
    items.push(`<li><span class="timeline__time">${esc(time)}</span><div class="timeline__event">${renderInner(event)}</div></li>`);
  }
  if (!items.length) return "";
  return `<ol class="timeline">${items.join("")}</ol>`;
}

function renderTabs(body) {
  const parts = body.split(/^##\s+(.+)$/gm);
  const tabs = [];
  for (let i = 1; i < parts.length; i += 2) tabs.push({ title: parts[i].trim(), body: parts[i + 1] || "" });
  if (!tabs.length) return renderInner(body);
  const idp = "ct" + Math.random().toString(36).slice(2, 8);
  const bar = tabs.map((t, i) =>
    `<button class="ctabs__btn${i === 0 ? " is-active" : ""}" type="button" role="tab" aria-selected="${i === 0}" data-ctab="${idp}-${i}">${esc(t.title)}</button>`).join("");
  const panels = tabs.map((t, i) =>
    `<div class="ctabs__panel${i === 0 ? " is-active" : ""}" id="${idp}-${i}" role="tabpanel">${renderInner(t.body)}</div>`).join("");
  return `<div class="ctabs" data-ctabs><div class="ctabs__bar" role="tablist">${bar}</div>${panels}</div>`;
}

function renderBox(args, body) {
  const m = args.match(/^(red|ghost)?\s*(.*)$/);
  const kind = m[1] || "", title = m[2].trim();
  return `<div class="dbox${kind ? " dbox--" + kind : ""}">` +
    (title ? `<div class="dbox__title">${esc(title)}</div>` : "") +
    `<div class="dbox__body">${renderInner(body)}</div></div>`;
}

/** Render a markdown fragment inline (no wrapping <p>) — for stat numbers, etc. */
function renderInline(md) {
  if (!md || !md.trim()) return "";
  const { renderer } = buildRenderer();
  marked.setOptions({ renderer, breaks: false, gfm: true });
  return postprocessHTML(marked.parseInline(preprocessComponents(md)), { footnotes: { defs: new Map(), order: [] } });
}

function renderStat(args, body) {
  const kind = /^(red|ghost)$/.test(args.trim()) ? args.trim() : "";
  const lines = body.split("\n");
  let i = 0;
  while (i < lines.length && !lines[i].trim()) i++;
  const num = (lines[i] || "").trim();
  const label = lines.slice(i + 1).join("\n").trim();
  return `<div class="stat${kind ? " stat--" + kind : ""}" role="figure">` +
    `<div class="stat__number">${renderInline(num) || "&nbsp;"}</div>` +
    (label ? `<div class="stat__label">${renderInner(label)}</div>` : "") + `</div>`;
}

/** Chart data: one "Label — 40" / "Label: 40" per line. */
function parseChartData(body) {
  const rows = [];
  for (const line of body.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    let m = t.match(/^(.*?)\s*[—–:]\s*(-?[\d.,]+)\s*%?\s*$/);
    if (!m) m = t.match(/^(.*?)\s+(-?[\d.,]+)\s*%?\s*$/);
    if (!m) continue;
    const label = m[1].trim();
    const value = parseFloat(m[2].replace(/,/g, ""));
    if (!label || !isFinite(value)) continue;
    rows.push({ label, value, raw: m[2].replace(/\.0+$/, "") });
  }
  return rows;
}

function renderBarChart(args, body) {
  const rows = parseChartData(body);
  if (!rows.length) return "";
  const max = Math.max(...rows.map((r) => Math.abs(r.value)), 0) || 1;
  const items = rows.map((r) => {
    const pct = Math.max(0, (Math.abs(r.value) / max) * 100);
    return `<div class="chart__row"><span class="chart__label">${renderInline(r.label)}</span>` +
      `<span class="chart__track"><span class="chart__fill" style="width:${pct.toFixed(1)}%"></span></span>` +
      `<span class="chart__value">${esc(r.raw)}</span></div>`;
  }).join("");
  return `<figure class="chart"><figcaption class="chart__title">${esc(args) || "DATA"}</figcaption><div class="chart__rows">${items}</div></figure>`;
}

const PIE_COLORS = ["--accent", "--danger", "--ink", "--hl-blue", "--hl-green", "--hl-red"];
function renderPieChart(args, body) {
  const rows = parseChartData(body);
  const total = rows.reduce((s, r) => s + Math.max(0, r.value), 0);
  if (!rows.length || total <= 0) return "";
  let acc = 0;
  const stops = rows.map((r, i) => {
    const start = (acc / total) * 100;
    acc += Math.max(0, r.value);
    const end = (acc / total) * 100;
    return `var(${PIE_COLORS[i % PIE_COLORS.length]}) ${start.toFixed(2)}% ${end.toFixed(2)}%`;
  });
  const legend = rows.map((r, i) =>
    `<li><span class="pie__sw" style="background:var(${PIE_COLORS[i % PIE_COLORS.length]})"></span>` +
    `<span class="pie__label">${renderInline(r.label)}</span><span class="pie__val">${esc(r.raw)}</span></li>`).join("");
  return `<figure class="chart chart--pie"><figcaption class="chart__title">${esc(args) || "DATA"}</figcaption>` +
    `<div class="pie__wrap"><div class="pie" style="background:conic-gradient(${stops.join(",")})" role="img" aria-label="Pie chart: ${esc(rows.map((r) => `${r.label} ${r.raw}`).join(", "))}"></div>` +
    `<ul class="pie__legend">${legend}</ul></div></figure>`;
}

/** Editorial notices: editor's note, correction, update, TL;DR. */
const NOTICE_KICKERS = { editor: "EDITOR'S NOTE", correction: "CORRECTION", update: "UPDATE", tldr: "TL;DR" };
function renderNotice(kind, args, body) {
  const date = esc(args.trim());
  return `<aside class="notice notice--${kind}"><div class="notice__kicker">${NOTICE_KICKERS[kind]}` +
    (date ? `<span class="notice__date">${date}</span>` : "") +
    `</div><div class="notice__body">${renderInner(body)}</div></aside>`;
}

/** Fact check with verdict badge: TRUE / FALSE / MIXED / UNVERIFIED. */
const VERDICTS = { true: "✓ TRUE", false: "✕ FALSE", mixed: "◐ MIXED" };
function renderFactcheck(args, body) {
  const key = VERDICTS[args.trim().toLowerCase()] ? args.trim().toLowerCase() : "unverified";
  const label = VERDICTS[key] || "? UNVERIFIED";
  return `<aside class="factcheck factcheck--${key}"><div class="factcheck__badge" role="note">` +
    `<span class="factcheck__dot" aria-hidden="true"></span>${label}</div>` +
    `<div class="factcheck__body">${renderInner(body)}</div></aside>`;
}

function renderEmbed(kind, args) {
  if (kind === "youtube") {
    const id = args.split(/\s+/)[0].replace(/[^a-zA-Z0-9_-]/g, "");
    if (!id) return "";
    return `<div class="embed16x9"><iframe src="https://www.youtube-nocookie.com/embed/${id}" title="Embedded video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
  }
  if (kind === "tweet" || kind === "x") {
    const url = args.split(/\s+/)[0].replace(/^["'<]|["'>]$/g, "");
    if (!/^https?:\/\/(www\.)?(twitter\.com|x\.com)\//.test(url)) return "";
    const theme = themeNow() === "light" ? "light" : "dark";
    return `<div class="embed embed--tweet"><blockquote class="twitter-tweet" data-theme="${theme}" data-dnt="true" data-conversation="none"><a href="${esc(url)}">View this post on X</a></blockquote></div>`;
  }
  if (kind === "reddit") {
    const url = args.split(/\s+/)[0].replace(/^["'<]|["'>]$/g, "");
    if (!/^https?:\/\/(www\.|old\.|new\.)?reddit\.com\//.test(url)) return "";
    return `<div class="embed embed--reddit"><blockquote class="reddit-embed-bq" data-embed-height="480"><a href="${esc(url)}">View this thread on Reddit</a></blockquote></div>`;
  }
  const kv = parseKV(args);
  const src = kv.src || "";
  if (!src) return "";
  const safe = esc(resolveMedia(src));
  if (kind === "video") {
    const poster = kv.poster ? ` poster="${esc(resolveMedia(kv.poster))}"` : "";
    const cap = kv.caption ? `<div class="vplayer__cap">${esc(kv.caption)}</div>` : "";
    return `<div class="vplayer" data-vplayer><div class="vplayer__stage"><video src="${safe}"${poster} preload="metadata" playsinline></video>` +
      `<button class="vplayer__big" type="button" aria-label="Play video"><span aria-hidden="true">▶</span></button></div>` +
      `<div class="vplayer__bar"><button class="vplayer__play" type="button" aria-label="Play or pause">▶</button>` +
      `<div class="vplayer__seek" role="slider" tabindex="0" aria-label="Seek" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="vplayer__fill"></div></div>` +
      `<span class="vplayer__time">0:00 / 0:00</span>` +
      `<button class="vplayer__mute" type="button">SOUND ON</button>` +
      `<button class="vplayer__full" type="button" aria-label="Fullscreen">⛶</button></div>${cap}</div>`;
  }
  if (kind === "audio") {
    const cap = kv.caption ? `<div class="aplayer__cap">${esc(kv.caption)}</div>` : "";
    return `<div class="aplayer"><audio src="${safe}" controls preload="metadata"></audio>${cap}</div>`;
  }
  return `<div class="embed16x9 embed--frame"><iframe src="${safe}" title="Embedded content" loading="lazy" allowfullscreen></iframe></div>`;
}

/** {% download %} / {% logo %} / {% img %} / {% stars %} / :stars[] inline directives. */
function renderDirective(kind, args) {
  if (kind === "stars") {
    const v = Math.min(5, Math.max(0, parseFloat(args) || 0));
    const pct = (v / 5) * 100;
    return `<span class="stars" role="img" aria-label="Rated ${v} out of 5"><span class="stars__bg" aria-hidden="true">★★★★★</span><span class="stars__fg" aria-hidden="true" style="width:${pct}%">★★★★★</span></span>`;
  }
  const kv = parseKV(args);
  // positional tokens (quote-aware, skipping key="value" pairs already parsed)
  const pos = (args.match(/"[^"]*"|\S+/g) || [])
    .map((t) => t.replace(/^"|"$/g, ""))
    .filter((t) => !/^\w+=/.test(t));
  if (kind === "download") {
    const src = kv.src || pos[0] || "";
    if (!src) return "";
    const label = kv.label || pos[1] || src.split("/").pop();
    const ext = (src.split(".").pop() || "").replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 4);
    return `<a class="dl-btn" href="${esc(resolveMedia(src))}" download><span class="dl-btn__icon" aria-hidden="true">↓</span><span class="dl-btn__label">${esc(label)}</span>${ext ? `<span class="dl-btn__ext">${esc(ext)}</span>` : ""}</a>`;
  }
  if (kind === "logo") {
    const src = kv.src || pos[0] || "";
    if (!src) return "";
    const alt = kv.alt || pos[1] || "";
    const w = parseInt(kv.w || kv.width || pos[2] || "0", 10);
    return `<img class="logo" src="${esc(resolveMedia(src))}" alt="${esc(alt)}" loading="lazy"${w > 0 ? ` style="width:${w}px"` : ""}>`;
  }
  if (kind === "img") {
    const src = kv.src || pos[0] || "";
    if (!src) return "";
    const caption = kv.caption || pos[1] || "";
    const align = String(kv.align || pos[2] || "").toLowerCase();
    const cls = align === "center" ? " fig--center" : align === "right" ? " fig--right" : align === "left" ? " fig--left" : "";
    const cap = caption ? `<figcaption>${esc(caption)}</figcaption>` : "";
    return `<figure class="fig${cls}"><img src="${esc(resolveMedia(src))}" alt="${esc(kv.alt || caption)}" loading="lazy">${cap}</figure>`;
  }
  return "";
}

/** :::person / :::movie — ID card: first markdown image becomes the portrait, the rest is info. */
function renderIdCard(kind, args, body) {
  const round = /\bround\b/i.test(args);
  let imgHTML = "";
  const m = body.match(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/);
  let rest = body;
  if (m) {
    let src = m[2];
    if (!/^(https?:|data:|\/)/i.test(src)) src = POSTS_BASE + src;
    imgHTML = `<img class="id-card__img${round ? " is-round" : ""}" src="${esc(src)}" alt="${esc(m[1])}" loading="lazy">`;
    rest = body.replace(m[0], "");
  }
  return `<div class="id-card id-card--${kind}">${imgHTML}<div class="id-card__body">${renderInner(rest.trim())}</div></div>`;
}

/** :::movie — Wikipedia/IMDb-style infobox.
    First image = poster. First text line = title.
    "Key: Value" lines = fact rows. Anything else = synopsis. */
function renderMovie(args, body) {
  const m = body.match(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/);
  let poster = "", rest = body;
  if (m) {
    let src = m[2];
    if (!/^(https?:|data:|\/)/i.test(src)) src = POSTS_BASE + src;
    poster = `<img class="movie__poster" src="${esc(src)}" alt="${esc(m[1])}" loading="lazy">`;
    rest = body.replace(m[0], "");
  }
  const lines = rest.split("\n").map((l) => l.trim());
  let i = 0;
  while (i < lines.length && !lines[i]) i++;
  const title = i < lines.length ? lines[i++] : "";
  const facts = [], syn = [];
  for (; i < lines.length; i++) {
    if (!lines[i]) continue;
    const fm = lines[i].match(/^([^:*\n]{1,40}):\s+(.+)$/);
    if (fm) facts.push({ k: fm[1].trim(), v: fm[2].trim() });
    else syn.push(lines[i]);
  }
  const kicker = esc(args.trim()) || "MOVIE FILE";
  const factsHtml = facts.length
    ? `<dl class="movie__facts">${facts.map((f) =>
        `<div class="movie__fact"><dt>${esc(f.k)}</dt><dd>${renderInline(f.v)}</dd></div>`).join("")}</dl>`
    : "";
  const synHtml = syn.length ? `<div class="movie__syn">${renderInner(syn.join("\n\n"))}</div>` : "";
  return `<aside class="movie"><div class="movie__kicker">${kicker}</div>` +
    `<div class="movie__title">${renderInline(title) || "UNTITLED"}</div>` +
    `<div class="movie__grid">${poster}<div class="movie__body">${factsHtml}${synHtml}</div></div></aside>`;
}

/** Mermaid diagram block: ```mermaid fences render as diagrams, not code. */
function renderDiagram(code) {
  return `<figure class="diagram"><pre class="mermaid">${code}</pre></figure>`;
}

/** Clipboard helper with fallback. */
async function copyText(t) {
  try { await navigator.clipboard.writeText(t); return true; }
  catch (_) {
    try {
      const ta = document.createElement("textarea");
      ta.value = t; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      document.execCommand("copy"); ta.remove(); return true;
    } catch (_) { return false; }
  }
}

/** Themed custom video player wiring. */
function setupPlayer(box) {
  const v = box.querySelector("video");
  if (!v) return;
  const big = box.querySelector(".vplayer__big");
  const play = box.querySelector(".vplayer__play");
  const seek = box.querySelector(".vplayer__seek");
  const fill = box.querySelector(".vplayer__fill");
  const time = box.querySelector(".vplayer__time");
  const mute = box.querySelector(".vplayer__mute");
  const full = box.querySelector(".vplayer__full");
  const fmt = (s) => {
    if (!isFinite(s) || s < 0) s = 0;
    s = Math.floor(s);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };
  const sync = () => {
    const playing = !v.paused && !v.ended;
    if (play) play.textContent = playing ? "❚❚" : "▶";
    if (big) big.classList.toggle("is-hidden", playing || v.currentTime > 0);
    if (fill && v.duration) fill.style.width = `${(v.currentTime / v.duration) * 100}%`;
    if (seek && v.duration) seek.setAttribute("aria-valuenow", Math.round((v.currentTime / v.duration) * 100));
    if (time) time.textContent = `${fmt(v.currentTime)} / ${fmt(v.duration)}`;
  };
  const toggle = () => { if (v.paused) v.play().catch(() => {}); else v.pause(); };
  if (play) play.addEventListener("click", toggle);
  if (big) big.addEventListener("click", toggle);
  v.addEventListener("click", toggle);
  ["play", "pause", "timeupdate", "loadedmetadata", "ended"].forEach((ev) => v.addEventListener(ev, sync));
  if (seek) {
    const jump = (clientX) => {
      const r = seek.getBoundingClientRect();
      const ratio = Math.min(Math.max((clientX - r.left) / r.width, 0), 1);
      if (v.duration) v.currentTime = ratio * v.duration;
    };
    seek.addEventListener("click", (e) => jump(e.clientX));
    seek.addEventListener("keydown", (e) => {
      if (!v.duration) return;
      if (e.key === "ArrowRight") { v.currentTime = Math.min(v.duration, v.currentTime + 5); e.preventDefault(); }
      if (e.key === "ArrowLeft") { v.currentTime = Math.max(0, v.currentTime - 5); e.preventDefault(); }
      if (e.key === "Home") { v.currentTime = 0; e.preventDefault(); }
      if (e.key === "End") { v.currentTime = v.duration; e.preventDefault(); }
    });
  }
  if (mute) mute.addEventListener("click", () => {
    v.muted = !v.muted;
    mute.textContent = v.muted ? "MUTED" : "SOUND ON";
    mute.classList.toggle("is-muted", v.muted);
  });
  if (full) full.addEventListener("click", () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else if (box.requestFullscreen) box.requestFullscreen().catch(() => {});
    else if (v.webkitEnterFullscreen) v.webkitEnterFullscreen();
  });
  sync();
}

/** Restore placeholders into final HTML after marked runs. */

/** Current theme name ("" when unknown). */
function themeNow() {
  try { return document.documentElement.dataset.theme || ""; } catch (_) { return ""; }
}

/** Encode fence info flags so they survive marked: ```js bare color → ```js__bare__color */
function encodeFenceFlags(md) {
  const lines = md.split("\n");
  let fence = null;
  return lines.map((line) => {
    const m = line.match(/^(`{3,}|~{3,})([^\n]*)$/);
    if (!m) return line;
    const run = m[1], info = m[2];
    if (!fence) {
      fence = run;
      const im = info.match(/^\s*([^\s`]+)((?:\s+[^\s`]+)*)\s*$/);
      if (im && im[2].trim()) return run + im[1] + "__" + im[2].trim().split(/\s+/).join("__");
      return line;
    }
    if (run[0] === fence[0] && run.length >= fence.length) fence = null;
    return line;
  }).join("\n");
}

/** Paint +/- diff lines with spans (code is already HTML-escaped). */
function paintDiff(code) {
  return code.split("\n").map((line) => {
    if (/^\+($|[^-])/.test(line)) return `<span class="df-add">${line || " "}</span>`;
    if (/^-($|[^-])/.test(line)) return `<span class="df-del">${line || " "}</span>`;
    if (/^@@/.test(line)) return `<span class="df-hunk">${line}</span>`;
    return line;
  }).join("\n");
}

/** Flag-aware code box. Flags: bare (no header, copy on click), color, mono, diff. */
/* editor-chrome icons for code boxes */
const SVG_CHEV = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg>`;
const SVG_COPY = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
const SVG_CHECK = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`;
const SVG_FILE = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>`;

function renderCodebox(langToken, code) {
  const parts = String(langToken || "text").split("__");
  const lang = parts[0] || "text";
  const rawFlags = parts.slice(1);
  const flags = new Set(rawFlags.map((f) => f.toLowerCase()));
  if (lang === "mermaid") return renderDiagram(code); // diagrams, not code
  const isDiff = flags.has("diff") || lang === "diff" || lang === "patch";
  const mono = flags.has("mono") && !isDiff; // syntax color is the default now; `color` kept for back-compat
  const bare = flags.has("bare");
  let file = "";
  rawFlags.forEach((f) => { const m = /^file=(.+)$/i.exec(f); if (m) file = m[1]; });
  let codeHtml = code;
  if (isDiff) codeHtml = paintDiff(code);
  const label = file || lang.toUpperCase();
  const bar = bare ? "" :
    `<div class="codebox__bar"><span class="codebox__file">${file ? SVG_FILE : ""}<span>${esc(label)}</span></span>` +
    `<span class="codebox__actions"><button class="codebox__iconbtn codebox__fold" type="button" data-fold aria-label="Collapse code">${SVG_CHEV}</button>` +
    `<button class="codebox__iconbtn" type="button" data-copy aria-label="Copy code">${SVG_COPY}</button></span></div>`;
  const floatCopy = bare ? `<button class="codebox__iconbtn codebox__copy--float" type="button" data-copy aria-label="Copy code">${SVG_COPY}</button>` : "";
  const cls = "codebox" + (bare ? " codebox--bare" : "") + (mono ? " codebox--mono" : "");
  const tab = bare ? ` tabindex="0"` : "";
  return `<div class="${cls}" data-lang="${esc(lang)}"${tab}>${bar}${floatCopy}<div class="codebox__body"><pre><code class="language-${esc(lang)}">${codeHtml}</code></pre></div></div>`;
}

/** First fenced block inside a markdown fragment. */
function extractFence(md) {
  const m = String(md).match(/`{3,}([^\s`]*)[ \t]*\n([\s\S]*?)\n`{3,}/);
  return m ? { lang: m[1] || "text", code: m[2] } : null;
}

/** :::codetabs blocks contain fenced code, so they must be pulled out
    BEFORE outsideCode fragments the markdown on fence lines. */
function extractCodeTabs(md) {
  return md.replace(/^:::codetabs([^\n]*)\n([\s\S]*?)^:::$/gm, (_, args, body) =>
    `\n@@BLOCK:codetabs:${b64e(args.trim())}:${b64e(body)}@@\n`);
}

/** Split a body into ## sections without breaking on ## inside fenced code. */
function splitSections(body) {
  const lines = String(body).split("\n");
  const tabs = [];
  let cur = null, fence = null;
  for (const line of lines) {
    const fm = line.match(/^(`{3,}|~{3,})/);
    if (fm) {
      const run = fm[1];
      if (!fence) fence = run;
      else if (run[0] === fence[0] && run.length >= fence.length) fence = null;
    }
    const hm = !fence && line.match(/^##\s+(.+)$/);
    if (hm) { cur = { title: hm[1].trim(), lines: [] }; tabs.push(cur); continue; }
    if (cur) cur.lines.push(line);
  }
  return tabs.map((t) => ({ title: t.title, body: t.lines.join("\n").trim() }));
}

/** :::codetabs — one fenced block per ## tab, rendered as a tabbed code box. */
function renderCodeTabs(body) {
  const tabs = splitSections(body);
  if (!tabs.length) return renderInner(body);
  const idp = "ct" + Math.random().toString(36).slice(2, 8);
  const bar = tabs.map((t, i) =>
    `<button class="ctabs__btn${i === 0 ? " is-active" : ""}" type="button" role="tab" aria-selected="${i === 0}" data-ctab="${idp}-${i}">${esc(t.title)}</button>`).join("");
  const panels = tabs.map((t, i) => {
    const f = extractFence(t.body);
    const inner = f ? renderCodebox(f.lang + "__bare", esc(f.code)) : `<pre><code>${esc(t.body.trim())}</code></pre>`;
    return `<div class="ctabs__panel${i === 0 ? " is-active" : ""}" id="${idp}-${i}" role="tabpanel">${inner}</div>`;
  }).join("");
  return `<div class="codetabs" data-ctabs><div class="ctabs__bar" role="tablist">${bar}</div>${panels}</div>`;
}

/** :::table — first line is the header, cells split on |. Optional |:---| alignment row. */
function renderTable(args, body) {
  const lines = body.split("\n").map((l) => l.trim()).filter((l) => l);
  if (!lines.length) return "";
  const cells = (l) => l.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
  const head = cells(lines[0]);
  let aligns = [], start = 1;
  if (lines.length > 1 && cells(lines[1]).length && cells(lines[1]).every((c) => /^:?-+:?$/.test(c))) {
    aligns = cells(lines[1]).map((c) =>
      c.startsWith(":") && c.endsWith(":") && c.length > 2 ? "center" : c.endsWith(":") ? "right" : "left");
    start = 2;
  }
  const alignAttr = (i) => (aligns[i] ? ` style="text-align:${aligns[i]}"` : "");
  const thead = `<thead><tr>${head.map((c, i) => `<th${alignAttr(i)}>${renderInline(c)}</th>`).join("")}</tr></thead>`;
  const tbody = `<tbody>${lines.slice(start).map((l) =>
    `<tr>${cells(l).map((c, i) => `<td${alignAttr(i)}>${renderInline(c)}</td>`).join("")}</tr>`).join("")}</tbody>`;
  const cap = args.trim() ? `<caption>${esc(args.trim())}</caption>` : "";
  return `<figure class="dtable"><table>${cap}${thead}${tbody}</table></figure>`;
}

function postprocessHTML(html, ctx) {
  // footnote refs
  html = html.replace(/@@FNREF:([^:]+):(\d+)@@/g, (_, id, n) =>
    `<a class="footnote-ref" id="fnref-${esc(id)}" href="#fn-${esc(id)}" aria-label="Footnote ${n}">[${n}]</a>`);
  // spoilers — inner content gets a full markdown render so bold, links, highlights work inside
  html = html.replace(/@@SPOILER:([01]):([A-Za-z0-9+/=]+)@@/g, (_, f, b) =>
    `<span class="spoiler${f === "1" ? " spoiler--blur" : ""}" tabindex="0" role="button" aria-label="Spoiler, activate to reveal">${renderInner(decodeB64(b))}</span>`);
  // redactions
  html = html.replace(/@@REDACTED:([A-Za-z0-9+/=]+)@@/g, (_, b) =>
    `<span class="redacted" aria-label="Redacted">${esc(decodeB64(b))}</span>`);
  // wiki links
  html = html.replace(/@@WIKI:([\w-]+):([A-Za-z0-9+/=]+)@@/g, (_, id, b) => {
    const target = POSTS.find((p) => p.fileNo === id || p.id === id);
    const href = target ? `#/file/${target.id}` : `#/file/${esc(id)}`;
    return `<a class="wiki-link" href="${href}">◈ ${esc(decodeB64(b))}</a>`;
  });
  // inline: tooltips — with an info icon so they read differently from links; tap toggles on touch
  html = html.replace(/@@TIP:([A-Za-z0-9+/=]+):([A-Za-z0-9+/=]+)@@/g, (_, tb, pb) =>
    `<span class="has-tip" tabindex="0" data-tip="${esc(decodeB64(pb))}">${esc(decodeB64(tb))}<span class="has-tip__icon" aria-hidden="true">i</span></span>`);
  // inline: badges & tags
  html = html.replace(/@@BADGE:(badge(?:-red|-ghost)?|tag):([A-Za-z0-9+/=]+)@@/g, (_, kind, b) => {
    const t = esc(decodeB64(b));
    if (kind === "tag") return `<span class="tag">#${t}</span>`;
    const cls = kind === "badge" ? "badge" : `badge badge--${kind.slice(6)}`;
    return `<span class="${cls}">${t}</span>`;
  });
  // inline: text highlights (with optional color variant)
  html = html.replace(/@@HL:([a-z]*):([A-Za-z0-9+/=]+)@@/g, (_, c, b) =>
    `<mark class="hl${c ? " hl--" + c : ""}">${esc(decodeB64(b))}</mark>`);
  // blocks: directive components — body gets a nested markdown render
  html = html.replace(/(?:<p>)?@@BLOCK:([a-z]+):([A-Za-z0-9+/=]*):([A-Za-z0-9+/=]*)@@(?:<\/p>)?/g, (_, kind, ab, bb) => {
    const args = decodeB64(ab), body = decodeB64(bb);
    if (kind === "memo") return `<aside class="memo"><div class="memo__title">${esc(args) || "FIELD MEMO"}</div>${renderInner(body)}</aside>`;
    if (kind === "pull") return `<aside class="pull">${renderInner(body)}</aside>`;
    if (kind === "timeline") return renderTimeline(body);
    if (kind === "tabs") return renderTabs(body);
    if (kind === "codetabs") return renderCodeTabs(body);
    if (kind === "table") return renderTable(args, body);
    if (kind === "collapse") return `<details class="collapse"><summary><span>${esc(args) || "DETAILS"}</span>${SVG_CHEV}</summary><div class="collapse__body">${renderInner(body)}</div></details>`;
    if (kind === "box") return renderBox(args, body);
    if (kind === "stat") return renderStat(args, body);
    if (kind === "bar") return renderBarChart(args, body);
    if (kind === "pie") return renderPieChart(args, body);
    if (kind === "editor" || kind === "correction" || kind === "update" || kind === "tldr") return renderNotice(kind, args, body);
    if (kind === "factcheck") return renderFactcheck(args, body);
    if (kind === "person") return renderIdCard(kind, args, body);
    if (kind === "movie") return renderMovie(args, body);
    if (kind === "section") return `<section class="dsection"><div class="dsection__title">${esc(args) || "SECTION"}</div><div class="dsection__body">${renderInner(body)}</div></section>`;
    return "";
  });
  // embeds: youtube / video / audio / generic iframe / tweet / reddit
  html = html.replace(/(?:<p>)?@@EMBED:(youtube|video|audio|embed|tweet|x|reddit):([A-Za-z0-9+/=]*)@@(?:<\/p>)?/g, (_, kind, b) =>
    renderEmbed(kind, decodeB64(b)));
  // inline directives: download / logo / img / stars
  html = html.replace(/(?:<p>)?@@DIRECTIVE:(download|logo|img|stars):([A-Za-z0-9+/=]*)@@(?:<\/p>)?/g, (_, kind, b) =>
    renderDirective(kind, decodeB64(b)));
  // alerts: > [!KIND]
  const ALERT_TITLES = { note: "NOTE", tip: "FIELD TIP", important: "IMPORTANT", warning: "WARNING", caution: "CAUTION" };
  html = html.replace(/(?:<p>)?@@ALERT:(note|tip|important|warning|caution):([A-Za-z0-9+/=]*):([A-Za-z0-9+/=]*)@@(?:<\/p>)?/g,
    (_, kind, tb, bb) => {
      const title = decodeB64(tb) || ALERT_TITLES[kind];
      return `<div class="alert alert--${kind}" role="note"><div class="alert__title">${esc(title)}</div><div class="alert__body">${renderInner(decodeB64(bb))}</div></div>`;
    });
  // fancy divider
  html = html.replace(/(?:<p>)?@@DIVIDER@@(?:<\/p>)?/g,
    `<div class="divider" aria-hidden="true"><span>◆</span></div>`);
  // code boxes: fenced blocks get a header with language + copy button (flags: bare/color/mono/diff)
  html = html.replace(/<pre><code class="language-([\w][\w=+.~-]*)">([\s\S]*?)<\/code><\/pre>/g, (_, tok, code) => renderCodebox(tok, code));
  html = html.replace(/<pre><code>([\s\S]*?)<\/code><\/pre>/g, (_, code) => renderCodebox("text", code));
  // task lists: this marked build emits plain checkboxes — tag the lists so the custom checklist CSS applies
  html = html.replace(/<ul>(?:(?!<ul>)[\s\S])*?<\/ul>/g, (m) =>
    /type="checkbox"/.test(m)
      ? m.replace(/^<ul>/, '<ul class="contains-task-list">').replace(/<li>/g, '<li class="task-list-item">')
      : m);
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

  // inline placeholders (badges, highlights, tooltips…) are still raw at
  // heading-render time — decode them for clean TOC text and anchor ids.
  const headingPlain = (s) => s
    .replace(/@@HL:[a-z]*:([A-Za-z0-9+/=]+)@@/g, (_, b) => decodeB64(b))
    .replace(/@@BADGE:(?:badge(?:-red|-ghost)?|tag):([A-Za-z0-9+/=]+)@@/g, (_, b) => decodeB64(b))
    .replace(/@@TIP:([A-Za-z0-9+/=]+):[A-Za-z0-9+/=]+@@/g, (_, b) => decodeB64(b))
    .replace(/@@(?:SPOILER|REDACTED):([A-Za-z0-9+/=]+)@@/g, (_, b) => decodeB64(b))
    .replace(/@@[A-Z]+(?::[^@]*)?@@/g, "");

  renderer.heading = (text, level) => {
    // `text` arrives inline-parsed (entities escaped); decode back to plain
    // text so tocHTML's esc() escapes exactly once (no "&amp;" showing).
    const plain = headingPlain(text.replace(/<[^>]+>/g, ""))
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    const id = "h-" + slugify(plain);
    if (level <= 3) headings.push({ level, text: plain, id });
    return `<h${level} id="${id}">${text}<a class="h-anchor" href="#${id}" aria-label="Link to this section">#</a></h${level}>`;
  };

  renderer.link = (href, title, text) => {
    // internal dossier: links
    if (href && href.startsWith("dossier:")) {
      const id = href.slice(8);
      const target = POSTS.find((p) => p.fileNo === id || p.id === id);
      return `<a href="#/file/${target ? target.id : esc(id)}">◈ ${text}</a>`;
    }
    // buttons: [Label](button:/path)  [Label](button:red:/path)  [Label](button:ghost:https://…)
    if (href && href.startsWith("button:")) {
      const rest = href.slice(7);
      const m = rest.match(/^(red|ghost):(.*)$/s);
      const variant = m ? m[1] : "", url = m ? m[2] : rest;
      const t = title ? ` title="${esc(title)}"` : "";
      const ext = /^(https?:)?\/\//i.test(url) ? ` target="_blank" rel="noopener noreferrer"` : "";
      return `<a class="btn${variant ? " btn--" + variant : ""}" href="${esc(url)}"${t}${ext}>${text}</a>`;
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
      // optional align: ![alt](img.jpg "spoiler: reason | align: center")
      let rest = title.replace(/^spoiler\s*:\s*/i, "");
      let align = "";
      const am = rest.match(/\|\s*align\s*:\s*(left|center|right)\s*$/i);
      if (am) { align = am[1].toLowerCase(); rest = rest.slice(0, am.index).trim(); }
      const reason = esc(rest);
      const acls = align ? ` fig--${align}` : "";
      // figcaption lives OUTSIDE the overflow-hidden .sealed box so it never overlaps the image
      return `<figure class="sealedwrap${acls}"><div class="sealed" data-sealed><img src="${esc(src)}" alt="${alt}" loading="lazy">` +
        `<button class="sealed__cover" type="button"><span class="sealed__label">SPOILER — TAP TO REVEAL</span>` +
        (reason ? `<span class="sealed__reason">${reason}</span>` : "") + `</button></div>` +
        (alt ? `<figcaption>${alt}</figcaption>` : "") + `</figure>`;
    }
    // image filters: ![alt](img.jpg "filter: grayscale(1) contrast(1.1) | optional caption")
    let filter = "", fcap = "";
    const fm = (title || "").match(/^filter:\s*([^|]+?)(?:\|\s*(.*))?$/is);
    if (fm) { filter = fm[1].trim(); fcap = (fm[2] || "").trim(); }
    const style = filter ? ` style="filter:${esc(filter)}"` : "";
    const cap = !fm && title ? ` title="${esc(title)}"` : "";
    const figcap = alt || fcap ? `<figcaption>${alt}${alt && fcap ? " — " : ""}${esc(fcap)}</figcaption>` : "";
    return `<figure><img src="${esc(src)}" alt="${alt}"${style}${cap} loading="lazy">${figcap}</figure>`;
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

/* ───────── front page ───────── */
/** Resolve a manifest image path: absolute/data URLs as-is, bare filenames against the posts base. */
function resolveImg(src) {
  const s = String(src || "");
  if (!s || /^(https?:|data:|\/)/i.test(s)) return s;
  return POSTS_BASE + s;
}
/** Inline highlights inside titles & summaries (:hl[] variants), everything else escaped. */
function richInline(s) {
  return esc(String(s ?? ""))
    .replace(/:hl-(red|blue|green)\[([^\]]+)\]/g, '<mark class="hl hl--$1">$2</mark>')
    .replace(/:hl\[([^\]]+)\]/g, '<mark class="hl">$1</mark>');
}
const PIN_ICON = `<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.6A2.6 2.6 0 1 1 12 6.4a2.6 2.6 0 0 1 0 5.2z"/></svg>`;
function pinBadgeHTML() {
  return `<span class="pin-badge">${PIN_ICON}PINNED</span>`;
}
function kickerHTML(type) {
  const t = String(type || "FILE").toUpperCase();
  return `<span class="kicker${t === "LEAK" ? " kicker--red" : ""}">${esc(t)}</span>`;
}

function heroHTML(p) {
  const img = p.image ? `<div class="hero__img"><img src="${esc(resolveImg(p.image))}" alt="" loading="lazy"></div>` : "";
  return `<a class="hero hero--featured${img ? "" : " hero--noimg"}" href="#/file/${p.id}">
    <div class="hero__text">
    <div class="hero__kicker"><span class="kicker kicker--feat">◆ FEATURED ◆</span><span class="hero__fileno">FILE ${esc(p.fileNo)}</span></div>
    <h2 class="hero__title">${richInline(p.title)}</h2>
    <p class="hero__stand">${richInline(p.summary || "")}</p>
    <div class="hero__meta"><span>${esc(String(p.type || "FILE").toUpperCase())}</span><span>BY ${esc(p.author || "DOSSIER DESK")}</span><span>${esc(p.date || "")}</span><span class="hero__cta">READ THE FILE →</span></div>
    </div>
    ${img}
  </a>`;
}

function newsrowHTML(p) {
  const thumb = p.image ? `<span class="newsrow__thumb"><img src="${esc(resolveImg(p.image))}" alt="" loading="lazy"></span>` : "";
  return `<a class="newsrow${thumb ? " newsrow--hasimg" : ""}" href="#/file/${p.id}">
    ${thumb}
    <div class="newsrow__main">
    <div class="newsrow__kicker">${p.pinned ? pinBadgeHTML() : ""}${kickerHTML(p.type)}<span class="newsrow__fileno">${esc(p.fileNo)}</span></div>
    <h2 class="newsrow__title">${richInline(p.title)}</h2>
    <p class="newsrow__sum">${richInline(p.summary || "")}</p>
    <div class="newsrow__meta"><span>${esc(p.date || "")}</span><span>BY ${esc(p.author || "DOSSIER DESK")}</span></div>
    </div>
  </a>`;
}

function renderBoard(filter = "") {
  const q = filter.trim().toLowerCase();
  const matches = (p) => !q || [p.title, p.summary, p.fileNo, p.type, (p.tags || []).join(" ")].join(" ").toLowerCase().includes(q);
  const pinned = POSTS.filter((p) => p.pinned && matches(p));
  const rest = POSTS.filter((p) => !p.pinned && matches(p));
  const pinnedSlot = $("#pinnedSlot");
  if (!q && pinned.length) {
    pinnedSlot.innerHTML = `<div class="frontpage-head frontpage-head--top"><span class="section-label">PINNED</span></div>` +
      pinned.map(newsrowHTML).join("");
    pinnedSlot.hidden = false;
  } else {
    pinnedSlot.innerHTML = pinned.map(newsrowHTML).join("");
    pinnedSlot.hidden = !pinned.length;
  }
  const heroSlot = $("#heroSlot");
  if (!q && rest.length) {
    heroSlot.innerHTML = heroHTML(rest[0]);
    heroSlot.hidden = false;
  } else {
    heroSlot.innerHTML = "";
    heroSlot.hidden = true;
  }
  const rows = (!q && rest.length ? rest.slice(1) : rest).map(newsrowHTML).join("");
  $("#cardGrid").innerHTML = rows ||
    `<p class="empty">NO FILES MATCH “${esc(filter)}”. TRY ANOTHER QUERY.</p>`;
  $("#activeCount").textContent = POSTS.length;
}

/** Dateline bar: live date + edition that follows the clock. */
function datelineInit() {
  const d = new Date();
  const dateEl = $("#todayDate");
  if (dateEl) dateEl.textContent = d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const h = d.getHours();
  const ed = h < 12 ? "MORNING EDITION" : h < 17 ? "AFTERNOON EDITION" : h < 21 ? "EVENING EDITION" : "LATE EDITION";
  const edEl = $("#editionLabel");
  if (edEl) edEl.textContent = ed;
  const short = $("#todayShort");
  if (short) short.textContent = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }).toUpperCase();
}

/* ───────── dossier view ───────── */
function tocHTML(headings, open) {
  if (!headings.length) return "";
  const items = headings.map((h) => `<li><a href="#${h.id}">${esc(h.text)}</a></li>`).join("");
  return `<details class="dossier__toc"${open ? " open" : ""}><summary>CONTENTS — ${headings.length} SECTIONS</summary><ol>${items}</ol></details>`;
}

async function renderFile(id) {
  const post = POSTS.find((p) => p.id === id);
  const article = $("#dossierArticle");
  if (!post) {
    article.innerHTML = `<p class="empty">FILE NOT FOUND. <a href="#/board">RETURN TO FRONT PAGE</a>.</p>`;
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
    const mins = Math.max(1, Math.round(src.split(/\s+/).filter(Boolean).length / 200));
    const railOpen = window.matchMedia("(min-width: 1024px)").matches;
    article.innerHTML = `
      ${meta.dateline ? `<span class="dateline">${esc(meta.dateline)}</span>` : ""}
      <div class="dossier__kicker">
        <span class="stamp ${stampClass(type)}">${esc(String(type).toUpperCase())} // ${esc(post.fileNo)}</span>
        ${meta.status ? `<span class="chip chip--verified">${esc(String(meta.status).toUpperCase())}</span>` : ""}
      </div>
      <h1 class="dossier__title">${richInline(meta.title || post.title)}</h1>
      ${meta.standfirst ? `<p class="dossier__standfirst">${richInline(meta.standfirst)}</p>` : ""}
      <div class="dossier__byline"><span>BY ${esc(byline)}</span>${date ? `<span>// ${esc(date)}</span>` : ""}<span>// ${mins} MIN READ</span><span>// ${tags}</span></div>
      <div class="dossier__grid">
        <div class="dossier__body">${html}</div>
        <aside class="dossier__rail" aria-label="Contents and file record">
          ${tocHTML(headings, railOpen)}
          <div class="railcard">
            <div class="railcard__head">FILE RECORD</div>
            <div class="railcard__row"><span>FILE</span><b>// ${esc(post.fileNo)}</b></div>
            <div class="railcard__row"><span>TYPE</span><b>${esc(String(type).toUpperCase())}</b></div>
            ${date ? `<div class="railcard__row"><span>DATE</span><b>${esc(date)}</b></div>` : ""}
            <div class="railcard__row"><span>READ</span><b>${mins} MIN</b></div>
            ${tags ? `<div class="railcard__tags">${tags}</div>` : ""}
          </div>
        </aside>
      </div>`;
    bindArticleInteractions(article);
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  } catch (e) {
    article.innerHTML = `<p class="empty">COULD NOT OPEN FILE ${esc(post.fileNo)}.<br><span style="font-size:11px">${esc(e.message)}</span><br><br><a href="#/board">← RETURN TO FRONT PAGE</a></p>`;
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
  // tooltips: tap the info icon (or the text) to open on touch screens.
  // closes on outside tap/click, on hover-out (desktop), or Escape.
  const HOVERABLE = window.matchMedia("(hover: hover)").matches;
  root.querySelectorAll(".has-tip").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      const was = el.classList.contains("show-tip");
      root.querySelectorAll(".has-tip.show-tip").forEach((o) => o.classList.remove("show-tip"));
      if (!was) el.classList.add("show-tip");
    });
    if (HOVERABLE) el.addEventListener("mouseleave", () => el.classList.remove("show-tip"));
  });
  if (!bindArticleInteractions._tipCloser) {
    bindArticleInteractions._tipCloser = true;
    const closeAllTips = () => document.querySelectorAll(".has-tip.show-tip")
      .forEach((o) => o.classList.remove("show-tip"));
    document.addEventListener("click", (e) => { if (!e.target.closest(".has-tip")) closeAllTips(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeAllTips(); });
  }
  // codebox copy buttons (icon buttons inside the header)
  root.querySelectorAll("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const code = btn.closest(".codebox")?.querySelector("code");
      if (!code) return;
      const text = code.innerText;
      try { await navigator.clipboard.writeText(text); }
      catch (_) {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); } catch (_) {}
        ta.remove();
      }
      const old = btn.innerHTML;
      btn.innerHTML = SVG_CHECK;
      btn.classList.add("is-copied");
      setTimeout(() => { btn.innerHTML = old; btn.classList.remove("is-copied"); }, 1400);
    });
  });
  // codebox fold buttons (collapse the code body)
  root.querySelectorAll("[data-fold]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const box = btn.closest(".codebox");
      if (box) box.classList.toggle("is-folded");
    });
  });
  // tabbed tables / tabbed content
  root.querySelectorAll("[data-ctabs]").forEach((tabs) => {
    const btns = [...tabs.querySelectorAll(".ctabs__btn")];
    btns.forEach((b) => b.addEventListener("click", () => {
      btns.forEach((x) => {
        const on = x === b;
        x.classList.toggle("is-active", on);
        x.setAttribute("aria-selected", on ? "true" : "false");
      });
      tabs.querySelectorAll(".ctabs__panel").forEach((p) =>
        p.classList.toggle("is-active", p.id === b.dataset.ctab));
    }));
  });
  // custom video players
  root.querySelectorAll("[data-vplayer]").forEach(setupPlayer);
  // syntax colors for code boxes (highlight.js, loaded lazily on first use)
  const colorBlocks = [...root.querySelectorAll(".codebox:not(.codebox--mono) pre code[class^='language-']")];
  const paintColor = () => {
    colorBlocks.forEach((el) => {
      if (el.querySelector(".df-add, .df-del")) return; // diff already painted
      if (el.dataset.hlDone) return;
      const m = el.className.match(/language-([\w-]+)/);
      if (!m || !window.hljs || !window.hljs.getLanguage(m[1])) return;
      try { window.hljs.highlightElement(el); el.dataset.hlDone = "1"; } catch (_) {}
    });
  };
  if (colorBlocks.length) {
    if (window.hljs) paintColor();
    else if (!document.querySelector("script[data-hljs]")) {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js";
      s.async = true; s.setAttribute("data-hljs", "1");
      s.onload = paintColor;
      document.head.appendChild(s);
    } else {
      const iv = setInterval(() => { if (window.hljs) { clearInterval(iv); paintColor(); } }, 400);
      setTimeout(() => clearInterval(iv), 12000);
    }
  }
  // bare code boxes: reveal the copy button when the box is clicked
  root.querySelectorAll(".codebox--bare").forEach((box) => {
    box.addEventListener("click", () => box.classList.add("is-open"));
  });
  // mermaid diagrams: ```mermaid fences, rendered lazily
  const diagrams = [...root.querySelectorAll("pre.mermaid")];
  const paintDiagrams = () => {
    if (!window.mermaid) return;
    try {
      const dark = themeNow() === "dark";
      window.mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: dark ? "dark" : "neutral" });
    } catch (_) {}
    diagrams.forEach((el, i) => {
      if (el.dataset.done) return;
      el.dataset.done = "1";
      const id = "mmd-" + Date.now().toString(36) + "-" + i;
      try {
        const r = window.mermaid.render(id, el.textContent);
        if (r && r.then) r.then(({ svg }) => { el.innerHTML = svg; }).catch(() => { delete el.dataset.done; });
        else if (typeof r === "string") el.innerHTML = r;
      } catch (_) { delete el.dataset.done; }
    });
  };
  if (diagrams.length) {
    if (window.mermaid) paintDiagrams();
    else if (!document.querySelector("script[data-mermaid]")) {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js";
      s.async = true; s.setAttribute("data-mermaid", "1");
      s.onload = paintDiagrams;
      document.head.appendChild(s);
    } else {
      const iv = setInterval(() => { if (window.mermaid) { clearInterval(iv); paintDiagrams(); } }, 400);
      setTimeout(() => clearInterval(iv), 12000);
    }
  }
  // social embeds: X/Twitter + Reddit official widgets, loaded lazily
  const loadSocial = (selector, src, tag, onload) => {
    if (!root.querySelector(selector)) return;
    if (onload) { try { onload(); } catch (_) {} }
    if (document.querySelector(`script[data-soc="${tag}"]`)) return;
    const s = document.createElement("script");
    s.src = src; s.async = true; s.setAttribute("data-soc", tag);
    if (onload) s.onload = () => { try { onload(); } catch (_) {} };
    document.head.appendChild(s);
  };
  loadSocial(".twitter-tweet", "https://platform.twitter.com/widgets.js", "tw",
    () => window.twttr && window.twttr.widgets.load(root));
  loadSocial(".reddit-embed-bq", "https://embed.reddit.com/widgets.js", "rd", null);
}

/* ───────── back-to-top button ───────── */
function initToTop() {
  const btn = $("#toTop");
  if (!btn) return;
  let ticking = false;
  const update = () => {
    ticking = false;
    btn.classList.toggle("is-on", (window.scrollY || 0) > 600);
  };
  window.addEventListener("scroll", () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  update();
}

/* ───────── the press room — secret route (#/press): draft, preview, copy ───────── */
let pressBooted = false;
/* ▮ marks where the cursor lands; {{sel}} wraps the selected text. */
const PRESS_SNIPPETS = [
  { g: "TEXT", items: [
    ["H1", "\n# ▮\n"], ["H2", "\n## ▮\n"], ["H3", "\n### ▮\n"],
    ["B", "**{{sel}}▮**"], ["I", "*{{sel}}▮*"], ["S", "~~{{sel}}▮~~"],
    ["Link", "[{{sel}}▮](https://)"], ["Image", "![alt▮](image.jpg)"],
    ["Quote", "\n> ▮\n"], ["List", "\n- ▮\n- \n"], ["Tasks", "\n- [ ] ▮\n- [ ] \n"],
    ["Kbd", ":kbd[▮]"], ["Badge", ":badge[▮]"], ["Tag", ":tag[▮]"], ["HR", "\n***\n"],
  ]},
  { g: "HIDE", items: [
    ["Spoiler", "||{{sel}}▮||"], ["Blur", "||~{{sel}}▮~||"],
  ]},
  { g: "CODE", items: [
    ["Block", "```js\n▮\n```"], ["Bare", "```text bare\n▮\n```"],
    ["Diff", "```diff\n▮\n```"], ["Color", "```js color\n▮\n```"], ["Mono", "```js mono\n▮\n```"],
    ["Code tabs", ":::codetabs\n## npm\n```bash\n▮\n```\n## yarn\n```bash\n\n```\n:::"],
    ["Diagram", "```mermaid\nflowchart TD\n    A[▮] --> B\n```"],
  ]},
  { g: "BOXES", items: [
    ["Table", ":::table Caption\nItem | Qty\nA | 1\n▮\n:::"],
    ["Bar", ":::bar\nLabel — 40\n▮\n:::"],
    ["Pie", ":::pie\nA — 30\nB — 70\n▮\n:::"],
    ["Tabs", ":::tabs\n## Tab 1\n▮\n## Tab 2\n\n:::"],
    ["Collapse", ":::collapse Title\n▮\n:::"],
    ["Section", ":::section\n▮\n:::"],
    ["Box", ":::box\n▮\n:::"],
    ["Notice", ":::notice\n▮\n:::"],
    ["TL;DR", ":::tldr\n▮\n:::"],
    ["Editor", ":::editor\n▮\n:::"],
    ["Correction", ":::correction\n▮\n:::"],
    ["Update", ":::update\n▮\n:::"],
    ["Factcheck", ":::factcheck true\n▮\n:::"],
  ]},
  { g: "MEDIA", items: [
    ["Video", "{% video \"▮\" %}"], ["Audio", "{% audio \"▮\" %}"],
    ["YouTube", "{% youtube \"▮\" %}"], ["Embed", "{% embed \"▮\" %}"],
    ["Download", "{% download \"▮\" %}"], ["Tweet", "{% tweet \"▮\" %}"],
    ["Reddit", "{% reddit \"▮\" %}"], ["Logo", "{% logo \"▮\" 120 %}"],
    ["Stars", ":stars[▮]"],
  ]},
  { g: "CARDS", items: [
    ["Person", ":::person\n![Name▮](photo.jpg)\n**Name** — Role\n:::"],
    ["Movie", ":::movie\n![Poster](poster.jpg)\nTitle▮\nDirector: \nYear: \nBox office: $\n:::"],
  ]},
];
function pressInsert(ta, tpl, rerender) {
  const s = ta.selectionStart == null ? ta.value.length : ta.selectionStart;
  const e = ta.selectionEnd == null ? ta.value.length : ta.selectionEnd;
  const sel = ta.value.slice(s, e);
  let text = tpl.split("{{sel}}").join(sel);
  const mark = text.indexOf("▮");
  text = text.replace("▮", "");
  ta.value = ta.value.slice(0, s) + text + ta.value.slice(e);
  const pos = mark === -1 ? s + text.length : s + mark;
  try { ta.selectionStart = ta.selectionEnd = pos; } catch (_) {}
  ta.focus();
  rerender();
}
function initPressRoom() {
  if (pressBooted) return;
  pressBooted = true;
  const gate = $("#pressGate"), studio = $("#pressStudio");
  if (!gate || !studio) return;
  const input = $("#pressInput"), previewBody = $("#pressPreviewBody");
  let pTimer = null;
  const renderPreview = () => {
    if (!input || !previewBody) return;
    previewBody.innerHTML = renderInner(input.value) || `<p class="empty">NOTHING TO PREVIEW YET.</p>`;
    bindArticleInteractions(previewBody);
  };
  const queuePreview = () => { clearTimeout(pTimer); pTimer = setTimeout(renderPreview, 250); };
  const open = () => { gate.hidden = true; studio.hidden = false; queuePreview(); };
  try { if (sessionStorage.getItem("dossier_press") === "1") open(); } catch (_) {}
  const form = $("#pressGateForm");
  if (form) form.addEventListener("submit", (e) => {
    e.preventDefault();
    const code = $("#pressCode") ? $("#pressCode").value : "";
    if (code === (CONFIG.PRESS_CODE || "ink")) {
      try { sessionStorage.setItem("dossier_press", "1"); } catch (_) {}
      open();
    } else {
      const err = $("#pressErr");
      if (err) err.hidden = false;
    }
  });
  if (!input || !previewBody) return;
  // component toolbox: inject snippets at the cursor
  const toolbox = $("#pressToolbox");
  if (toolbox && !toolbox.dataset.built) {
    toolbox.dataset.built = "1";
    PRESS_SNIPPETS.forEach((grp) => {
      const g = document.createElement("div");
      g.className = "toolbox__group";
      const lab = document.createElement("span");
      lab.className = "toolbox__label";
      lab.textContent = grp.g;
      g.appendChild(lab);
      grp.items.forEach(([name, tpl]) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "toolbox__btn";
        b.textContent = name;
        b.title = "Insert " + name;
        b.addEventListener("click", () => pressInsert(input, tpl, queuePreview));
        g.appendChild(b);
      });
      toolbox.appendChild(g);
    });
  }
  input.addEventListener("input", queuePreview);
  const flash = (btn, ok) => {
    const old = btn.textContent;
    btn.textContent = ok ? "COPIED ✓" : "COPY FAILED";
    setTimeout(() => { btn.textContent = old; }, 1400);
  };
  const copyBtn = $("#pressCopyHtml");
  if (copyBtn) copyBtn.addEventListener("click", async (e) => {
    renderPreview();
    flash(e.currentTarget, await copyText(previewBody.innerHTML));
  });
  const copyMd = $("#pressCopyMd");
  if (copyMd) copyMd.addEventListener("click", async (e) => {
    flash(e.currentTarget, await copyText(input.value));
  });
  const clearBtn = $("#pressClear");
  if (clearBtn) clearBtn.addEventListener("click", () => {
    input.value = "";
    renderPreview();
    input.focus();
  });
}

/* ───────── reading progress bar (dossier view only) ───────── */
function initReadProgress() {
  const wrap = $("#readProgress"), bar = $("#readProgressBar");
  if (!wrap || !bar) return;
  let ticking = false;
  const update = () => {
    ticking = false;
    const inFile = !$("#view-file").hidden;
    wrap.classList.toggle("is-on", inFile);
    if (!inFile) return;
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    const y = window.scrollY || h.scrollTop || 0;
    bar.style.width = (max > 0 ? Math.min(100, (y / max) * 100) : 0) + "%";
  };
  window.addEventListener("scroll", () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  window.addEventListener("hashchange", () => setTimeout(update, 50));
  window.addEventListener("resize", update);
  update();
}

/* ───────── router ───────── */
function setTab(name) {
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("is-active", t.dataset.tab === name));
}
function showView(name) {
  ["board", "file", "publish", "press"].forEach((v) => { $(`#view-${v}`).hidden = v !== name; });
}
async function route() {
  const hash = location.hash || "#/board";
  const m = hash.match(/^#\/file\/([\w-]+)/);
  if (m) { setTab(""); showView("file"); await renderFile(m[1]); return; }
  if (hash.startsWith("#/press")) { setTab(""); showView("press"); initPressRoom(); window.scrollTo(0, 0); return; }
  if (hash.startsWith("#/publish")) { setTab("publish"); showView("publish"); window.scrollTo(0, 0); return; }
  setTab("board"); showView("board"); renderBoard($("#searchInput").value);
}

/* ───────── boot ───────── */
async function boot() {
  initTheme();
  datelineInit();
  initReadProgress();
  initToTop();
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
