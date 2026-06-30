import test from "node:test";
import assert from "node:assert/strict";

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
