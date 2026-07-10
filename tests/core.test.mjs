import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

import { detectPitchAutoCorrelate, getRms } from "../assets/guitar-tuner-core.js";

const sampleRate = 48000;
const bufferLength = 8192;

function generateSineBuffer(frequency, amplitude) {
  const buffer = new Float32Array(bufferLength);
  for (let index = 0; index < buffer.length; index += 1) {
    buffer[index] = amplitude * Math.sin((2 * Math.PI * frequency * index) / sampleRate);
  }
  return buffer;
}

function generateNoiseBuffer(amplitude) {
  const buffer = new Float32Array(bufferLength);
  let seed = 123456789;
  for (let index = 0; index < buffer.length; index += 1) {
    seed = (1103515245 * seed + 12345) % 2147483648;
    buffer[index] = amplitude * ((seed / 2147483648) * 2 - 1);
  }
  return buffer;
}

function loadGuitarData() {
  const source = fs.readFileSync(new URL("../assets/data.js", import.meta.url), "utf8");
  const sandbox = { window: {} };
  vm.runInNewContext(source, sandbox);
  return sandbox.window.GUITAR_LEVEL_DATA;
}

function readAssetSource(name) {
  return fs.readFileSync(new URL(`../assets/${name}`, import.meta.url), "utf8");
}

function readProfessionalMetronomeAsset(name) {
  return fs.readFileSync(new URL(`../assets/professional-metronome/${name}`, import.meta.url), "utf8");
}

function readIndexSource() {
  return fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
}

function localAssetPathFromSrc(src) {
  return src.replace("./", "").split(/[?#]/)[0];
}

function cssBlock(source, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : "";
}

test("detectPitchAutoCorrelate detects weak notes above C4", () => {
  const buffer = generateSineBuffer(329.627557, 0.004);

  assert.ok(getRms(buffer) < 0.0035, "fixture should be below the old gate");

  const detected = detectPitchAutoCorrelate(buffer, sampleRate);

  assert.ok(detected, "expected a weak E4 to be detected");
  assert.ok(Math.abs(detected - 329.627557) < 2, `expected E4, got ${detected}`);
});

test("detectPitchAutoCorrelate still ignores non-periodic low-level noise", () => {
  const buffer = generateNoiseBuffer(0.004);

  assert.equal(detectPitchAutoCorrelate(buffer, sampleRate), null);
});

test("RSL acoustic levels expose one cover per Debut and G1-G8 grade", () => {
  const data = loadGuitarData();
  const expected = [
    ["debut", "./assets/covers/rsl-acoustic-debut.webp"],
    ["g1", "./assets/covers/rsl-acoustic-g1.webp"],
    ["g2", "./assets/covers/rsl-acoustic-g2.webp"],
    ["g3", "./assets/covers/rsl-acoustic-g3.webp"],
    ["g4", "./assets/covers/rsl-acoustic-g4.webp"],
    ["g5", "./assets/covers/rsl-acoustic-g5.webp"],
    ["g6", "./assets/covers/rsl-acoustic-g6.webp"],
    ["g7", "./assets/covers/rsl-acoustic-g7.webp"],
    ["g8", "./assets/covers/rsl-acoustic-g8.webp"]
  ];

  assert.equal(data.levels.length, expected.length);
  assert.deepEqual(
    Array.from(data.levels, (level) => level.id),
    expected.map(([id]) => id)
  );

  for (const [index, [id, cover]] of expected.entries()) {
    const level = data.levels[index];
    assert.equal(level.id, id);
    assert.equal(level.order, index);
    assert.equal(level.cover, cover);
    assert.ok(
      fs.existsSync(path.join(process.cwd(), cover.replace("./", ""))),
      `${cover} should exist`
    );
  }

  const levelIds = new Set(data.levels.map((level) => level.id));
  data.songs.forEach((song) => {
    assert.ok(levelIds.has(song.level), `${song.id} should reference an existing level`);
  });
});

test("songs expose real playable audio versions and mapped score assets", () => {
  const data = loadGuitarData();
  const levelIds = new Set(data.levels.map((level) => level.id));

  assert.equal(data.songs.length, 58);

  data.songs.forEach((song) => {
    assert.ok(levelIds.has(song.level), `${song.id} should reference an existing level`);
    assert.ok(Array.isArray(song.audio), `${song.id} should expose audio versions`);
    if (song.category !== "独奏") {
      assert.ok(song.audio.length >= 1, `${song.id} should include at least one real audio version`);
    }
    assert.equal(song.scoreImages.length, song.scoreImageCount, `${song.id} should match its score image count`);

    song.audio.forEach((version) => {
      assert.ok(version.title, `${song.id} audio version should have a title`);
      assert.ok(
        version.src.startsWith(`./assets/audio/rockschool/acoustic-guitar/${song.id}/`),
        `${song.id} should use the project audio asset folder`
      );
      assert.equal(path.isAbsolute(version.src), false, `${song.id} audio path should be relative`);
      assert.doesNotMatch(version.src, /^(?:[a-z]:|file:\/\/)/i, `${song.id} should not use a local absolute audio path`);
      assert.doesNotMatch(version.src, /(?:slow|slower|practice|practise|0\.75|0\.85|75%|85%)/i);
      assert.equal(
        fs.existsSync(path.join(process.cwd(), version.src.replace("./", ""))),
        true,
        `${song.id} audio file should exist`
      );
    });

    const audioDir = path.join(process.cwd(), "assets", "audio", "rockschool", "acoustic-guitar", song.id);
    const audioFiles = fs.existsSync(audioDir) ? fs.readdirSync(audioDir).filter((name) => /\.mp3$/i.test(name)) : [];
    assert.equal(audioFiles.length, song.audio.length, `${song.id} should not have unmapped audio files`);

    song.scoreImages.forEach((image, index) => {
      assert.equal(path.isAbsolute(image.src), false, `${song.id} score ${index + 1} should use a relative path`);
      assert.ok(
        image.src.startsWith("./scores/acoustic-guitar/"),
        `${song.id} score ${index + 1} should use the acoustic-guitar score folder`
      );
      assert.match(
        image.src,
        /\?v=20260706-romance-original-quality$/,
        `${song.id} score ${index + 1} should cache-bust cleaned RSL score images`
      );
      assert.ok(
        fs.existsSync(path.join(process.cwd(), localAssetPathFromSrc(image.src))),
        `${song.id} score ${index + 1} should exist`
      );
    });

    const scoreDir = path.join(process.cwd(), "scores", "acoustic-guitar", song.id);
    const scoreFiles = fs.readdirSync(scoreDir).filter((name) => /^score-\d+\.png$/.test(name));
    assert.equal(scoreFiles.length, song.scoreImages.length, `${song.id} should not have extra score images`);
  });
});

test("Romance de Amor is cataloged as a Grade 4 独奏 with audio", () => {
  const data = loadGuitarData();
  const song = data.songs.find((item) => item.id === "rsl-acoustic-g4-romance-de-amor");

  assert.ok(song, "Romance de Amor should be present");
  assert.equal(song.title, "Romance de Amor");
  assert.equal(song.artist, "Traditional");
  assert.equal(song.level, "g4");
  assert.equal(song.category, "独奏");
  assert.equal(song.style, "Classical Guitar Solo");
  assert.equal(song.source, "Teacher Upload");
  assert.equal(song.sourcePdf, "Romance_de_Amor#1.png + Romance_de_Amor#2.png");
  assert.equal(song.pdfPages, "1-2");
  assert.deepEqual(
    Array.from(song.audio, (item) => localAssetPathFromSrc(item.src)),
    [
      "assets/audio/rockschool/acoustic-guitar/rsl-acoustic-g4-romance-de-amor/solo.mp3",
      "assets/audio/rockschool/acoustic-guitar/rsl-acoustic-g4-romance-de-amor/solo-click.mp3"
    ]
  );
  assert.deepEqual(Array.from(song.audio, (item) => item.title), ["Solo", "Solo (click)"]);
  assert.equal(song.scoreImages.length, 2);
  assert.deepEqual(
    Array.from(song.scoreImages, (image) => localAssetPathFromSrc(image.src)),
    [
      "scores/acoustic-guitar/rsl-acoustic-g4-romance-de-amor/score-01.png",
      "scores/acoustic-guitar/rsl-acoustic-g4-romance-de-amor/score-02.png"
    ]
  );
});

test("The Sound of Silence is cataloged as a Grade 2 独奏 score", () => {
  const data = loadGuitarData();
  const song = data.songs.find((item) => item.id === "rsl-acoustic-g2-the-sound-of-silence");

  assert.ok(song, "The Sound of Silence should be present");
  assert.equal(song.title, "The Sound of Silence");
  assert.equal(song.artist, "P. Simon");
  assert.equal(song.level, "g2");
  assert.equal(song.category, "独奏");
  assert.equal(song.style, "Classical Guitar Solo");
  assert.equal(song.source, "Teacher Upload");
  assert.equal(song.sourcePdf, "The Sound Of Silence.png");
  assert.equal(song.pdfPages, "1");
  assert.deepEqual(
    Array.from(song.audio, (item) => localAssetPathFromSrc(item.src)),
    [
      "assets/audio/rockschool/acoustic-guitar/rsl-acoustic-g2-the-sound-of-silence/solo.mp3",
      "assets/audio/rockschool/acoustic-guitar/rsl-acoustic-g2-the-sound-of-silence/solo-click.mp3"
    ]
  );
  assert.deepEqual(Array.from(song.audio, (item) => item.title), ["Solo", "Solo (click)"]);
  assert.equal(song.scoreImages.length, 1);
  assert.deepEqual(
    Array.from(song.scoreImages, (image) => localAssetPathFromSrc(image.src)),
    ["scores/acoustic-guitar/rsl-acoustic-g2-the-sound-of-silence/score-01.png"]
  );
});

test("You Raise Me Up is cataloged as a Grade 3 独奏 score", () => {
  const data = loadGuitarData();
  const song = data.songs.find((item) => item.id === "rsl-acoustic-g3-you-raise-me-up");

  assert.ok(song, "You Raise Me Up should be present");
  assert.equal(song.title, "You Raise Me Up");
  assert.equal(song.artist, "Secret Garden");
  assert.equal(song.level, "g3");
  assert.equal(song.category, "独奏");
  assert.equal(song.style, "Fingerstyle Solo");
  assert.equal(song.source, "Teacher Upload");
  assert.equal(song.sourcePdf, "You Raise Me Up#1.png");
  assert.equal(song.pdfPages, "1");
  assert.deepEqual(
    Array.from(song.audio, (item) => localAssetPathFromSrc(item.src)),
    [
      "assets/audio/rockschool/acoustic-guitar/rsl-acoustic-g3-you-raise-me-up/solo.mp3",
      "assets/audio/rockschool/acoustic-guitar/rsl-acoustic-g3-you-raise-me-up/solo-click.mp3"
    ]
  );
  assert.deepEqual(Array.from(song.audio, (item) => item.title), ["Solo", "Solo (click)"]);
  assert.equal(song.scoreImages.length, 1);
  assert.deepEqual(
    Array.from(song.scoreImages, (image) => localAssetPathFromSrc(image.src)),
    ["scores/acoustic-guitar/rsl-acoustic-g3-you-raise-me-up/score-01.png"]
  );
});

test("Canon is cataloged as a Grade 3 独奏 score", () => {
  const data = loadGuitarData();
  const song = data.songs.find((item) => item.id === "rsl-acoustic-g3-canon");

  assert.ok(song, "Canon should be present");
  assert.equal(song.title, "Canon");
  assert.equal(song.artist, "J. Pachelbel");
  assert.equal(song.level, "g3");
  assert.equal(song.category, "独奏");
  assert.equal(song.style, "Classical Guitar Solo");
  assert.equal(song.source, "Teacher Upload");
  assert.equal(song.sourcePdf, "Canon#1.png + Canon#2.png");
  assert.equal(song.pdfPages, "1-2");
  assert.deepEqual(
    Array.from(song.audio, (item) => localAssetPathFromSrc(item.src)),
    [
      "assets/audio/rockschool/acoustic-guitar/rsl-acoustic-g3-canon/solo.mp3",
      "assets/audio/rockschool/acoustic-guitar/rsl-acoustic-g3-canon/solo-click.mp3"
    ]
  );
  assert.deepEqual(Array.from(song.audio, (item) => item.title), ["Solo", "Solo (click)"]);
  assert.equal(song.scoreImages.length, 2);
  assert.deepEqual(
    Array.from(song.scoreImages, (image) => localAssetPathFromSrc(image.src)),
    [
      "scores/acoustic-guitar/rsl-acoustic-g3-canon/score-01.png",
      "scores/acoustic-guitar/rsl-acoustic-g3-canon/score-02.png"
    ]
  );
});

test("audio tab renders the external speed-player component contract", () => {
  const indexSource = readIndexSource();
  const appSource = readAssetSource("app.js");

  assert.match(
    indexSource,
    /<script type="module" src="https:\/\/eddietsai6-code\.github\.io\/audio-speed-player\/dist\/audio-speed-player-pro\.js"><\/script>/
  );
  assert.match(indexSource, /assets\/app\.js\?v=20260711-stable-metronome-dock/);
  assert.match(appSource, /<audio-speed-player/);
  assert.match(appSource, /engine="rubberband"/);
  assert.match(appSource, /label="\$\{escapeAttribute\(playerLabel\)\}"/);
  assert.match(appSource, /playerSrcAttribute/);
  assert.match(appSource, /no-upload/);
  assert.doesNotMatch(appSource, /version-selector/);
  assert.doesNotMatch(appSource, /min-rate=/);
  assert.doesNotMatch(appSource, /max-rate=/);
  assert.doesNotMatch(appSource, /step=/);
});

test("audio tab does not expose internal source/debug text", () => {
  const appSource = readAssetSource("app.js");

  assert.doesNotMatch(appSource, /placeholder source/);
  assert.doesNotMatch(appSource, /audio placeholder/);
  assert.doesNotMatch(appSource, /audio-template-note/);
  assert.doesNotMatch(appSource, /Audio not attached/);
  assert.doesNotMatch(appSource, /Add licensed demo/);
  assert.doesNotMatch(appSource, /<strong>\$\{escapeHtml\(activeSlot\.src\)\}<\/strong>/);
});

test("homepage does not render the song overview card grid shell", () => {
  const indexSource = readIndexSource();

  assert.match(indexSource, /assets\/data\.js\?v=20260706-romance-original-quality/);
  assert.doesNotMatch(indexSource, /id="songList"/);
  assert.doesNotMatch(indexSource, /id="resultCount"/);
  assert.doesNotMatch(indexSource, /id="activeSummary"/);
  assert.doesNotMatch(indexSource, />all songs</);
  assert.doesNotMatch(indexSource, /0 labels/);
});

test("evidence tab embeds the remote professional metronome", () => {
  const indexSource = readIndexSource();
  const appSource = readAssetSource("app.js");
  const styles = readAssetSource("styles.css");
  const shellRule = cssBlock(styles, ".lesson-metronome-shell");
  const frameRule = cssBlock(styles, ".lesson-metronome-frame");

  assert.match(indexSource, /assets\/app\.js\?v=20260711-stable-metronome-dock/);
  assert.match(appSource, /data-tab="evidence">Metro<\/button>/);
  assert.doesNotMatch(appSource, /data-tab="evidence">Evidence<\/button>/);
  assert.match(appSource, /const metronomeSrc = `https:\/\/professional-metronome-c0k\.pages\.dev\/\?v=\$\{Date\.now\(\)\}`/);
  assert.match(appSource, /data-tab-panel="evidence"/);
  assert.match(appSource, /lesson-metronome-pane \$\{state\.detailTab === "evidence" \? "" : "is-parked"\}/);
  assert.doesNotMatch(appSource, /contentPane\.innerHTML\s*=\s*renderContentPane/);
  assert.match(appSource, /class="lesson-metronome-frame"/);
  assert.match(appSource, /src="\$\{metronomeSrc\}"/);
  assert.match(appSource, /allow="autoplay"/);
  assert.doesNotMatch(appSource, /src="\.\/assets\/professional-metronome\/index\.html"/);
  assert.match(shellRule, /overflow:\s*hidden/);
  assert.match(frameRule, /height:\s*clamp\(640px,\s*82vh,\s*820px\)/);
});

test("metronome iframe stays mounted when switching detail tabs", () => {
  const styles = readAssetSource("styles.css");
  const stackRule = cssBlock(styles, ".lesson-content-stack");
  const parkedRule = cssBlock(styles, ".lesson-metronome-pane.is-parked");

  assert.match(stackRule, /position:\s*relative/);
  assert.match(parkedRule, /position:\s*fixed/);
  assert.match(parkedRule, /width:\s*min\(360px,\s*calc\(100vw - 24px\)\)/);
  assert.match(parkedRule, /height:\s*112px/);
  assert.match(parkedRule, /pointer-events:\s*none/);
  assert.match(parkedRule, /opacity:\s*1/);
  assert.doesNotMatch(parkedRule, /z-index:\s*-1/);
});

test("professional metronome transport buttons use iPad-safe touch bindings", () => {
  const indexSource = readProfessionalMetronomeAsset("index.html");
  const appSource = readProfessionalMetronomeAsset("assets/app.js");
  const styles = readProfessionalMetronomeAsset("assets/styles.css");

  assert.match(indexSource, /assets\/styles\.css\?v=20260711-stable-scheduler/);
  assert.match(indexSource, /assets\/app\.js\?v=20260711-stable-scheduler/);
  assert.match(appSource, /const LOOKAHEAD_SECONDS = 6;/);
  assert.match(appSource, /function bindTouchSafeButton\(button, handler\)/);
  assert.match(appSource, /addEventListener\("pointerup"/);
  assert.match(appSource, /addEventListener\(\s*"touchend"/);
  assert.match(appSource, /bindTouchSafeButton\(elements\.playToggle, togglePlayback\)/);
  assert.match(appSource, /bindTouchSafeButton\(elements\.tapTempo, handleTapTempo\)/);
  assert.match(appSource, /bindTouchSafeButton\(elements\.muteToggle, toggleMute\)/);
  assert.match(styles, /touch-action:\s*manipulation/);
  assert.match(styles, /-webkit-tap-highlight-color:\s*transparent/);
});

test("rhythm module embeds the latest local rhythm chain game without changing the outer console design", () => {
  const indexSource = readIndexSource();
  const styles = readAssetSource("styles.css");
  const rhythmDir = new URL("../assets/rhythm-chain-game/", import.meta.url);
  const showcaseRule = cssBlock(styles, ".showcase-object.notebook-blue.rhythm-remote-showcase");
  const cardRule = cssBlock(styles, ".notebook-blue .mini-notebook.rhythm-game-card.rhythm-remote-card");
  const frameOverlayRule = cssBlock(styles, ".notebook-blue .mini-notebook.rhythm-game-card.rhythm-remote-card::before");
  const frameBadgeRule = cssBlock(styles, ".notebook-blue .mini-notebook.rhythm-game-card.rhythm-remote-card::after");
  const iframeRule = cssBlock(styles, ".rhythm-remote-card iframe");
  const hoverRule = cssBlock(styles, ".showcase-object:hover .mini-notebook.rhythm-remote-card");

  assert.match(indexSource, /class="[^"]*mini-notebook[^"]*rhythm-game-card[^"]*rhythm-remote-card[^"]*"/);
  assert.match(indexSource, /rhythm-remote-showcase/);
  assert.match(indexSource, /rhythm-remote-card/);
  assert.match(indexSource, /测试下节奏感/);
  assert.doesNotMatch(indexSource, /starter grades/);
  assert.match(
    indexSource,
    /src="\.\/assets\/rhythm-chain-game\/index\.html\?v=20260710-rhythm-update"/
  );
  assert.match(indexSource, /style="width:430px;height:844px;border:0;max-width:100%;"/);
  assert.doesNotMatch(indexSource, /rhythm-chain-game\.pages\.dev/);
  assert.ok(fs.existsSync(new URL("index.html", rhythmDir)), "rhythm game index should exist");
  assert.ok(fs.existsSync(new URL("assets/app.js", rhythmDir)), "rhythm game app bundle should exist");
  assert.ok(fs.existsSync(new URL("assets/rhythm-core.js", rhythmDir)), "rhythm game core bundle should exist");
  assert.ok(fs.existsSync(new URL("assets/styles.css", rhythmDir)), "rhythm game styles should exist");
  assert.doesNotMatch(indexSource, /showcase-level/);
  assert.doesNotMatch(indexSource, /RHYTHM POCKET/);
  assert.doesNotMatch(indexSource, /class="rhythm-game-screen"/);
  assert.doesNotMatch(indexSource, /class="rhythm-game-viewport"/);
  assert.doesNotMatch(indexSource, /embed=console/);
  assert.doesNotMatch(indexSource, /class="rhythm-game-dpad"/);
  assert.doesNotMatch(indexSource, /class="rhythm-game-actions"/);
  assert.doesNotMatch(indexSource, /class="rhythm-game-speaker"/);
  assert.match(showcaseRule, /min-height:\s*1080px/);
  assert.match(cardRule, /width:\s*min\(494px,\s*calc\(100vw - 40px\)\)/);
  assert.match(cardRule, /padding:\s*clamp\(20px,\s*5vw,\s*32px\)/);
  assert.match(cardRule, /border:\s*4px solid #17324b/);
  assert.match(cardRule, /background:[\s\S]*linear-gradient\(180deg,\s*#fbfffd/);
  assert.match(cardRule, /box-shadow:[\s\S]*0 0 0 9px rgba\(99,\s*237,\s*219,\s*0\.34\)/);
  assert.match(cardRule, /display:\s*grid/);
  assert.match(cardRule, /transform:\s*translateX\(-50%\) rotate\(-3deg\)/);
  assert.match(frameOverlayRule, /inset:\s*14px 14px 52px/);
  assert.match(frameBadgeRule, /content:\s*"CHAIN \/ CARDS"/);
  assert.match(frameBadgeRule, /background:\s*#fff2c9/);
  assert.match(iframeRule, /width:\s*100% !important/);
  assert.match(iframeRule, /height:\s*auto !important/);
  assert.match(iframeRule, /aspect-ratio:\s*430 \/ 844/);
  assert.match(iframeRule, /background:\s*#ffffff/);
  assert.match(hoverRule, /translateX\(-50%\)\s*rotate\(-2deg\)\s*translateY\(-6px\)/);
  assert.match(styles, /\.product-row\s*\{[\s\S]*grid-template-columns:\s*minmax\(494px,\s*1fr\)\s*minmax\(280px,\s*360px\)\s*minmax\(250px,\s*1fr\)/);
  assert.match(styles, /@media \(max-width:\s*1180px\)[\s\S]*\.product-row\s*\{[\s\S]*grid-template-columns:\s*1fr/);
  assert.match(styles, /@media \(max-width:\s*640px\)[\s\S]*rhythm-remote-showcase[\s\S]*min-height:\s*clamp\(800px,\s*210vw,\s*950px\)/);
});

test("score sheet images preserve white source rendering", () => {
  const styles = readAssetSource("styles.css");
  const imageRule = cssBlock(styles, ".score-card img");
  const frameRule = cssBlock(styles, ".score-image-frame");

  assert.match(frameRule, /background:\s*#ffffff/);
  assert.match(imageRule, /background:\s*#ffffff/);
  assert.match(imageRule, /filter:\s*none/);
  assert.match(imageRule, /opacity:\s*1/);
  assert.match(imageRule, /mix-blend-mode:\s*normal/);
});

test("lesson media shells can shrink from the iPad layout to phone widths", () => {
  const styles = readAssetSource("styles.css");
  const lessonPaneRule = cssBlock(styles, ".lesson-pane");
  const audioWorkbenchRule = cssBlock(styles, ".audio-workbench");
  const audioFrameRule = cssBlock(styles, ".audio-player-frame");
  const playerShellRule = cssBlock(styles, ".audio-speed-player-shell");
  const scoreCardRule = cssBlock(styles, ".score-card");

  assert.match(lessonPaneRule, /min-width:\s*0/);
  assert.match(audioWorkbenchRule, /min-width:\s*0/);
  assert.match(audioFrameRule, /min-width:\s*0/);
  assert.match(audioFrameRule, /max-width:\s*100%/);
  assert.match(playerShellRule, /min-width:\s*0/);
  assert.match(playerShellRule, /max-width:\s*100%/);
  assert.match(scoreCardRule, /min-width:\s*0/);
  assert.match(scoreCardRule, /max-width:\s*100%/);
});
