import {
  TUNING_MODES,
  centsToNeedleDegrees,
  detectPitchAutoCorrelate,
  findClosestInstrumentTarget,
  frequencyToNote,
  getRms,
  getTuningHint,
  isTuned
} from "./guitar-tuner-core.js";

const app = document.querySelector("#guitarTunerApp");

if (app) {
  const startButton = app.querySelector("#guitarTunerStart");
  const a4Input = app.querySelector("#guitarTunerA4");
  const needle = app.querySelector("#guitarTunerNeedle");
  const vuMeter = app.querySelector(".guitar-tuner-meter");
  const scale = app.querySelector(".guitar-tuner-scale");
  const meterFrequency = app.querySelector("#guitarTunerFrequency");
  const meterCentsValue = app.querySelector("#guitarTunerCents");
  const modeButtons = app.querySelectorAll(".guitar-tuner-mode");
  const modeKicker = app.querySelector("#guitarTunerModeLabel");
  const noteName = app.querySelector("#guitarTunerNote");
  const noteOctave = app.querySelector("#guitarTunerOctave");
  const targetValue = app.querySelector("#guitarTunerTarget");
  const statusText = app.querySelector("#guitarTunerStatus");
  const levelFill = app.querySelector("#guitarTunerLevel");

  let audioContext = null;
  let analyser = null;
  let stream = null;
  let animationFrame = null;
  let timeBuffer = null;
  let lastFrequency = null;
  let lastDetectedAt = 0;
  let activeMode = "chromatic";

  function buildScale() {
    for (let cents = -50; cents <= 50; cents += 5) {
      const tick = document.createElement("span");
      tick.className = "guitar-tuner-tick";
      if (cents % 10 === 0) tick.classList.add("is-major");
      if (cents === 0) tick.classList.add("is-center");
      tick.style.setProperty("--angle", `${centsToNeedleDegrees(cents)}deg`);
      scale.appendChild(tick);
    }
  }

  function getA4() {
    const value = Number.parseFloat(a4Input.value);
    if (!Number.isFinite(value)) return 440;
    return Math.min(480, Math.max(400, value));
  }

  function formatFrequency(value) {
    return Number.isFinite(value) ? value.toFixed(1) : "--";
  }

  function formatNoteLabel(note) {
    return note ? `${note.name}${note.octave}` : "--";
  }

  function setStatus(text, isError = false) {
    statusText.textContent = text;
    statusText.classList.toggle("is-error", isError);
  }

  function setNeedle(cents) {
    const degrees = centsToNeedleDegrees(cents);
    needle.style.setProperty("--needle-deg", `${degrees}deg`);
    vuMeter.setAttribute("aria-valuenow", String(Math.max(-50, Math.min(50, cents))));
  }

  function setTunedState(tuned) {
    app.classList.toggle("is-tuned", tuned);
  }

  function getTuningResult(frequency) {
    if (activeMode === "chromatic") {
      const note = frequencyToNote(frequency, getA4());
      return note ? { ...note, display: formatNoteLabel(note) } : null;
    }
    return findClosestInstrumentTarget(frequency, activeMode, getA4());
  }

  function updateModeReadout() {
    const mode = TUNING_MODES[activeMode] || TUNING_MODES.chromatic;
    modeKicker.textContent = mode.displayName || mode.label;

    modeButtons.forEach((button) => {
      const modeId = button.dataset.mode || "chromatic";
      const selected = modeId === activeMode;
      const reference = button.querySelector("small");
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-pressed", String(selected));
      if (reference) reference.textContent = getTuningHint(modeId);
    });
  }

  function updateReadout(result) {
    if (!result) {
      setTunedState(false);
      setNeedle(0);
      meterFrequency.textContent = "--";
      meterCentsValue.textContent = "0";
      noteName.textContent = "--";
      noteOctave.textContent = "";
      targetValue.textContent = "";
      return;
    }

    const tuned = isTuned(result.cents);
    const centsPrefix = result.cents > 0 ? "+" : "";

    setTunedState(tuned);
    setNeedle(result.cents);
    meterFrequency.textContent = formatFrequency(result.frequency);
    meterCentsValue.textContent = `${centsPrefix}${result.cents}`;
    noteName.textContent = result.name;
    noteOctave.textContent = result.octave;
    targetValue.textContent = activeMode === "chromatic" ? "Nearest 12-TET note" : result.display;

    if (tuned) {
      setStatus("TUNED");
    } else if (result.cents < 0) {
      setStatus("FLAT");
    } else {
      setStatus("SHARP");
    }
  }

  function updateLevel(buffer) {
    const level = Math.min(1, getRms(buffer) * 8);
    levelFill.style.width = `${Math.round(level * 100)}%`;
  }

  function tick() {
    if (!analyser || !audioContext || !timeBuffer) return;

    analyser.getFloatTimeDomainData(timeBuffer);
    updateLevel(timeBuffer);

    const detected = detectPitchAutoCorrelate(timeBuffer, audioContext.sampleRate, {
      minFrequency: 40,
      maxFrequency: 5000,
      rmsThreshold: 0.0035,
      correlationThreshold: 0.68
    });

    if (detected) {
      lastFrequency = detected;
      lastDetectedAt = performance.now();
      updateReadout(getTuningResult(detected));
    } else if (lastFrequency && performance.now() - lastDetectedAt > 650) {
      lastFrequency = null;
      updateReadout(null);
      setStatus("LISTENING");
    } else if (!lastFrequency) {
      updateReadout(null);
      setStatus("LISTENING");
    }

    animationFrame = window.requestAnimationFrame(tick);
  }

  async function start() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("MIC API UNAVAILABLE", true);
      return;
    }

    startButton.disabled = true;
    setStatus("STARTING");

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioContext = new AudioContextClass();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 8192;
      analyser.smoothingTimeConstant = 0.12;
      timeBuffer = new Float32Array(analyser.fftSize);

      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      startButton.textContent = "Stop";
      startButton.disabled = false;
      lastFrequency = null;
      lastDetectedAt = 0;
      setStatus("LISTENING");
      animationFrame = window.requestAnimationFrame(tick);
    } catch (error) {
      stop();
      startButton.disabled = false;
      setStatus(error?.name === "NotAllowedError" ? "MIC DENIED" : "MIC ERROR", true);
    }
  }

  function stop() {
    if (animationFrame) {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      stream = null;
    }

    if (audioContext) {
      audioContext.close();
      audioContext = null;
    }

    analyser = null;
    timeBuffer = null;
    lastFrequency = null;
    lastDetectedAt = 0;
    levelFill.style.width = "0%";
    startButton.textContent = "Start";
    startButton.disabled = false;
    updateReadout(null);
    setStatus("READY");
  }

  startButton.addEventListener("click", () => {
    if (audioContext) {
      stop();
      return;
    }
    start();
  });

  a4Input.addEventListener("change", () => {
    a4Input.value = getA4().toString();
    if (lastFrequency) updateReadout(getTuningResult(lastFrequency));
  });

  modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activeMode = button.dataset.mode || "chromatic";
      updateModeReadout();
      if (lastFrequency) {
        updateReadout(getTuningResult(lastFrequency));
      } else {
        updateReadout(null);
      }
    });
  });

  buildScale();
  updateModeReadout();
  updateReadout(null);
}
