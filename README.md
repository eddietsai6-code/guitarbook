# Guitar Web Template

This is a clean static template for the GuitarBook acoustic-guitar teaching website.

Baseline source template checked on 2026-06-30:

- Source framework: sanitized public web template
- Source commit: `3bb760b5bd01f2dc2210bc8c2758d3448fc0ec0d`
- This copy has been renamed and reworded for acoustic guitar teaching.

## What Is Included

- `index.html`: page sections and buttons
- `assets/styles.css`: standalone responsive styling
- `assets/data.js`: placeholder guitar levels and songs
- `assets/app.js`: complete interactive script for filters, level buttons, song cards, tabs, and placeholders
- `assets/guitar-tuner.js` and `assets/guitar-tuner-core.js`: browser-based 12-TET and guitar tuner

## What Is Not Included

- No audio files
- No score images
- No payment QR images
- No source-project commercial score or audio references
- No external audio player dependency

## How To Use

Open `index.html` directly in a browser.

Or run the local syntax smoke test:

```powershell
npm.cmd test
```

To turn this into a real guitar site, edit `assets/data.js` first:

- Replace `levels` with your own teaching levels.
- Replace `songs` with your own guitar songs.
- Keep `audioSlots` and `scoreSlots` as placeholders until you are ready to connect real licensed assets.

When you are ready to connect real media, add new fields instead of putting private resources into the template by default.
