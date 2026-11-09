# Malaysia 3D Library

3D models of real objects in Malaysia, made for the browser game KL Rush: buildings and landmarks, vehicles, hawker food and everyday props. Free and open source.

Status: the site is a private review (noindex) until the release gate below passes. This repository is public.

## Commands

| Command | What it does |
| --- | --- |
| `npm run build` | Checks every model and writes the site to `dist/`. Fails on any gate. |
| `npm run import -- <kl-rush checkout>` | Writes the viewer file of every model with a `source` from a KL Rush checkout (see below). |
| `npm run posters` | Renders `models/<slug>/poster.webp` from each model's viewer camera (Chromium), only for models without one; `-- --all` redoes them all. Commit the result. |
| `npm run check` | Serves `dist/` and checks every page in Chromium and WebKit, desktop and phone. |
| `npm run seam -- <file.glb> --width=5.6` | Tiles a modular piece along X and checks the joins. |

## Adding a model

1. **Provenance first.** Record where the geometry and every texture came from, and under what licence. Anything you can't verify gets `"verified": false`. It can be previewed, but it can't go public.
2. **Export.** glTF 2.0 binary in metres: +Y up, street or front side facing +Z, origin on the ground. Embed the textures.
   - **Downloads and tile pieces** use no compression extensions (Draco, meshopt, KTX2), so they open anywhere.
   - **Viewer files** may use meshopt and KTX2 the way KL Rush ships them, since their decoders are bundled with the site. Draco is refused everywhere.
3. **Folder.** Create `models/<slug>/` containing:
   - `model.json` (fields below)
   - the GLB files
   - any kit folder to be zipped
   - `source/`, which records how the files were made
4. **Build.** `npm run build` checks each model:
   - Every GLB passes the Khronos validator with 0 errors.
   - Compression extensions are refused where step 2 says.
   - Modular pieces pass the tile check.
   - Triangle counts, file sizes and dimensions come from the files, never typed by hand.
   - Each kit folder is zipped.
5. **Look.** `npm run posters`, then `npm run check`.
6. **Owner review.** Set `"status": "approved"` and `"licence"` only after the owner signs off.

## `model.json`

| Field | Meaning |
| --- | --- |
| `id` | Catalogue number, `MY-001` onwards. The slug is the folder name. |
| `name`, `localName` | English name. Optional: the local name and its language tag. |
| `category`, `tags`, `summary`, `notes` | Page text. |
| `status` | `review` or `approved`. |
| `licence` | SPDX id or licence name for the whole download. `null` = pending. |
| `viewer` | GLB shown in the viewer, plus the `<model-viewer>` `camera-orbit` used for the default view and the poster. |
| `downloads` | Files offered for download. `from` names a folder zipped into `file` at build time. `"unpack": true` writes `file` from the viewer GLB with meshopt and quantization decoded and KTX2 textures turned into PNG, so any glTF tool opens it; the licence goes in its `asset.copyright`. An empty list makes the model view-only. |
| `source` | Optional. Where `npm run import` takes the viewer file from: `repo` (`kl-rush`), the `commit` the checkout must be at, and one of `file` (a path under KL Rush's `public/content/`), `car` (a type under `public/content/vehicles/`, assembled from its body, wheels and `rig.json`, with `paint` as a `#rrggbb` body colour from the game's showroom palette; the game's code-built car materials become glTF materials over its shared surface textures), or `builder` (`<file>#<export>`, a code-built landmark run in Chromium and saved with three.js `GLTFExporter`, in its daytime look). `scale` optionally scales a builder's model uniformly, e.g. to the real building's height. `note` records where the asset came from; it is never shown on the site. |
| `tile` | Optional. Modular piece and its repeat width for the tile check. |
| `credits` | One entry per source: what it covers, who made it, an optional link, licence, whether that was verified, and a note. |

## Going public

`site.json` has `"public": false`. While it is false, every page carries `noindex` and `robots.txt` disallows everything.

Setting it to `true` makes the build refuse to run unless every model meets all four conditions:
- it is approved
- it has a licence
- every credit is verified
- it has a poster

## Licences

| What | Licence |
| --- | --- |
| The site's code: `scripts/`, `site/` (except `site/kl-rush/`), `site.json`, `vercel.json` | MIT, see `LICENSE` |
| The 25 models whose `model.json` has `"licence": "CC BY 4.0"` (their GLBs, posters and kits) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Credit "Malaysia 3D Library". |
| The 26 models with `"licence": null`: the cars and landmarks | No licence is granted. They are here to look at until the rights in the real designs are checked. |
| ambientCG surface maps in the shophouse | CC0 1.0, as listed in its credits |
| Overpass font (`@fontsource-variable/overpass`, copied to `dist/fonts/`) | SIL Open Font License 1.1 |
| `site/kl-rush/`: the KL Rush billboard images and logo | © 2026 chengboonrong, all rights reserved; see `site/kl-rush/NOTICE.md` |

The library isn't affiliated with the owners of the buildings, brands or places its models show.
