---
name: Malaysia 3D Library
description: A drive through Malaysia drawn in Malaysian road signs, with every real object standing on the verge under its own attraction sign.
colors:
  green: "#00694a"
  blue: "#0b4f9c"
  brown: "#6e3d20"
  orange: "#f08a00"
  red: "#cf1f2e"
  yellow: "#ffc72c"
  sheet: "#ffffff"
  asphalt: "#2b2d2f"
  asphalt-deep: "#1e2022"
  steel: "#43474b"
  concrete: "#dcd8d0"
  ink: "#17191b"
  muted-light: "#c9ccd0"
typography:
  display:
    fontFamily: "Overpass, sans-serif"
    fontSize: "clamp(2.25rem, 6.2vw, 5.25rem)"
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Overpass, sans-serif"
    fontSize: "clamp(1.75rem, 4.2vw, 3.25rem)"
    fontWeight: 800
    lineHeight: 1.02
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Overpass, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 800
    lineHeight: 1.1
  body:
    fontFamily: "Overpass, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Overpass, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 700
    lineHeight: 1.25
  stone-number:
    fontFamily: "Overpass, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 900
    lineHeight: 1
    fontFeature: "tnum"
rounded:
  tab: "4px"
  plate: "5px"
  button: "6px"
  attraction: "7px"
  board: "8px"
  sign: "12px"
  stone: "22px 22px 4px 4px"
spacing:
  gutter: "clamp(16px, 4vw, 56px)"
  gantry-h: "116px"
  gantry-h-phone: "84px"
  sign-pad: "clamp(20px, 2.4vw, 30px)"
components:
  gantry-board:
    backgroundColor: "{colors.green}"
    textColor: "{colors.sheet}"
    rounded: "{rounded.board}"
    padding: "10px 16px"
  exit-board:
    backgroundColor: "{colors.green}"
    textColor: "{colors.sheet}"
    padding: "clamp(22px, 3.5vw, 40px) clamp(16px, 4vw, 56px)"
  attraction:
    backgroundColor: "{colors.brown}"
    textColor: "{colors.sheet}"
    rounded: "{rounded.attraction}"
    padding: "10px 10px 10px 14px"
  stone:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    typography: "{typography.stone-number}"
    rounded: "{rounded.stone}"
    width: "44px"
  sign-green:
    backgroundColor: "{colors.green}"
    textColor: "{colors.sheet}"
    rounded: "{rounded.sign}"
    padding: "{spacing.sign-pad}"
  sign-blue:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.sheet}"
    rounded: "{rounded.sign}"
    padding: "{spacing.sign-pad}"
  sign-works:
    backgroundColor: "{colors.orange}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sign}"
    padding: "{spacing.sign-pad}"
  plate-open:
    backgroundColor: "{colors.green}"
    textColor: "{colors.sheet}"
    rounded: "{rounded.plate}"
    padding: "4px 10px 2px"
  plate-works:
    backgroundColor: "{colors.orange}"
    textColor: "{colors.ink}"
    rounded: "{rounded.plate}"
    padding: "4px 10px 2px"
  download-link:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.green}"
    rounded: "{rounded.board}"
    padding: "12px 14px"
  view-button:
    backgroundColor: "{colors.asphalt}"
    textColor: "{colors.sheet}"
    rounded: "{rounded.button}"
    padding: "9px 16px 7px"
  billboard-play:
    backgroundColor: "{colors.yellow}"
    textColor: "{colors.ink}"
    rounded: "{rounded.button}"
    padding: "12px 18px 10px"
  info-board:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.sheet}"
    rounded: "{rounded.sign}"
    padding: "clamp(26px, 4vw, 44px)"
---

# Design System: Malaysia 3D Library

## Overview

**Creative North Star: "Jalan Raya"**

The library is a drive through Malaysia. Each exit in `site.json` is a place off one road; the home page is that road, read top to bottom: a steel gantry overhead, an exit board painted edge to edge, a pale concrete verge where the objects stand, kerb stones, then asphalt with lane paint until the next exit. Every object stands under its own brown attraction sign with a white kilometre stone carrying its catalogue number. Model pages are a single stop on the verge, with the facts on roadside signs below.

Everything is drawn from Malaysian road furniture and nothing else: retroreflective white lettering on sheeting colours, SVG sign arrows and pictograms, posts and unipoles in brushed steel gradients, red-ringed limit roundels. The world refuses the asset-store grid of equal thumbnail cards and the cream museum catalogue. Objects are laid out at mixed widths on the verge, never as a card grid.

**Key Characteristics:**
- Sign colours own whole regions: an exit board is its colour edge to edge.
- One road-sign grotesque (Overpass, self-hosted variable font) for every word.
- Status is carried by sign form and words, not by hue alone.
- Measurements are signs: height and width roundels pinned to the viewer.
- The gantry lights the exit you are in; the others stay matte.

## Colors

Road-sign sheeting on asphalt and concrete: saturated sign faces, white lettering, dark road, pale verge.

### Primary
- **Expressway Green** (`--green`): the expressway direction board. Gantry boards and exit boards by default, the Download sign, the Nearby sign, the "Download open" plate, and the `theme-color`.

### Secondary
- **Local-Road Blue** (`--blue`): local roads and information. The facts sign on model pages, the about info board, and the exit boards for Kopitiam, Night market and Kampung (`.exit-kopitiam, .exit-night-market, .exit-kampung` set `--board: var(--blue)`), because those are off the expressway.
- **Attraction Brown** (`--brown`): the tourist attraction sign under every object, on the home page and as the model page nameplate. Brown means "this is a thing to see" and is used for nothing else.

### Tertiary
- **Works Orange** (`--orange`): temporary works. The "View only" sign, the "Review copy" plate, and the stone-jump error output. Orange always means not yet cleared or not found.
- **Limit Red** (`--red`): only the ring of the height and width roundels.
- **Lane Yellow** (`--yellow`): edge lines, the lit gantry lamp, the route shield, the top band of every kilometre stone, the focus ring, text selection, and the billboard's Play button.

### Neutral
- **Sheeting White** (`--sheet`): all lettering on sign faces, sign border lines, stones, exit numbers, download rows.
- **Asphalt** (`--asphalt`) and **Deep Asphalt** (`--asphalt-deep`): the page ground and carriageways; deep asphalt for the footer, gantry rails, lamp housings and billboard frame.
- **Gantry Steel** (`--steel`): the gantry body, with diagonal bracing stripes.
- **Verge Concrete** (`--concrete`): the speckled verge behind objects on the home page and the model scene.
- **Ink** (`--ink`): text on yellow, orange, white and concrete; kerb-stone black.
- **Muted Light** (`--muted-light`): secondary text on asphalt (footer, the "Go to stone" label).

### Named Rules
**The Sheeting Rule.** A sign face is one sheeting colour with a white border line inset from its edge. Lettering on green, blue and brown is white; lettering on orange and yellow is ink.

**The Unlit Board Rule.** Gantry boards that are not current are their board colour mixed 38% toward deep asphalt (`color-mix(in oklab, var(--board), var(--asphalt-deep) 38%)`). Only the current board shows the full colour, the yellow lamp and the lamplight gradient.

## Typography

**Display Font:** Overpass (self-hosted variable woff2, weights 100 to 900, latin and latin-ext subsets, `font-display: swap`, with sans-serif fallback)

**Character:** a highway-sign grotesque used at heavy weights. Signs are 800; numbers on stones and exit tabs are 900. There is no second family.

### Hierarchy
- **Display** (800, clamp(2.25rem, 6.2vw, 5.25rem), 0.95, -0.02em, balanced wrap): the exit name on each exit board.
- **Headline** (800, clamp(1.75rem, 4.2vw, 3.25rem), 1.02, -0.015em): the object name on the model page nameplate. The info board title (clamp(1.75rem, 3.4vw, 2.5rem)) and the billboard head (clamp(1.5rem, 2.6vw, 2.25rem)) sit at this level.
- **Title** (800, 1.5rem, 1.1): sign headings (Download, View only, Nearby). Gantry board names are 800 at 1.25rem; attraction names 800 at 1.0625rem.
- **Body** (400, 1.0625rem, 1.55): running text; info board paragraphs cap at 62ch, the model summary at 60ch, billboard copy at 40ch.
- **Label** (700, 0.8125rem): fact terms, exit tabs, tags, plates. Local names (Malay and others, with their `lang`) sit under English names as `small` at 500 weight, 0.75 to 0.8125rem.

### Named Rules
**The Tabular Stone Rule.** Every catalogue number, size and file figure uses tabular numerals (`font-variant-numeric: tabular-nums`).

**The Local Name Rule.** A local name always sits directly under the English name, lighter (500) and smaller, never replacing it.

## Layout

The page is a vertical road. Home: a sticky gantry (`--gantry-h`, 116px; `scroll-padding-top` matches it), then for each exit an `.exit-board` band and a `.verge`, separated by `.carriageway` strips. Billboards come after the Skyline, On the road and Night market exits. The about `.info` board and the footer end the road.

- **Gutter:** all full-width bands use `clamp(16px, 4vw, 56px)` inline padding.
- **Gantry track:** three boards in view (`calc((100% - 24px) / 3)` each); the current board scrolls to the front of the track.
- **Verge:** objects in a wrapping flex row aligned to their bottoms, at deliberately mixed widths (every fifth starting at the first is wider, every fifth starting at the third is narrower). The first exit (`.verge-lead`) is a 4:7 grid: the live auto-turning model on the left, the rest of the exit in an auto-fit grid on the right. Towers crop to 9:16.
- **Model page:** a `.scene` verge with the viewer (`min(68vh, 760px)`, min 320px), roundels top left, camera controls under the stage to the right, and the nameplate. Below, `.roadside` is a three-column grid (1 : 1.5 : 1.1): status sign, facts sign, Nearby.

**Breakpoints** (`max-width`):
- **1080px:** roadside goes to two columns, with facts spanning the full first row.
- **860px:** `--gantry-h` drops to 84px; the route name hides, leaving the shield; each gantry board fills the track less 48px and the next one fades out under a mask; the stone-jump label becomes visually hidden and the stone shrinks to 54 by 62px; the lead verge stacks; the exit count hides; roadside goes to one column; camera controls move into the flow; billboards stack image over copy.
- **560px (phones, designed at 390px):** objects become a two-column grid with every fifth (from the first) spanning both columns at 12% inline padding (not in Skyline); attraction signs, pictograms and stones shrink; the viewer is 58vh; the drag hint hides.

## Elevation & Depth

Sign faces are flat. Depth comes from road furniture: posts, poles, lamps and the physical objects standing on the verge.

### Shadow Vocabulary
- **Sign border line** (`box-shadow: inset 0 0 0 var(--margin) var(--face), inset 0 0 0 calc(var(--margin) + var(--line)) var(--sheet)`): not depth, the white border on every sign face. Margin and line vary by sign size (gantry 4/2px, attraction 4/2px, sign 6/3px, info board 7/3px).
- **Gantry overhang** (`0 10px 18px -8px rgb(0 0 0 / 0.55)`): the sticky gantry over the road.
- **Object on the verge** (`drop-shadow(0 18px 12px rgb(40 32 20 / 0.22))`, lifting 6px on hover to `0 26px 16px / 0.2`): model posters standing on concrete.
- **Roundel** (`drop-shadow(0 4px 5px rgb(0 0 0 / 0.25))`): limit signs pinned over the viewer.
- **Billboard** (`0 0 0 2px #55595e, 0 22px 34px -14px rgb(0 0 0 / 0.65)`): the billboard frame on its unipole.

### Named Rules
**The Furniture Depth Rule.** Signs never cast shadows of their own; they stand on posts drawn with a steel gradient (`linear-gradient(90deg, dark, light 45%, dark)`). Lift belongs to objects, the gantry, roundels and billboards.

## Shapes

Shapes are the shapes of the furniture. Signs are softly rounded rectangles (tabs 4px, plates 5px, buttons 6px, attraction signs 7px, gantry boards and exit numbers 8px, roadside and info signs 12px). Exit boards are full bleed with a white line top and bottom only. Kilometre stones are round-topped (`22px 22px 4px 4px` at 44px wide, scaled with the stone) with a yellow band. Roundels are circles with an 11-unit red ring. The route shield is a yellow SVG shield with an ink outline. Kerb stones are 56px black and white blocks. Arrows are one SVG drawn pointing up and rotated by class (`arrow-up-left`, `arrow-up-right`, `arrow-down`, `arrow-right`). Pictograms sit on a 24-unit grid, one per exit.

## Components

### Gantry (`.gantry`, `.route`, `.shield`, `.exits`, `.track`, `.board`)
The sticky steel gantry. `.route` holds the shield and the name. Each `.board` has an exit tab (`.exit-no`, white on ink, half above the board), `.board-name` with its local `small`, and an up-left arrow. The current board carries `aria-current="location"` and is lit: full board colour, white text, the `::before` lamp's bottom edge turns yellow, and the `::after` lamplight gradient fades in, all over 500ms on `--ease`. Hover makes the text white without lighting the board.

### Stone jump (`.jump`, `.jump-field`, `output`)
A kilometre stone that takes a number. `.jump-field` is a 66 by 78px stone with an "MY" prefix and a tabular input whose underline turns green on focus; the whole field gets the yellow focus ring. The Go button is a small deep-asphalt sign. Typing a digit anywhere focuses the input. A miss shows an orange `output` notice below the gantry. The form is `hidden` until `site.js` runs.

### Exit board (`.exit-board`, `.exit-no`, `.exit-title`, `.exit-count`)
Full-bleed sign band in `--board`: a white square exit number in the board colour, the display-size exit name with a visually hidden "Exit N:" prefix, the local name, and an up-left arrow with the object count at the right.

### Verge and objects (`.verge`, `.verge-lead`, `.objects`, `.object-link`, `.no-poster`)
Speckled concrete with a kerb (`::after`). Each `.object-link` is the poster, a post (`.attraction::before`), the brown `.attraction` sign with its `.stone` perched at its top right, and, if it can be downloaded, a `.plate-open` plate.

### Attraction sign (`.attraction`, `.pictogram`, `.attraction-text`, `.attraction-name`, `.stone`)
Brown sign: the exit pictogram, the name, the local name, the stone. On model pages it becomes the `.nameplate` with a larger stone, a single post and the `h1`.

### Kilometre stone (`.stone`)
White round-topped stone with a yellow band, "MY" in `small` over the catalogue number (the id without its prefix).

### Limit roundels (`.limits`, `.roundel`)
SVG roundels, `role="img"` with "Height N metres" / "Width N metres": white disc, red ring, ink value with a smaller "m", ink chevrons at top and bottom for height, at left and right for width. The home page lead shows height; model pages show height and width.

### Carriageway (`.carriageway`)
The road between exits: a yellow edge line at 22%, white dashes (90px in 190px) at 64% whose position is `calc(var(--drive) * -1px)`, so the lane paint moves with the scroll.

### Status signs (`.sign`, `.sign-green.downloads`, `.sign-works`, `.plate`)
The model page's first roadside sign states the status. A model with downloads gets the green **Download** board: white `a` rows in green lettering with a down arrow and a tabular size, then the licence and credit line, or a `.plate-works` "Review copy" plate if the licence is pending. A view-only model gets the orange **View only** works sign: an ink diamond with an exclamation mark, the heading and a plain reason.

### Facts sign (`.sign-blue.facts`)
Blue information sign: summary, a two-column `dl` (size W × H × D, triangles, file, exit link), outlined `.tags`, and a `details` for notes and credits with a drawn chevron that turns 300ms.

### Nearby (`.sign-green.nearby`)
Green direction sign listing nearby objects across exits, each with a direction arrow, name, local name and poster thumbnail, divided by translucent white rules.

### Camera buttons (`.stage-controls`, `.hint`, `.view-actions button`)
Small asphalt signs with a white border line (Front, Reset); hover lightens the face to #45484c.

### Paint chips (`.paints`, `.paint-name`, `.chips`, `.chip`)
Cars only. A small asphalt plate with the camera buttons' white border line, at the stage's bottom right (below the stage, right-aligned, under 860px). Its legend reads "Colour" and the chosen colour's name. Each factory colour is a 30px disc in that colour with a 2px white ring; the chosen one gets a detached ring (3px asphalt gap, 3px white). They are native radio inputs, so arrow keys move through them; focus shows the yellow ring 8px out. Choosing one repaints the viewer's `paint` material; the plate stays `hidden` until `site.js` runs, and is hidden without WebGL.

### Info board (`.info`, `.info-board`)
Blue information board on two steel posts, max 44rem, carrying the about text and the stone hint.

### Billboard (`.billboard`, `.billboard-right`, `.billboard-frame`, `.billboard-shot`, `.billboard-copy`, `.billboard-logo`, `.billboard-head`, `.billboard-play`, `.billboard-plate`)
A roadside billboard on a unipole with a catwalk, facing alternate sides (`.billboard-right` on odd ones). It shows a 16:9 in-game shot, the KL Rush logo, a head line, copy, and a yellow "Play free in your browser" button to the game. A white plate on the pole reads "Advertisement · from the makers of this library" and labels its `section` (`aria-labelledby="billboard-N"`). It stacks at 860px.

### Footer (`.footer`)
Deep asphalt strip: site name, object count (or "Private review, not yet public"), and the Overpass licence link.

## Do's and Don'ts

### Do:
- **Do** show status by sign form: a cleared download is a full green Download board (and a green "Download open" plate on the verge); anything not cleared is an orange works sign or plate, with words saying so.
- **Do** give every object its brown attraction sign and its kilometre stone; keying the stone number in the gantry must reach it.
- **Do** paint each exit board edge to edge in its board colour: green on the expressway, blue for local roads.
- **Do** show measurements as roundels on the viewer, never as a caption.
- **Do** honour reduced motion: under `prefers-reduced-motion: reduce` every transition is 0s, the gantry swaps boards instantly instead of smooth-scrolling, `--drive` stops updating so the lane paint holds still, and auto-rotate is removed from the live model.
- **Do** keep KL Rush on the billboards only: KL Rush and nothing else, on a billboard whose visible plate says "Advertisement", with images and scripts served from this site.

### Don't:
- **Don't** advertise anything other than KL Rush, mention KL Rush outside the billboards, or add ad networks, analytics or any third-party script; the viewer, its decoders and the font are vendored and self-hosted.
- **Don't** lay objects out as a grid of equal thumbnail cards.
- **Don't** add a second typeface or use a system display face.
- **Don't** draw icons with font glyphs or emoji; arrows and pictograms are SVG on the 24-unit grid.
- **Don't** use orange, red or brown for anything outside their sign meanings (works, limits, attractions).
