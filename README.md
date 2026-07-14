# GuitarBook

This is an acoustic-guitar teaching site for browsing a graded RSL Acoustic Guitar song catalog with score pages, audio versions, filters, lesson notes, and a browser-based tuner. The program shell is deployed through GitHub and Cloudflare Pages; day-to-day song content is published directly to Cloudflare D1 and R2.

Baseline source template checked on 2026-06-30:

- Source framework: sanitized public web template
- Source commit: `3bb760b5bd01f2dc2210bc8c2758d3448fc0ec0d`
- This copy has been renamed and reworded for acoustic guitar teaching.

## What Is Included

- `index.html`: page sections and buttons
- `assets/styles.css`: standalone responsive styling
- `assets/data.js`: Debut and Grade 1-8 acoustic-guitar catalog data
- `assets/catalog-runtime.js`: merges immutable D1 catalog releases with the static baseline and provides offline fallback
- `functions/`: public catalog/media routes and authenticated content publishing routes
- `migrations/`: D1 schema for immutable catalog releases
- `scripts/publish-content.mjs`: local content publisher for grade, position, audio, and scores
- `assets/app.js`: interactive script for filters, level buttons, song cards, audio, scores, tabs, and tuner controls
- `assets/audio/rockschool/acoustic-guitar/`: project-relative MP3 assets for mapped catalog songs
- `assets/guitar-tuner.js` and `assets/guitar-tuner-core.js`: browser-based 12-TET and guitar tuner
- `scores/acoustic-guitar/`: mapped score page images for catalog songs

## How To Use

Open `index.html` directly in a browser.

Or run the local syntax smoke test:

```powershell
npm.cmd test
```

## Two Publishing Paths

Use GitHub and Cloudflare Pages only when changing the program: HTML structure, CSS, player, tuner, metronome, runtime code, Functions, or database schema.

Use the direct content publisher when adding or updating a song, grade, position, audio, score images, or teaching notes. This uploads media to R2 and atomically activates a new D1 catalog release; it does not create a Git commit or rebuild Pages.

Required Cloudflare bindings for both Production and Preview:

- D1 binding `GUITARBOOK_DB`
- R2 binding `GUITARBOOK_MEDIA`
- encrypted secret `CONTENT_PUBLISH_SECRET`

Apply `migrations/0001_content_catalog.sql` to the bound D1 database before the first content publication.

For a publication, create an ignored folder such as `content/private/my-song/`, place `song.json` and its media files together, and use `content/song.template.json` as the field reference. The publisher reads `GUITARBOOK_PUBLISH_SECRET` from the process or from the ignored local file `.env.guitarbook-content`.

```powershell
$env:GUITARBOOK_PUBLISH_SECRET = "your-encrypted-publish-secret"
npm.cmd run content:publish -- content/private/my-song/song.json
```

To roll back the active dynamic catalog pointer without changing code or deleting media:

```powershell
npm.cmd run content:activate -- release-YYYYMMDD-HHMMSS-suffix
```

The browser requests `/api/catalog/current`, reads the immutable manifest, and caches the last valid version. If D1 or the network is unavailable, it uses the cached release; if no cache exists, the original static catalog still loads.

## Publishing Note

The catalog references commercial songs, score pages, and audio assets. Confirm you have the required publishing rights before making the media publicly available through GitHub or Cloudflare Pages.
