# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Makers:** game developers, 3D artists and architecture students who need ready-made Malaysian objects for their own scenes. They find a model, check its size, triangle count and file, and download it once it is cleared.
- **Curious public:** Malaysians and visitors who browse everyday Malaysia in 3D for the pleasure of it. They spin a teh tarik or Merdeka 118 and share the link. They don't need to download anything.

## Product Purpose

A collection of original 3D models of real objects in Malaysia: buildings and landmarks, vehicles, hawker food and everyday props.
- Every model can be viewed in 3D in the browser.
- Downloads open as each model is cleared for reuse.
- It is free and open source (owner, 2026-11-09): downloadable models are CC BY 4.0, the code is MIT, and the repository is public on GitHub.

Success, in the owner's words, is "loved to explore": people spend time turning the models over and share links, so the site itself is the experience.

## Positioning

- Every model is a real object in Malaysia, named as that object, and opens in 3D on its own page.
- The everyday (a plastic kopitiam stool, a bowl of cendol, a Perodua Myvi) sits beside the landmarks (Merdeka 118, Masjid Negara).

## Operating Context

- The site is a private review at https://malaysia-3d-library.vercel.app. It is noindex, and `robots.txt` disallows everything, until the owner approves the models and the reuse terms. The repository, https://github.com/chengboonrong/malaysia-3d-library, is public.
- Every push to main deploys production.
- It is read on phones and desktops. The owner reviews on an iPhone in Safari.

## Capabilities and Constraints

- **Build:** a static site built by `scripts/build.mjs` from `models/<slug>/model.json`. There is no framework and no bundler.
- **Viewer:** `<model-viewer>` 4.4.0, with its meshopt and KTX2 decoders vendored. The site makes no requests to other origins.
- **Model fields:** a catalogue id (`MY-###`), name, optional local name and its language, category, tags, summary, notes, and status (`review` or `approved`). Also a licence (`null` means pending), a viewer file with its default camera orbit, downloads (an empty list means view-only), credits, and a poster. Cars also list their factory colours (`paints`), which visitors can switch between in the viewer (owner, 2026-11-09).
- **Computed, never typed:** triangle count, file size and dimensions in metres.
- **Downloads:** 25 models can be downloaded under CC BY 4.0 with the credit "Malaysia 3D Library" (owner, 2026-11-09): the food, kopitiam props, kampung house, wau, animals, workshop and shophouse. The 8 cars and 18 landmarks are view-only until the rights in their real designs are checked.
- **Public gate:** the site can only go public when every model is approved, has a licence and verified credits, and has a poster.
- **Undecided:** the design, likeness and trademark rights for the cars and landmarks.

## Brand Commitments

- The name is Malaysia 3D Library.
- KL Rush appears only on the roadside billboards that advertise it, one after the Skyline, On the road and Night market exits (owner, 2026-11-09). No other advertising: no ad networks and no third-party scripts.
- Models are named as the real objects they are in Malaysia.
- The site is in English throughout, with the object's Malay, Chinese or Tamil name beside it wherever one exists.
- There is no gambling content.

## Evidence on Hand

- **Assets:** about 50 models, each with a GLB and a 1200 × 900 WebP poster rendered from its default camera.
- **Content:** their names, local names, summaries and tags are in `models/*/model.json`.
- **Absences:** there are no users, download counts, testimonials or press yet. Never invent them.

## Product Principles

1. **The object leads.** Every page puts the model in 3D first.
2. **Real and named.** Things are named the way Malaysians know them, with local names beside them.
3. **Honest status.** Say plainly what is in review and what can be downloaded.
4. **Light enough for a phone.** Pages and models must load and turn smoothly on a phone.

## Accessibility & Inclusion

- Phones are first-class: 390 px wide, in Safari (WebKit) as well as Chromium.
- Without WebGL, the poster stands in for the model.
- The viewer controls are keyboard operable.
