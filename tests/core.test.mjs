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
