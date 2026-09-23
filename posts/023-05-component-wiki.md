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

Put `spoiler:` first in the title and the image stays blurred behind a **SPOILER** cover until tapped. Add `| align: center` (or `left` / `right`) to align the image and caption. The caption sits below the image, never overlapping it.

```text
![Raid photograph](https://picsum.photos/seed/dossier9/880/460 "spoiler: Graphic content — tap to reveal")

![Raid photograph](https://picsum.photos/seed/dossier9/880/460 "spoiler: Graphic content | align: center")
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

## Nested blocks

`:::` blocks nest — put a table inside a box, a box inside a collapse, a chart inside tabs. Inner blocks are rendered first, then the outer wrapper.

```text
:::box Evidence locker
:::table Seized items
Item | Qty
Cables | 40
Drives | 12
:::
:::
```

**Live:**

:::box Evidence locker
:::table Seized items
Item | Qty
Cables | 40
Drives | 12
:::
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

**Inline components in cells:** spoilers (`||redacted||`), badges (`:badge[]`), highlights (`:hl[]`), and tooltips all work inside table cells — they are encoded before the table splits rows on `|`. Block-level `:::` components cannot go in a cell, but they *can* wrap or contain tables — see **Nested blocks** below.

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

Checklists render round and radio-style: an empty circle when open, a filled inner dot when done.

## Round list

Square bullets are the dossier default. `:::roundlist` swaps them for round ones:

```text
:::roundlist
- Signal intercepts
- Dead-drop rotations
- Safe-house inventory
:::
```

**Live:**

:::roundlist
- Signal intercepts
- Dead-drop rotations
- Safe-house inventory
:::

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

Hover over [this briefing](tooltip: Compiled from three independent sources, cross-checked.) to see the tip. On phones, tap the ⓘ icon.

A open tip closes when you tap/click anywhere outside it, move the pointer off it (desktop), or press Escape.

**Pinning a file:** add `pinned: true` to a file's frontmatter and it stays above the top story with a pin badge. **Front-page images:** `image: raid.jpg` in frontmatter (a bare filename is read from `/posts`) puts a thumbnail on the news row and a banner on the hero. **Title highlights:** `:hl[]` (and `:hl-red[]` etc.) work inside titles and summaries on the front page.

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

## Download button

A proper dossier download — bordered button, file-type badge, works with bare filenames from `/posts`.

```text
{% download "evidence.pdf" "Download the evidence" %}
```

**Live:**

{% download "evidence.pdf" "Download the evidence" %}

## Rating stars

Partial fill, theme-aware gold (black in brutalism). Block or inline.

```text
{% stars 4.5 %}

The film scores :stars[3] from the desk.
```

**Live:**

{% stars 4.5 %}

The film scores :stars[3] from the desk.

## Person cards

A vertical ID card: portrait on top, name header, then metadata rows going top to bottom. The first image becomes the portrait, the first text line becomes the name header, `Key: Value` lines become metadata rows, and `---` drops in a divider. Add `dividers` to divide every row, `round` for a circular portrait. Anything else becomes the bio.

```text
:::person dividers
![Ava Cross](ava.jpg)
**Ava Cross** — Field agent
Role: Field operative
Clearance: Level 4
---
Languages: Malayalam, Hindi, English
Station: Kochi
Ava has run field ops across Kerala since 2019.
:::
```

**Live:**

:::person dividers
![Ava Cross](https://i.pravatar.cc/600?img=47)
**Ava Cross** — Field agent
Role: Field operative
Clearance: Level 4
---
Languages: Malayalam, Hindi, English
Station: Kochi
Ava has run field ops across Kerala since 2019.
:::

## Movie metadata box

`:::movie` (or `:::moviebox`) — the metadata file card. First image is the poster, the first text line is the title, `Key: Value` lines become fact rows, and anything else becomes the synopsis.

```text
:::moviebox
![Poster](poster.jpg)
Drishyam
Director: Jeethu Joseph
Year: 2013
Box office: $677747
Rating: :stars[4.5]
A gripping thriller about a man who will do anything to protect his family.
:::
```

**Live:**

:::moviebox
![Poster](poster.jpg)
Drishyam
Director: Jeethu Joseph
Year: 2013
Box office: $677747
Rating: :stars[4.5]
A gripping thriller about a man who will do anything to protect his family.
:::

## Movie showcase card

`:::moviecard` — the "new movie introduces" card. Poster on the left, everything else on the right: title and year, content-rating tag, genre chips, IMDb / TMDB / Rotten Tomatoes scores with custom logos, summary, optional cast, and a watch-trailer button. Write it as `Key: Value` lines — only include the fields you need.

```text
:::moviecard
poster: https://image.tmdb.org/t/p/w500/s5HBKH7hNo8EElJTFQPEDwYgXhG.jpg
title: Manjummel Boys
year: 2024
cert: U
genres: Survival, Thriller, Drama
imdb: 8.2
tmdb: 7.7
rotten: 97%
summary: A group of friends from Kochi gets into a daring rescue mission to save one of their own from the Guna Caves — a perilously deep pit nobody has ever been brought back from. Based on a true story.
cast: Soubin Shahir, Sreenath Bhasi, Balu Varghese, Jean Paul Lal
trailer: https://www.youtube.com/watch?v=id848Ww1YLo
:::
```

**Live:**

:::moviecard
poster: https://image.tmdb.org/t/p/w500/s5HBKH7hNo8EElJTFQPEDwYgXhG.jpg
title: Manjummel Boys
year: 2024
cert: U
genres: Survival, Thriller, Drama
imdb: 8.2
tmdb: 7.7
rotten: 97%
summary: A group of friends from Kochi gets into a daring rescue mission to save one of their own from the Guna Caves — a perilously deep pit nobody has ever been brought back from. Based on a true story.
cast: Soubin Shahir, Sreenath Bhasi, Balu Varghese, Jean Paul Lal
trailer: https://www.youtube.com/watch?v=id848Ww1YLo
:::

## Diagrams

Fence a block as `mermaid` and it renders as a diagram instead of code — flowcharts, sequence diagrams, class diagrams, and more. The library loads only when a diagram is on the page.

**Code:**

    ```mermaid
    flowchart TD
        A[Story breaks] --> B{Verified?}
        B -->|Yes| C[Publish]
        B -->|No| D[Hold for desk]
    ```

**Live:**

```mermaid
flowchart TD
    A[Story breaks] --> B{Verified?}
    B -->|Yes| C[Publish]
    B -->|No| D[Hold for desk]
```

## Inline logo

Drop a logo anywhere in a sentence at any width (pixels). Handy for source attributions.

```text
Source: {% logo "wire.png" "WIRE" 48 %} rating 8.2/10.
```

**Live:**

Source: {% logo "wire.png" "WIRE" 48 %} rating 8.2/10.

## Aligned images

The `{% img %}` directive gives you caption alignment: `center`, `left`, or `right`.

```text
{% img "photo.jpg" "The vault, 03:12 AM" center %}
```

**Live:**

{% img "photo.jpg" "The vault, 03:12 AM" center %}

## The press room

There is a secret route on this board: `#/press`. It isn't linked anywhere. Behind a code (default `ink`, change `PRESS_CODE` in `app.js`) sits a private studio — write Markdown, hit **PREVIEW** to see the file rendered with every component, then **COPY HTML** or **COPY MARKDOWN** to take the code with you.

## Charts

One `Label — value` (or `Label: value`) per line. Bars scale to the largest value; pie slices scale to the total.

:::bar Traffic by source
Google — 60
Direct: 25
Social — 15
:::

:::pie Budget split
Rent — 40
Food — 30
Fun — 20
Savings — 10
:::

## Editorial notices

:::tldr
Three sources confirmed the outage. The grid held by 4 AM.
:::

:::editor
We held this story for 48 hours while we verified the documents.
:::

:::correction 2026-09-20
An earlier version misstated the outage duration as 30 hours. It was 43.
:::

:::update
12:30 PM — The utility has confirmed the timeline in this story.
:::

## Fact check

Verdict goes on the first line: `TRUE`, `FALSE`, or `MIXED`. Anything else renders as UNVERIFIED.

:::factcheck FALSE
The claim that the grid failed twice is unsupported by the logs.
:::

## Spoilers, two ways

`||the butler did it||` is the classic black bar. Add a tilde — `||~the gardener helped||` — and the text renders blurred instead. Both reveal on tap or click.

**Live — tap to reveal:**

||the butler did it||

||~the gardener helped~||

## Malayalam type

Malayalam just works — the site loads Noto Sans Malayalam and it kicks in automatically wherever Malayalam script appears, in every theme. No markup needed.

**Live:**

## പ്രധാന വാർത്ത

മലയാളം കേരളത്തിന്റെ മാതൃഭാഷയാണ്. ഇത് മനോഹരമായ ഒരു ഭാഷയാണ്.

> സത്യം എപ്പോഴും വിജയിക്കും

- കൊച്ചി — റിപ്പോർട്ട്
- തിരുവനന്തപുരം — അപ്ഡേറ്റ്

Mixed script works too: the dossier **ഫയൽ** is now open.

## Code boxes: editor chrome, flags, diff

Every fenced block renders as an editor-style code box — JetBrains Mono and a popular syntax palette that follows the theme: a dark editor surface in dark mode, a light paper surface with a light-gray outline in light and brutalism. The header shows the language (or a filename), with a collapse chevron and a copy button inside.

Add `file=name.ext` after the language to show a filename in the header, like an IDE tab:

```py file=bubble_sort.py
def bubble_sort(items):
    for i in range(len(items)):
        for j in range(len(items) - 1 - i):
            if items[j] > items[j + 1]:
                items[j], items[j + 1] = items[j + 1], items[j]
```

Flags after the language: `bare` (no header bar — tap inside the box and the copy button appears), `mono` (force monochrome), `diff` (paints `+`/`-`/`@@` lines). `color` is kept for back-compat; color is the default everywhere now.

```js bare
const quiet = true; // no header bar — tap inside the box and the COPY button appears
```

```diff
+ added line
- removed line
 context line
@@ hunk header @@
```

## Tabbed code: :::codetabs

One fenced block per `##` tab — for install instructions in npm/yarn/pnpm, or the same snippet in several languages.

:::codetabs
## npm
```bash
npm install fictional-bassoon
```
## yarn
```bash
yarn add fictional-bassoon
```
## pnpm
```bash
pnpm add fictional-bassoon
```
:::

## Social embeds

`{% tweet "https://x.com/nasa/status/…" %}` (or `{% x … %}`) embeds a post from X/Twitter; `{% reddit "https://www.reddit.com/r/…/comments/…/" %}` embeds a Reddit thread; `{% instagram "https://www.instagram.com/p/…/" %}` (or `{% ig … %}`) embeds an Instagram post, reel (`/reel/…`), or TV video (`/tv/…`). All three load the platform's official widget only when used, and fall back to a plain link if the widget is blocked.

Live, with real links:

{% tweet "https://twitter.com/NASA/status/1805796751577633136" %}

{% reddit "https://www.reddit.com/r/singularity/comments/1t73lym/anthropic_to_reach_100_global_gdp_in_21_months/" %}

{% instagram "https://www.instagram.com/p/By39v5mHx0S/" %}

## Tables without pipes: :::table

First line is the header, cells split on `|`, optional caption after `:::table`. An optional second row of `:---`, `:---:`, `---:` sets alignment.

:::table Field kit
Item | Weight | Packed
Rope | 2 kg | Yes
Lens | 800 g | No
:::

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
| Code box + copy | fenced ` ```lang ` block, `file=name.ext` for a filename header |
| Box | `:::box [red\|ghost] Title` … `:::` |
| Stat callout | `:::stat [red\|ghost]` … number … label … `:::` |
| Tabbed tables | `:::tabs` … `## Tab` … `:::` |
| Checklist | `- [ ]` / `- [x]` |
| Round list | `:::roundlist` … `- item` … `:::` |
| Section | `:::section Title` … `:::` |
| Collapse | `:::collapse Title` … `:::` |
| Divider | `---` or `***` |
| Badge / tag | `:badge[]` `:badge-red[]` `:badge-ghost[]` `:tag[]` |
| Highlight | `:hl[text]`, `:hl-red[text]`, `:hl-blue[text]`, `:hl-green[text]` |
| Alert | `> [!NOTE\|TIP\|IMPORTANT\|WARNING\|CAUTION]` |
| Tooltip | `[text](tooltip: tip)` |
| Key | `<kbd>Key</kbd>` |
| Button | `[Label](button[:red\|:ghost]:url)` |
| Download | `{% download "file.pdf" "Label" %}` |
| Stars | `{% stars 4.5 %}` or `:stars[4.5]` |
| Person card | `:::person [round] [dividers]` — portrait, name, `Key: Value` rows, `---` dividers … `:::` |
| Movie metadata box | `:::movie` / `:::moviebox` — poster, title, `Key: Value` rows … `:::` |
| Movie showcase card | `:::moviecard` — poster, cert, genres, IMDb/TMDB/RT scores, cast, trailer … `:::` |
| Diagram | ` ```mermaid ` flowchart / sequence … ` ``` ` |
| Logo | `{% logo "wire.png" "WIRE" 48 %}` |
| Aligned image | `{% img "photo.jpg" "Caption" center %}` |
| Bar chart | `:::bar Title` … `Label — 40` … `:::` |
| Pie chart | `:::pie Title` … `Label — 40` … `:::` |
| Editor's note | `:::editor` … `:::` |
| Correction | `:::correction 2026-09-20` … `:::` |
| Update | `:::update` … `:::` |
| TL;DR | `:::tldr` … `:::` |
| Fact check | `:::factcheck TRUE\|FALSE\|MIXED` … `:::` |
| Blur spoiler | `||~text||` (drop the tilde for the black bar) |
| Bare code box | ` ```js bare ` — no header, copy appears on tap inside |
| Code flags | ` ```js color ` / ` ```js mono ` / ` ```diff ` |
| Tabbed code | `:::codetabs` … `## npm` + fenced block … `:::` |
| X/Twitter embed | `{% tweet "URL" %}` or `{% x "URL" %}` |
| Reddit embed | `{% reddit "URL" %}` |
| Instagram embed | `{% instagram "URL" %}` or `{% ig "URL" %}` |
| Directive table | `:::table Caption` … `A | B` rows … `:::` |
