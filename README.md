# GuitarBook

This is a static acoustic-guitar teaching site for browsing a graded RSL Acoustic Guitar song catalog with score pages, audio versions, filters, lesson notes, and a browser-based tuner.

Baseline source template checked on 2026-06-30:

- Source framework: sanitized public web template
- Source commit: `3bb760b5bd01f2dc2210bc8c2758d3448fc0ec0d`
- This copy has been renamed and reworded for acoustic guitar teaching.

## What Is Included

- `index.html`: page sections and buttons
- `assets/styles.css`: standalone responsive styling
- `assets/data.js`: Debut and Grade 1-8 acoustic-guitar catalog data
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

## Publishing Note

The catalog references commercial songs, score pages, and audio assets. Confirm you have the required publishing rights before making the media publicly available through GitHub or Cloudflare Pages.
