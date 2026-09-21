---
title: "Field Manual: Every Component"
fileNo: "023-05"
type: "MEMO"
date: "21.09.26"
author: "DOSSIER DESK"
status: "verified"
standfirst: "The complete component reference. Every block, badge and button the desk uses — with copy-paste source and a live preview of each."
tags:
  - meta
  - guide
summary: "Every component the dossier supports, with copy-paste source and live previews."
---

This is the desk's component bible. For each piece you get the **source** first, then the **live** result — what you see rendered below the source is exactly what the markup produces. Copy the source, change the words, file it.

## Timeline

A vertical incident line. One `-` per event; split time from text with `—`.

```text
:::timeline
- 04:17 — Undersea cables go dark off Kochi
- 04:40 — Backup relays engaged, grid holding
- 06:30 — Field team dispatched to landing station
:::
```

**Live:**

:::timeline
- 04:17 — Undersea cables go dark off Kochi
- 04:40 — Backup relays engaged, grid holding
- 06:30 — Field team dispatched to landing station
:::

## Images with filters

Add `filter:` to the image title for CSS filters, then `|` and a caption.

```text
![Landing station, dawn](https://picsum.photos/seed/dossier7/880/460 "filter: grayscale(1) contrast(1.15) | Archive still, color withheld")
![Same frame, warm](https://picsum.photos/seed/dossier7/880/460 "filter: sepia(.65) contrast(1.05)")
```

**Live:**

![Landing station, dawn](https://picsum.photos/seed/dossier7/880/460 "filter: grayscale(1) contrast(1.15) | Archive still, color withheld")

![Same frame, warm](https://picsum.photos/seed/dossier7/880/460 "filter: sepia(.65) contrast(1.05)")

Any CSS filter works: `blur(2px)`, `invert(1)`, `saturate(2)`, chained combos.

## Spoiler images

Put `spoiler:` first in the title and the image stays blurred behind a **SPOILER** cover until tapped.

```text
![Raid photograph](https://picsum.photos/seed/dossier9/880/460 "spoiler: Graphic content — tap to reveal")
```

**Live:**

![Raid photograph](https://picsum.photos/seed/dossier9/880/460 "spoiler: Graphic content — tap to reveal")

## Video player

Themed player with play, seek, time, mute and fullscreen. `src` can be a file in `/posts` or a URL.

```text
{% video src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4" caption="Sample footage — CC0, via MDN" %}
```

**Live:**

{% video src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4" caption="Sample footage — CC0, via MDN" %}

## Audio embed

```text
{% audio src="https://www.w3schools.com/html/horse.mp3" caption="Field recording — sample" %}
```

**Live:**

{% audio src="https://www.w3schools.com/html/horse.mp3" caption="Field recording — sample" %}

## YouTube embed

```text
{% youtube dQw4w9WgXcQ %}
```

**Live:**

{% youtube dQw4w9WgXcQ %}

And a generic framed embed for anything else:

```text
{% embed https://example.com %}
```

## Code

Inline code looks like `this`. Fenced blocks become a code box with the language stamped on top and a **copy button**. Syntax is classified monochrome — keywords bold, comments faint, no rainbow.

````text
```js
const dead_drop = {
  city: "Kochi",
  hour: "04:17",
  status: "COMPROMISED"
};
console.log(dead_drop.status);
```
````

**Live:**

```js
const dead_drop = {
  city: "Kochi",
  hour: "04:17",
  status: "COMPROMISED"
};
console.log(dead_drop.status);
```

No language tag? You still get the box, stamped `TEXT`.

```
plain block, no language
second line
```

## Boxes

Bordered evidence boxes. Optional kinds: `red`, `ghost`.

```text
:::box Evidence locker
Chain of custody for items recovered at the landing station.
:::

:::box red Do not publish
Names in this section are unverified. Hold for legal.
:::

:::box ghost Marginalia
A quiet box for asides. No shadow, no noise.
:::
```

**Live:**

:::box Evidence locker
Chain of custody for items recovered at the landing station.
:::

:::box red Do not publish
Names in this section are unverified. Hold for legal.
:::

:::box ghost Marginalia
A quiet box for asides. No shadow, no noise.
:::

## Stat callout

A big-number callout for the figures that matter. First line is the number, the rest is the label. Optional kinds: `red`, `ghost`.

```text
:::stat
₹4.2 cr
Funds traced to shell accounts
:::

:::stat red
17
Arrests made before dawn
:::
```

**Live:**

:::stat
₹4.2 cr
Funds traced to shell accounts
:::

:::stat red
17
Arrests made before dawn
:::

Inline markup works in the number too: `:::stat` then `:hl[04:17]` on the first line.

## Tables

Plain markdown tables scroll horizontally on phones — no squished columns.

```text
| Segment | Splices | Status |
|---|---|---|
| Mumbai — Panvel | 6 | unlicensed |
| Goa — Mangaluru | 13 | unlicensed |
```

**Live:**

| Segment | Splices | Status |
|---|---|---|
| Mumbai — Panvel | 6 | unlicensed |
| Goa — Mangaluru | 13 | unlicensed |

## Multi-tab tables

One `:::tabs` block, one `##` heading per tab. Each tab holds anything — tables, lists, paragraphs.

```text
:::tabs
## Personnel
| Name | Role |
|---|---|
| A. Rao | Field lead |
| J. Menon | Signals |

## Arsenal
| Item | Count |
|---|---|
| Burner phones | 12 |
| Faraday bags | 30 |
:::
```

**Live:**

:::tabs
## Personnel
| Name | Role |
|---|---|
| A. Rao | Field lead |
| J. Menon | Signals |

## Arsenal
| Item | Count |
|---|---|
| Burner phones | 12 |
| Faraday bags | 30 |
:::

## Lists

```text
- Undersea cable manifests
- Landing station logs
  - Night shift entries
  - Maintenance windows
- Burner phone metadata

1. Verify the source
2. Redact the names
3. File before dawn
```

**Live:**

- Undersea cable manifests
- Landing station logs
  - Night shift entries
  - Maintenance windows
- Burner phone metadata

1. Verify the source
2. Redact the names
3. File before dawn

## Checklist

```text
- [x] Verify the source
- [x] Photograph the stamp
- [ ] Redact the names
- [ ] Push to board
```

**Live:**

- [x] Verify the source
- [x] Photograph the stamp
- [ ] Redact the names
- [ ] Push to board

## Numbered sections

`:::section` blocks auto-number themselves: SEC. 01, SEC. 02…

```text
:::section The wire room
Everything downstream of the landing station routes through this room.
:::
```

**Live:**

:::section The wire room
Everything downstream of the landing station routes through this room.
:::

## Collapsing blocks

For material that's there if the reader wants it. Stack as many as you like — one after another, each with its own `:::` closer. (Don't nest them.)

```text
:::collapse Why this matters
Because the cables that went dark carry 40% of the region's traffic,
and nobody has explained the other 60%.
:::

:::collapse The dissenting view
Two engineers insist it was a maintenance window. Their logs disagree with each other.
:::
```

**Live:**

:::collapse Why this matters
Because the cables that went dark carry 40% of the region's traffic,
and nobody has explained the other 60%.
:::

:::collapse The dissenting view
Two engineers insist it was a maintenance window. Their logs disagree with each other.
:::

## Dividers

`---` gives a hard rule. A line of `***` gives the dossier diamond.

```text
---
```

---

```text
***
```

***

## Badges & tags

```text
:badge[VERIFIED] :badge-red[LEAK] :badge-ghost[DRAFT] :tag[whistleblower]
```

**Live:**

:badge[VERIFIED] :badge-red[LEAK] :badge-ghost[DRAFT] :tag[whistleblower]

## Text highlights

Marker-pen highlights with `:hl[text]`. Stays readable in every theme. Pick a color per highlight with `:hl-red[]`, `:hl-blue[]` or `:hl-green[]`.

```text
The stamp reads :hl[KOCHI 04:17] but the ink says otherwise.
:hl-red[This part is disputed.] :hl-blue[This part checks out.] :hl-green[Verified by two sources.]
```

**Live:**

The stamp reads :hl[KOCHI 04:17] but the ink says otherwise.
:hl-red[This part is disputed.] :hl-blue[This part checks out.] :hl-green[Verified by two sources.]

## Alert boxes

Five flavors. Start a quote block with `[!KIND]`; an optional title can follow on the same line.

```text
> [!NOTE]
> Ink weight on the stamp is wrong for a 2024 issue.

> [!TIP] Desk habit
> Photograph every stamp with a coin for scale.

> [!IMPORTANT]
> Do not contact the source twice in one week.

> [!WARNING]
> The landing station has cameras on the north gate.

> [!CAUTION]
> This file contains unverified names. Hold for legal.
```

**Live:**

> [!NOTE]
> Ink weight on the stamp is wrong for a 2024 issue.

> [!TIP] Desk habit
> Photograph every stamp with a coin for scale.

> [!IMPORTANT]
> Do not contact the source twice in one week.

> [!WARNING]
> The landing station has cameras on the north gate.

> [!CAUTION]
> This file contains unverified names. Hold for legal.

## Tooltips

```text
Hover over [this briefing](tooltip: Compiled from three independent sources, cross-checked.) to see the tip.
```

**Live:**

Hover over [this briefing](tooltip: Compiled from three independent sources, cross-checked.) to see the tip. On phones, tap it.

## Keyboard keys

```text
Press <kbd>Ctrl</kbd> + <kbd>K</kbd> to open the file index.
```

**Live:**

Press <kbd>Ctrl</kbd> + <kbd>K</kbd> to open the file index.

## Buttons

`button:` links render as dossier buttons. Variants: `button:red:` and `button:ghost:`.

```text
[Open the board](button:#/board)
[Delete everything](button:red:#/board)
[Ghost protocol](button:ghost:#/board)
```

**Live:**

[Open the board](button:#/board)
[Delete everything](button:red:#/board)
[Ghost protocol](button:ghost:#/board)

## The classics

Still here, still working: ||spoilers||, ==redactions==, [[023-02|internal links]], spoiler images, footnotes[^1], `:::memo` callouts and pull quotes.

[^1]: Footnotes still land at the bottom of the file, numbered and linked.

## Cheat sheet

| You want | You write |
|---|---|
| Timeline | `:::timeline` … `- time — event` … `:::` |
| Filtered image | `![alt](src "filter: sepia(1) \| cap")` |
| Spoiler image | `![alt](src "spoiler: reason — tap to reveal")` |
| Video player | `{% video src="…" caption="…" %}` |
| Audio | `{% audio src="…" %}` |
| YouTube | `{% youtube VIDEO_ID %}` |
| Iframe | `{% embed URL %}` |
| Code box + copy | fenced ` ```lang ` block |
| Box | `:::box [red\|ghost] Title` … `:::` |
| Stat callout | `:::stat [red\|ghost]` … number … label … `:::` |
| Tabbed tables | `:::tabs` … `## Tab` … `:::` |
| Checklist | `- [ ]` / `- [x]` |
| Section | `:::section Title` … `:::` |
| Collapse | `:::collapse Title` … `:::` |
| Divider | `---` or `***` |
| Badge / tag | `:badge[]` `:badge-red[]` `:badge-ghost[]` `:tag[]` |
| Highlight | `:hl[text]`, `:hl-red[text]`, `:hl-blue[text]`, `:hl-green[text]` |
| Alert | `> [!NOTE\|TIP\|IMPORTANT\|WARNING\|CAUTION]` |
| Tooltip | `[text](tooltip: tip)` |
| Key | `<kbd>Key</kbd>` |
| Button | `[Label](button[:red\|:ghost]:url)` |
