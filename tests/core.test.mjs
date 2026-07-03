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

  assert.equal(data.songs.length, 55);

  data.songs.forEach((song) => {
    assert.ok(levelIds.has(song.level), `${song.id} should reference an existing level`);
    assert.ok(Array.isArray(song.audio), `${song.id} should expose audio versions`);
    assert.ok(song.audio.length >= 1, `${song.id} should include at least one real audio version`);
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
        /\?v=20260704-g3-solo$/,
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

test("Romance de Amor is cataloged as a Grade 3 独奏 with audio", () => {
  const data = loadGuitarData();
  const song = data.songs.find((item) => item.id === "rsl-acoustic-g3-romance-de-amor");

  assert.ok(song, "Romance de Amor should be present");
  assert.equal(song.title, "Romance de Amor");
  assert.equal(song.artist, "Traditional");
  assert.equal(song.level, "g3");
  assert.equal(song.category, "独奏");
  assert.equal(song.style, "Classical Guitar Solo");
  assert.equal(song.source, "Teacher Upload");
  assert.equal(song.sourcePdf, "Romance_de_Amor#1.png + Romance_de_Amor#2.png");
  assert.equal(song.pdfPages, "1-2");
  assert.deepEqual(
    Array.from(song.audio, (item) => localAssetPathFromSrc(item.src)),
    ["assets/audio/rockschool/acoustic-guitar/rsl-acoustic-g3-romance-de-amor/solo.mp3"]
  );
  assert.equal(song.scoreImages.length, 2);
  assert.deepEqual(
    Array.from(song.scoreImages, (image) => localAssetPathFromSrc(image.src)),
    [
      "scores/acoustic-guitar/rsl-acoustic-g3-romance-de-amor/score-01.png",
      "scores/acoustic-guitar/rsl-acoustic-g3-romance-de-amor/score-02.png"
    ]
  );
});

test("audio tab renders the external speed-player component contract", () => {
  const indexSource = readIndexSource();
  const appSource = readAssetSource("app.js");

  assert.match(indexSource, /audio-speed-player-pro\.js/);
  assert.match(appSource, /<audio-speed-player/);
  assert.match(appSource, /rate="1"/);
  assert.match(appSource, /min-rate="0\.5"/);
  assert.match(appSource, /max-rate="1\.5"/);
  assert.match(appSource, /step="0\.05"/);
  assert.match(appSource, /engine="rubberband"/);
  assert.match(appSource, /no-upload/);
  assert.match(appSource, /version-selector/);
});

test("audio tab does not expose internal source/debug text", () => {
  const appSource = readAssetSource("app.js");

  assert.doesNotMatch(appSource, /placeholder source/);
  assert.doesNotMatch(appSource, /audio placeholder/);
  assert.doesNotMatch(appSource, /audio-template-note/);
  assert.doesNotMatch(appSource, /Add licensed demo/);
  assert.doesNotMatch(appSource, /<strong>\$\{escapeHtml\(activeSlot\.src\)\}<\/strong>/);
});

test("homepage does not render the song overview card grid shell", () => {
  const indexSource = readIndexSource();

  assert.match(indexSource, /assets\/data\.js\?v=20260704-g3-type-cn/);
  assert.doesNotMatch(indexSource, /id="songList"/);
  assert.doesNotMatch(indexSource, /id="resultCount"/);
  assert.doesNotMatch(indexSource, /id="activeSummary"/);
  assert.doesNotMatch(indexSource, />all songs</);
  assert.doesNotMatch(indexSource, /0 labels/);
});

test("evidence tab embeds the local professional metronome", () => {
  const appSource = readAssetSource("app.js");
  const styles = readAssetSource("styles.css");
  const shellRule = cssBlock(styles, ".lesson-metronome-shell");
  const frameRule = cssBlock(styles, ".lesson-metronome-frame");
  const metronomeDir = new URL("../assets/professional-metronome/", import.meta.url);

  assert.match(appSource, /class="lesson-metronome-frame"/);
  assert.match(appSource, /src="\.\/assets\/professional-metronome\/index\.html"/);
  assert.doesNotMatch(appSource, /professional-metronome-c0k\.pages\.dev/);
  assert.match(shellRule, /overflow:\s*hidden/);
  assert.match(frameRule, /height:\s*clamp\(640px,\s*82vh,\s*820px\)/);
  assert.ok(fs.existsSync(new URL("index.html", metronomeDir)), "metronome index should exist");
  assert.ok(fs.existsSync(new URL("assets/app.js", metronomeDir)), "metronome app bundle should exist");
  assert.ok(fs.existsSync(new URL("assets/metronome-core.js", metronomeDir)), "metronome core bundle should exist");
  assert.ok(fs.existsSync(new URL("assets/styles.css", metronomeDir)), "metronome styles should exist");
  assert.ok(fs.existsSync(new URL("assets/voice-count/one.wav", metronomeDir)), "voice count audio should exist");
});

test("starter grades module embeds the rhythm chain game inside a console shell without replacing motion hooks", () => {
  const indexSource = readIndexSource();
  const styles = readAssetSource("styles.css");
  const hoverRule = cssBlock(styles, ".showcase-object:hover .mini-notebook");
  const cardRule = cssBlock(styles, ".notebook-blue .mini-notebook.rhythm-game-card");
  const screenRule = cssBlock(styles, ".rhythm-game-screen");
  const viewportRule = cssBlock(styles, ".rhythm-game-viewport");
  const dpadRule = cssBlock(styles, ".rhythm-game-dpad");
  const actionRule = cssBlock(styles, ".rhythm-game-actions span");
  const speakerRule = cssBlock(styles, ".rhythm-game-speaker");
  const frameRule = cssBlock(styles, ".rhythm-game-frame");
  const rhythmDir = new URL("../assets/rhythm-chain-game/", import.meta.url);
  const rhythmIndexSource = fs.readFileSync(new URL("index.html", rhythmDir), "utf8");
  const rhythmAppSource = fs.readFileSync(new URL("assets/app.js", rhythmDir), "utf8");
  const rhythmStyles = fs.readFileSync(new URL("assets/styles.css", rhythmDir), "utf8");

  assert.match(indexSource, /class="mini-notebook rhythm-game-card"/);
  assert.match(indexSource, /测试下节奏感/);
  assert.doesNotMatch(indexSource, /starter grades/);
  assert.match(indexSource, /class="rhythm-game-screen"/);
  assert.match(indexSource, /class="rhythm-game-viewport"/);
  assert.match(indexSource, /src="\.\/assets\/rhythm-chain-game\/index\.html"/);
  assert.doesNotMatch(indexSource, /embed=console/);
  assert.match(indexSource, /class="rhythm-game-frame"/);
  assert.match(indexSource, /class="rhythm-game-dpad"/);
  assert.match(indexSource, /class="rhythm-game-actions"/);
  assert.match(indexSource, /class="rhythm-game-speaker"/);
  assert.ok(fs.existsSync(new URL("index.html", rhythmDir)), "rhythm game index should exist");
  assert.ok(fs.existsSync(new URL("assets/app.js", rhythmDir)), "rhythm game app bundle should exist");
  assert.ok(fs.existsSync(new URL("assets/rhythm-core.js", rhythmDir)), "rhythm game core bundle should exist");
  assert.ok(fs.existsSync(new URL("assets/styles.css", rhythmDir)), "rhythm game styles should exist");
  assert.match(cardRule, /width:\s*356px/);
  assert.match(cardRule, /height:\s*690px/);
  assert.match(cardRule, /overflow:\s*hidden/);
  assert.match(cardRule, /linear-gradient\(145deg,\s*#454b55/);
  assert.match(styles, /\.notebook-blue\s+\.mini-notebook\.rhythm-game-card::before\s*\{/);
  assert.match(styles, /\.notebook-blue\s+\.mini-notebook\.rhythm-game-card::after\s*\{/);
  assert.match(screenRule, /width:\s*304px/);
  assert.match(screenRule, /height:\s*494px/);
  assert.match(viewportRule, /position:\s*absolute/);
  assert.match(viewportRule, /inset:\s*0/);
  assert.match(viewportRule, /transform:\s*scale\(0\.706\)/);
  assert.match(dpadRule, /bottom:\s*26px/);
  assert.match(actionRule, /border-radius:\s*50%/);
  assert.match(speakerRule, /transform:\s*rotate\(-8deg\)/);
  assert.match(frameRule, /height:\s*700px/);
  assert.doesNotMatch(rhythmIndexSource, /console-embed/);
  assert.doesNotMatch(rhythmIndexSource, /embed-console/);
  assert.doesNotMatch(rhythmAppSource, /embed-console/);
  assert.doesNotMatch(rhythmStyles, /:root\.embed-console/);
  assert.match(rhythmStyles, /--page-gutter:\s*10px/);
  assert.match(rhythmStyles, /--app-radius:\s*28px/);
  assert.match(hoverRule, /rotate\(-3deg\)\s*translateY\(-6px\)/);
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
