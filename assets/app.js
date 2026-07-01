(function () {
  const data = window.GUITAR_LEVEL_DATA;
  const songTechProfiles = window.GUITAR_SONG_TECH_PROFILES || {};

  function mergeSongTechProfiles() {
    data.songs.forEach((song) => {
      const profile = songTechProfiles[song.id];
      if (!profile) return;
      song.technicalProfile = profile;
      if (Array.isArray(profile.tags) && profile.tags.length) {
        song.techniques = profile.tags;
      }
      song.teaching = {
        ...song.teaching,
        focus: profile.focus || song.teaching.focus,
        practiceOrder: Array.isArray(profile.practiceOrder) ? profile.practiceOrder : song.teaching.practiceOrder,
        commonIssues: Array.isArray(profile.commonIssues) ? profile.commonIssues : song.teaching.commonIssues,
        passStandard: profile.passStandard || song.teaching.passStandard
      };
    });
  }

  mergeSongTechProfiles();

  const state = {
    query: "",
    level: "all",
    source: "all",
    category: "all",
    selectedSongId: data.songs[0] ? data.songs[0].id : "",
    detailTab: "lesson",
    activeLevelPicker: "",
    levelPickerOpen: false,
    audioVersionBySong: {}
  };

  const els = {
    heroStats: document.getElementById("heroStats"),
    heroNotebook: document.getElementById("heroNotebook"),
    infiniteMenu: document.getElementById("infiniteMenu"),
    orbitCanvas: document.getElementById("orbitCanvas"),
    orbitTitle: document.getElementById("orbitTitle"),
    orbitDescription: document.getElementById("orbitDescription"),
    orbitAction: document.getElementById("orbitAction"),
    heroPressure: document.getElementById("heroPressure"),
    heroLanyard: document.getElementById("heroLanyard"),
    levelBoard: document.getElementById("levelBoard"),
    levelSongPicker: document.getElementById("levelSongPicker"),
    queryInput: document.getElementById("queryInput"),
    sourceFilter: document.getElementById("sourceFilter"),
    categoryFilter: document.getElementById("categoryFilter"),
    levelFilter: document.getElementById("levelFilter"),
    techCloud: document.getElementById("techCloud"),
    resultCount: document.getElementById("resultCount"),
    activeSummary: document.getElementById("activeSummary"),
    songList: document.getElementById("songList"),
    songDetail: document.getElementById("songDetail")
  };

  const levelById = Object.fromEntries(data.levels.map((level) => [level.id, level]));
  const AUDIO_VERSION_COUNT = 3;
  const orbit = {
    initialized: false,
    discs: [],
    activeIndex: 0,
    rotationX: -0.18,
    rotationY: 0.28,
    velocityX: 0,
    velocityY: 0.003,
    pointerDown: false,
    lastX: 0,
    lastY: 0,
    moved: false,
    frame: 0
  };
  const pressure = {
    initialized: false,
    container: null,
    chars: [],
    hasPointer: false,
    resizeTimer: 0,
    pointer: { x: 0, y: 0 },
    smooth: { x: 0, y: 0 },
    frame: 0
  };
  const levelGallery = {
    initialized: false,
    cards: [],
    current: 0,
    target: 0,
    frame: 0,
    pointerDown: false,
    moved: false,
    startX: 0,
    startTarget: 0,
    cardStep: 320
  };
  const levelSongSplash = {
    canvas: null,
    ctx: null,
    frame: 0,
    particles: [],
    dpr: 1,
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)")
  };
  const lanyard = {
    initialized: false,
    canvas: null,
    ctx: null,
    dpr: 1,
    width: 0,
    height: 0,
    frame: 0,
    lastTime: 0,
    dragging: false,
    hover: false,
    pointerId: null,
    pointer: { x: 0, y: 0, previousX: 0, previousY: 0 },
    points: [],
    constraints: [],
    card: { width: 138, height: 188, angle: 0, skew: 0 }
  };
  const chromaPalette = [
    { border: "#3B82F6", gradient: "linear-gradient(145deg, #3B82F6, #09090b)" },
    { border: "#10B981", gradient: "linear-gradient(210deg, #10B981, #09090b)" },
    { border: "#F59E0B", gradient: "linear-gradient(165deg, #F59E0B, #09090b)" },
    { border: "#EF4444", gradient: "linear-gradient(195deg, #EF4444, #09090b)" },
    { border: "#8B5CF6", gradient: "linear-gradient(225deg, #8B5CF6, #09090b)" },
    { border: "#06B6D4", gradient: "linear-gradient(135deg, #06B6D4, #09090b)" },
    { border: "#F97316", gradient: "linear-gradient(155deg, #F97316, #09090b)" },
    { border: "#EC4899", gradient: "linear-gradient(215deg, #EC4899, #09090b)" },
    { border: "#84CC16", gradient: "linear-gradient(180deg, #84CC16, #09090b)" }
  ];

  function normalize(value) {
    return String(value || "").toLowerCase().trim();
  }

  function escapeAttribute(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function uniqueValues(key) {
    return [...new Set(data.songs.map((song) => song[key]).filter(Boolean))].sort();
  }

  function getSelectedSong() {
    return data.songs.find((song) => song.id === state.selectedSongId) || data.songs[0] || null;
  }

  function levelCount(levelId) {
    return data.songs.filter((song) => song.level === levelId).length;
  }

  function songsForLevel(levelId) {
    return data.songs
      .filter((song) => song.level === levelId)
      .sort((a, b) => a.title.localeCompare(b.title, "zh-CN"));
  }

  function levelShort(level) {
    return level.order === 0 ? "Debut" : `G${level.order}`;
  }

  function chromaStyle(level) {
    const item = chromaPalette[level.order % chromaPalette.length];
    return `--card-border:${item.border}; --card-gradient:${item.gradient};`;
  }

  function resetLevelSongSplash() {
    if (levelSongSplash.frame) {
      cancelAnimationFrame(levelSongSplash.frame);
    }
    levelSongSplash.canvas = null;
    levelSongSplash.ctx = null;
    levelSongSplash.frame = 0;
    levelSongSplash.particles = [];
  }

  function syncLevelSongSplashSize() {
    const { canvas, ctx } = levelSongSplash;
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));

    if (canvas.width !== width || canvas.height !== height || levelSongSplash.dpr !== dpr) {
      canvas.width = width;
      canvas.height = height;
      levelSongSplash.dpr = dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  function animateLevelSongSplash() {
    const { canvas, ctx } = levelSongSplash;
    if (!canvas || !ctx) return;
    syncLevelSongSplashSize();
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.globalCompositeOperation = "screen";

    levelSongSplash.particles = levelSongSplash.particles.filter((particle) => {
      particle.life -= 0.018;
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vx *= 0.985;
      particle.vy *= 0.985;
      particle.radius += particle.grow;
      if (particle.life <= 0) return false;

      const alpha = Math.max(0, particle.life);
      const gradient = ctx.createRadialGradient(
        particle.x,
        particle.y,
        0,
        particle.x,
        particle.y,
        particle.radius
      );
      gradient.addColorStop(0, `rgba(${particle.color}, ${0.34 * alpha})`);
      gradient.addColorStop(0.38, `rgba(${particle.color}, ${0.18 * alpha})`);
      gradient.addColorStop(0.72, `rgba(${particle.color}, ${0.07 * alpha})`);
      gradient.addColorStop(1, `rgba(${particle.color}, 0)`);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      ctx.fill();
      return true;
    });

    ctx.globalCompositeOperation = "source-over";
    if (levelSongSplash.particles.length) {
      levelSongSplash.frame = requestAnimationFrame(animateLevelSongSplash);
    } else {
      levelSongSplash.frame = 0;
    }
  }

  function paintLevelSongSplash(event, strength = 1) {
    if (levelSongSplash.reducedMotion.matches || !levelSongSplash.canvas) return;
    const rect = levelSongSplash.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;

    const colors = [
      "255, 111, 30",
      "255, 206, 84",
      "30, 210, 255",
      "64, 156, 255",
      "39, 214, 156",
      "244, 114, 182",
      "168, 85, 247"
    ];
    const count = event.pointerType === "touch" ? 8 : 5;
    for (let index = 0; index < count; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (0.55 + Math.random() * 1.4) * strength;
      levelSongSplash.particles.push({
        x: x + (Math.random() - 0.5) * 12,
        y: y + (Math.random() - 0.5) * 12,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 16 + Math.random() * 24,
        grow: 0.62 + Math.random() * 1,
        life: 0.82 + Math.random() * 0.32,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
    if (!levelSongSplash.frame) {
      levelSongSplash.frame = requestAnimationFrame(animateLevelSongSplash);
    }
  }

  function initLevelSongSplash(grid) {
    resetLevelSongSplash();
    if (!grid || levelSongSplash.reducedMotion.matches) return;
    const canvas = els.levelSongPicker?.querySelector(".level-song-splash");
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    levelSongSplash.canvas = canvas;
    levelSongSplash.ctx = ctx;
    syncLevelSongSplashSize();
  }

  function matchesQuery(song) {
    const query = normalize(state.query);
    if (!query) return true;
    const level = levelById[song.level];
    const haystack = [
      song.title,
      song.artist,
      song.style,
      song.source,
      song.category,
      level.label,
      song.teaching.goal,
      song.teaching.focus,
      ...(song.teaching.practiceOrder || []),
      ...(song.teaching.commonIssues || []),
      song.teaching.passStandard,
      ...song.techniques
    ]
      .map(normalize)
      .join(" ");
    return haystack.includes(query);
  }

  function getFilteredSongs() {
    return data.songs
      .filter((song) => state.level === "all" || song.level === state.level)
      .filter((song) => state.source === "all" || song.source === state.source)
      .filter((song) => state.category === "all" || song.category === state.category)
      .filter(matchesQuery)
      .sort((a, b) => {
        const levelDiff = levelById[a.level].order - levelById[b.level].order;
        if (levelDiff !== 0) return levelDiff;
        return a.title.localeCompare(b.title, "zh-CN");
      });
  }

  function initFilters() {
    if (!els.levelFilter || !els.sourceFilter || !els.categoryFilter) return;
    data.levels.forEach((level) => {
      const option = document.createElement("option");
      option.value = level.id;
      option.textContent = level.label;
      els.levelFilter.appendChild(option);
    });

    uniqueValues("source").forEach((source) => {
      const option = document.createElement("option");
      option.value = source;
      option.textContent = source;
      els.sourceFilter.appendChild(option);
    });

    uniqueValues("category").forEach((category) => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      els.categoryFilter.appendChild(option);
    });
  }

  function syncControls() {
    if (els.queryInput) els.queryInput.value = state.query;
    if (els.sourceFilter) els.sourceFilter.value = state.source;
    if (els.categoryFilter) els.categoryFilter.value = state.category;
    if (els.levelFilter) els.levelFilter.value = state.level;
  }

  function setLevel(levelId, shouldScroll) {
    state.level = levelId;
    state.detailTab = "lesson";
    if (levelId === "all") state.levelPickerOpen = false;
    render();
    if (shouldScroll) document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
  }

  function setQuery(query, shouldScroll) {
    state.query = query;
    state.detailTab = "lesson";
    render();
    if (shouldScroll) document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
  }

  function selectSong(songId, shouldScroll) {
    state.selectedSongId = songId;
    state.detailTab = "lesson";
    state.levelPickerOpen = false;
    render();
    if (shouldScroll) document.getElementById("lesson").scrollIntoView({ behavior: "smooth" });
  }

  function openLevelSongPicker(levelId) {
    if (!levelById[levelId]) return;
    state.level = levelId;
    state.activeLevelPicker = levelId;
    state.levelPickerOpen = true;
    state.detailTab = "lesson";
    render();
    els.levelSongPicker?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function closeLevelSongPicker() {
    state.levelPickerOpen = false;
    render();
  }

  function tagMarkup(tags, limit) {
    return tags
      .slice(0, limit)
      .map((tag) => `<span class="tag-chip">${tag}</span>`)
      .join("");
  }

  function techButtonMarkup(tags) {
    return tags.map((tag) => `<button type="button" class="tag-chip" data-tech="${tag}">${tag}</button>`).join("");
  }

  function renderHeroStats(filteredSongs) {
    const hitCount = data.songs.filter((song) => song.category === "Hit Tune").length;
    const originalCount = data.songs.filter((song) => song.category === "Original").length;
    els.heroStats.innerHTML = `
      <span><strong>${data.levels.length}</strong>grades</span>
      <span><strong>${data.songs.length}</strong>songs</span>
      <span><strong>${hitCount}</strong>Hit Tune</span>
      <span><strong>${originalCount}</strong>Original</span>
      <span><strong>${filteredSongs.length}</strong>matches</span>
    `;
  }

  function renderHeroNotebook() {
    if (!els.heroNotebook) return;
    const song = getSelectedSong();
    if (!song) return;
    const level = levelById[song.level];
    els.heroNotebook.innerHTML = `
      <div class="notebook-cover">
        <div class="cover-pattern"></div>
        <div class="cover-fretboard" aria-hidden="true">
          <span></span><span></span><span></span><span></span><span></span><span></span>
        </div>
        <div class="cover-pick" aria-hidden="true">pick</div>
        <div class="name-sticker">
          <span>Name</span>
          <strong>${song.title}</strong>
          <div class="sticker-grid">
            <p><span>Class</span><b>${levelShort(level)}</b></p>
            <p><span>Roll no.</span><b>${song.source.includes("2024") ? "2024" : "old"}</b></p>
          </div>
        </div>
        <div class="cover-chord-box" aria-hidden="true">
          <i></i><i></i><i></i><i></i><i></i><i></i>
          <b></b><b></b><b></b><b></b>
          <em style="--x:22%;--y:38%"></em>
          <em style="--x:50%;--y:58%"></em>
          <em style="--x:78%;--y:26%"></em>
        </div>
        <p class="cover-note">${song.artist || "Template Original"} · ${song.style}</p>
      </div>
    `;
  }

  function initTextPressure() {
    if (!els.heroPressure || pressure.initialized) return;
    const text = els.heroPressure.dataset.text || "GuitarBook";
    pressure.container = els.heroPressure.closest(".text-pressure-stage") || els.heroPressure;
    els.heroPressure.innerHTML = text
      .split("")
      .map((char) => `<span data-char="${char}">${char}</span>`)
      .join("");
    pressure.chars = [...els.heroPressure.querySelectorAll("span")];

    const setSize = () => {
      const rect = pressure.container.getBoundingClientRect();
      const fontSize = Math.max(rect.width / (pressure.chars.length / 2), 24);
      els.heroPressure.style.fontSize = `${fontSize}px`;
      els.heroPressure.style.lineHeight = "1";
      els.heroPressure.style.transform = "scale(1, 1)";
    };
    const centerPointer = () => {
      if (pressure.hasPointer) return;
      const rect = pressure.container.getBoundingClientRect();
      pressure.pointer.x = rect.left + rect.width / 2;
      pressure.pointer.y = rect.top + rect.height / 2;
      pressure.smooth.x = pressure.pointer.x;
      pressure.smooth.y = pressure.pointer.y;
    };
    const setPointer = (x, y) => {
      if (!pressure.hasPointer) {
        pressure.smooth.x = x;
        pressure.smooth.y = y;
        pressure.hasPointer = true;
      }
      pressure.pointer.x = x;
      pressure.pointer.y = y;
    };
    const debouncedSetSize = () => {
      window.clearTimeout(pressure.resizeTimer);
      pressure.resizeTimer = window.setTimeout(() => {
        setSize();
        centerPointer();
      }, 100);
    };

    setSize();
    centerPointer();
    window.addEventListener("resize", debouncedSetSize);
    window.addEventListener("scroll", centerPointer, { passive: true });
    window.addEventListener("mousemove", (event) => {
      setPointer(event.clientX, event.clientY);
    });
    window.addEventListener(
      "touchmove",
      (event) => {
        const touch = event.touches[0];
        if (!touch) return;
        setPointer(touch.clientX, touch.clientY);
      },
      { passive: true }
    );

    pressure.initialized = true;
    pressure.frame = requestAnimationFrame(updateTextPressure);
  }

  function pressureValue(distance, maxDistance, minValue, maxValue) {
    const value = maxValue - Math.abs((maxValue * distance) / maxDistance);
    return Math.max(minValue, value + minValue);
  }

  function updateTextPressure() {
    if (!pressure.initialized || !els.heroPressure) return;
    pressure.smooth.x += (pressure.pointer.x - pressure.smooth.x) / 15;
    pressure.smooth.y += (pressure.pointer.y - pressure.smooth.y) / 15;
    const titleRect = els.heroPressure.getBoundingClientRect();
    const maxDistance = Math.max(180, titleRect.width / 2);

    pressure.chars.forEach((span) => {
      const rect = span.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const distance = Math.hypot(pressure.smooth.x - centerX, pressure.smooth.y - centerY);
      const width = Math.floor(pressureValue(distance, maxDistance, 5, 200));
      const weight = Math.floor(pressureValue(distance, maxDistance, 100, 900));
      const italic = pressureValue(distance, maxDistance, 0, 1).toFixed(2);
      const settings = `'wght' ${weight}, 'wdth' ${width}, 'ital' ${italic}`;
      if (span.style.fontVariationSettings !== settings) {
        span.style.fontVariationSettings = settings;
      }
    });

    pressure.frame = requestAnimationFrame(updateTextPressure);
  }

  initTextPressure();

  function bindLanyard() {
    if (!els.heroLanyard || lanyard.initialized) return;
    const canvas = els.heroLanyard.querySelector(".lanyard-canvas");
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    lanyard.initialized = true;
    lanyard.canvas = canvas;
    lanyard.ctx = ctx;

    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    const point = (x, y, fixed) => ({ x, y, previousX: x, previousY: y, fixed: Boolean(fixed) });

    const connect = (a, b, length, stiffness) => {
      lanyard.constraints.push({ a, b, length, stiffness });
    };
    const distanceBetween = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);

    const resetScene = () => {
      const rect = els.heroLanyard.getBoundingClientRect();
      lanyard.dpr = Math.min(window.devicePixelRatio || 1, 2);
      lanyard.width = Math.max(1, els.heroLanyard.clientWidth || rect.width);
      lanyard.height = Math.max(1, els.heroLanyard.clientHeight || rect.height);
      canvas.width = Math.round(lanyard.width * lanyard.dpr);
      canvas.height = Math.round(lanyard.height * lanyard.dpr);
      ctx.setTransform(lanyard.dpr, 0, 0, lanyard.dpr, 0, 0);

      const isNarrow = lanyard.width < 680;
      const cardWidth = clamp(lanyard.width * 0.18, 112, 146);
      const cardHeight = cardWidth * 1.36;
      lanyard.card.width = cardWidth;
      lanyard.card.height = cardHeight;
      lanyard.card.angle = -0.08;
      lanyard.card.skew = 0;

      const anchorX = clamp(
        lanyard.width * (isNarrow ? 0.82 : 0.88),
        cardWidth * 0.78,
        lanyard.width - cardWidth * 0.62 - 10
      );
      const anchorY = -22;
      const topY = Math.min(lanyard.height * (isNarrow ? 0.34 : 0.32), 280);
      const drop = topY - anchorY;
      lanyard.points = [
        point(anchorX, anchorY, true),
        point(anchorX - Math.min(26, lanyard.width * 0.035), anchorY + drop * 0.28),
        point(anchorX - Math.min(12, lanyard.width * 0.018), anchorY + drop * 0.62),
        point(anchorX, topY),
        point(anchorX + Math.min(18, lanyard.width * 0.024), topY + cardHeight * 0.54)
      ];
      lanyard.constraints = [];
      connect(0, 1, distanceBetween(lanyard.points[0], lanyard.points[1]), 1);
      connect(1, 2, distanceBetween(lanyard.points[1], lanyard.points[2]), 0.95);
      connect(2, 3, distanceBetween(lanyard.points[2], lanyard.points[3]), 0.95);
      connect(3, 4, cardHeight * 0.53, 1);
    };

    const localPointer = (event) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) / rect.width) * lanyard.width,
        y: ((event.clientY - rect.top) / rect.height) * lanyard.height
      };
    };

    const cardContains = (x, y) => {
      const center = lanyard.points[4];
      if (!center) return false;
      const dx = x - center.x;
      const dy = y - center.y;
      const cos = Math.cos(-lanyard.card.angle);
      const sin = Math.sin(-lanyard.card.angle);
      const rx = dx * cos - dy * sin;
      const ry = dx * sin + dy * cos;
      return Math.abs(rx) <= lanyard.card.width * 0.62 && Math.abs(ry) <= lanyard.card.height * 0.58;
    };

    const roundedRect = (x, y, width, height, radius) => {
      const r = Math.min(radius, width / 2, height / 2);
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + width, y, x + width, y + height, r);
      ctx.arcTo(x + width, y + height, x, y + height, r);
      ctx.arcTo(x, y + height, x, y, r);
      ctx.arcTo(x, y, x + width, y, r);
      ctx.closePath();
    };

    const smoothPath = (points) => {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let index = 1; index < points.length - 1; index += 1) {
        const current = points[index];
        const next = points[index + 1];
        ctx.quadraticCurveTo(current.x, current.y, (current.x + next.x) / 2, (current.y + next.y) / 2);
      }
      const last = points[points.length - 1];
      ctx.lineTo(last.x, last.y);
    };

    const drawAnchor = () => {
      const anchor = lanyard.points[0];
      ctx.save();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "#171717";
      ctx.fillStyle = "#fdfbf9";
      roundedRect(anchor.x - 30, anchor.y - 9, 60, 20, 10);
      ctx.shadowColor = "rgba(0, 0, 0, 0.18)";
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 4;
      ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.stroke();
      ctx.strokeStyle = "#ff6f1e";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(anchor.x - 13, anchor.y + 1);
      ctx.lineTo(anchor.x + 13, anchor.y - 2);
      ctx.stroke();
      ctx.restore();
    };

    const drawBand = () => {
      const bandPoints = lanyard.points.slice(0, 4);
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      smoothPath(bandPoints);
      ctx.lineWidth = 18;
      ctx.strokeStyle = "rgba(0, 0, 0, 0.88)";
      ctx.shadowColor = "rgba(0, 0, 0, 0.2)";
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 8;
      ctx.stroke();

      smoothPath(bandPoints);
      ctx.lineWidth = 12;
      ctx.strokeStyle = "#f6f1ea";
      ctx.shadowColor = "transparent";
      ctx.stroke();

      smoothPath(bandPoints);
      ctx.lineWidth = 2;
      ctx.setLineDash([9, 13]);
      ctx.strokeStyle = "#ff6f1e";
      ctx.stroke();
      ctx.restore();
    };

    const drawGuitarLogo = () => {
      ctx.save();
      ctx.strokeStyle = "#d4b06a";
      ctx.fillStyle = "#d4b06a";
      ctx.lineWidth = 2.4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.beginPath();
      ctx.moveTo(12, -48);
      ctx.lineTo(33, -27);
      ctx.stroke();

      ctx.save();
      ctx.rotate(-0.78);
      ctx.beginPath();
      ctx.roundRect?.(-9, -52, 18, 28, 4);
      if (ctx.roundRect) {
        ctx.fill();
      } else {
        ctx.rect(-9, -52, 18, 28);
        ctx.fill();
      }
      ctx.restore();

      ctx.strokeStyle = "#f7efe9";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-8, -35);
      ctx.lineTo(26, -1);
      ctx.moveTo(-4, -39);
      ctx.lineTo(30, -5);
      ctx.moveTo(0, -43);
      ctx.lineTo(34, -9);
      ctx.stroke();

      ctx.fillStyle = "#0d0d0d";
      ctx.strokeStyle = "#f7efe9";
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.ellipse(-2, 10, 26, 34, -0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#f7efe9";
      ctx.beginPath();
      ctx.arc(1, 9, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#d4b06a";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-15, 39);
      ctx.quadraticCurveTo(-3, 31, 10, 38);
      ctx.moveTo(-24, 6);
      ctx.quadraticCurveTo(-42, -7, -24, -18);
      ctx.moveTo(20, 1);
      ctx.quadraticCurveTo(39, -14, 22, -28);
      ctx.stroke();
      ctx.restore();
    };

    const drawClip = () => {
      const top = lanyard.points[3];
      ctx.save();
      ctx.translate(top.x, top.y);
      ctx.rotate(lanyard.card.angle);
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = "rgba(23, 23, 23, 0.78)";
      const metal = ctx.createLinearGradient(-25, -26, 25, 8);
      metal.addColorStop(0, "#f6f1ea");
      metal.addColorStop(0.5, "#b9b1a5");
      metal.addColorStop(1, "#f7efe9");
      ctx.fillStyle = metal;
      roundedRect(-26, -25, 52, 27, 10);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 10, 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    };

    const drawCard = () => {
      const top = lanyard.points[3];
      const center = lanyard.points[4];
      const angle = Math.atan2(center.y - top.y, center.x - top.x) - Math.PI / 2;
      const sway = clamp((center.x - lanyard.points[0].x) / lanyard.width, -0.45, 0.45);
      const speedSkew = clamp((center.x - center.previousX) * 0.012, -0.08, 0.08);
      lanyard.card.angle += (angle - lanyard.card.angle) * 0.22;
      lanyard.card.skew += (sway * 0.18 + speedSkew - lanyard.card.skew) * 0.18;

      const { width, height, skew } = lanyard.card;
      ctx.save();
      ctx.translate(center.x, center.y);
      ctx.rotate(lanyard.card.angle);
      ctx.transform(1, 0, skew, 1, 0, 0);

      ctx.save();
      ctx.translate(0, 12);
      ctx.shadowColor = "rgba(0, 0, 0, 0.36)";
      ctx.shadowBlur = 22;
      ctx.shadowOffsetY = 16;
      roundedRect(-width / 2, -height / 2, width, height, 18);
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fill();
      ctx.restore();

      const cardGradient = ctx.createLinearGradient(-width / 2, -height / 2, width / 2, height / 2);
      cardGradient.addColorStop(0, "#2a1a0d");
      cardGradient.addColorStop(0.42, "#0f0d0a");
      cardGradient.addColorStop(1, "#050505");
      roundedRect(-width / 2, -height / 2, width, height, 18);
      ctx.fillStyle = cardGradient;
      ctx.fill();
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = "#171717";
      ctx.stroke();

      const shine = ctx.createLinearGradient(-width / 2, -height / 2, width / 2, 0);
      shine.addColorStop(0, "rgba(255, 255, 255, 0.16)");
      shine.addColorStop(0.38, "rgba(255, 255, 255, 0.03)");
      shine.addColorStop(1, "rgba(255, 255, 255, 0)");
      roundedRect(-width / 2 + 6, -height / 2 + 6, width - 12, height - 12, 14);
      ctx.fillStyle = shine;
      ctx.fill();

      ctx.textAlign = "center";
      ctx.fillStyle = "#ff6f1e";
      ctx.font = "800 11px Aptos, Segoe UI, sans-serif";
      ctx.letterSpacing = "1px";
      ctx.fillText("GUITAR", 0, -height / 2 + 34);

      ctx.translate(0, -6);
      drawGuitarLogo();
      ctx.translate(0, 6);

      const fitCardText = (text, maxWidth, maxSize, minSize, weight, family) => {
        let size = maxSize;
        do {
          ctx.font = `${weight} ${size}px ${family}`;
          size -= 1;
        } while (ctx.measureText(text).width > maxWidth && size > minSize);
      };

      ctx.fillStyle = "#ffffff";
      fitCardText("GuitarBook", width - 18, 29, 18, "700", "Georgia, serif");
      ctx.fillText("GuitarBook", 0, height / 2 - 44);
      ctx.fillStyle = "rgba(247, 239, 233, 0.72)";
      ctx.font = "800 10px Aptos, Segoe UI, sans-serif";
      ctx.fillText("LEVEL ATLAS", 0, height / 2 - 21);
      ctx.restore();
    };

    const solveConstraints = () => {
      for (let iteration = 0; iteration < 8; iteration += 1) {
        lanyard.constraints.forEach((constraint) => {
          const a = lanyard.points[constraint.a];
          const b = lanyard.points[constraint.b];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const distance = Math.hypot(dx, dy) || 1;
          const difference = ((distance - constraint.length) / distance) * constraint.stiffness;
          const offsetX = dx * difference;
          const offsetY = dy * difference;
          if (a.fixed) {
            b.x -= offsetX;
            b.y -= offsetY;
          } else if (b.fixed) {
            a.x += offsetX;
            a.y += offsetY;
          } else {
            a.x += offsetX * 0.5;
            a.y += offsetY * 0.5;
            b.x -= offsetX * 0.5;
            b.y -= offsetY * 0.5;
          }
        });
      }
    };

    const tick = (time) => {
      if (!lanyard.lastTime) lanyard.lastTime = time;
      const delta = clamp((time - lanyard.lastTime) / 16.67, 0.5, 2);
      lanyard.lastTime = time;

      const anchor = lanyard.points[0];
      if (anchor) {
        const isNarrow = lanyard.width < 680;
        anchor.x = clamp(
          lanyard.width * (isNarrow ? 0.82 : 0.88),
          lanyard.card.width * 0.78,
          lanyard.width - lanyard.card.width * 0.62 - 10
        );
        anchor.y = -22;
      }

      lanyard.points.forEach((item, index) => {
        if (item.fixed) return;
        const velocityX = (item.x - item.previousX) * 0.985;
        const velocityY = (item.y - item.previousY) * 0.985;
        item.previousX = item.x;
        item.previousY = item.y;
        item.x += velocityX;
        item.y += velocityY + (index === 4 ? 0.34 : 0.24) * delta * delta;
      });

      if (lanyard.dragging) {
        const card = lanyard.points[4];
        const dragVelocityX = lanyard.pointer.x - lanyard.pointer.previousX;
        const dragVelocityY = lanyard.pointer.y - lanyard.pointer.previousY;
        card.x = lanyard.pointer.x;
        card.y = lanyard.pointer.y;
        card.previousX = card.x - dragVelocityX * 0.85;
        card.previousY = card.y - dragVelocityY * 0.85;
      }

      solveConstraints();

      lanyard.points.forEach((item) => {
        if (item.fixed) return;
        const isCard = item === lanyard.points[4];
        const safeX = isCard ? lanyard.card.width * 0.72 : 12;
        const safeY = isCard ? lanyard.card.height * 0.56 : 10;
        item.x = clamp(item.x, safeX, lanyard.width - safeX);
        item.y = clamp(item.y, safeY, lanyard.height - safeY);
      });

      ctx.clearRect(0, 0, lanyard.width, lanyard.height);
      drawAnchor();
      drawBand();
      drawClip();
      drawCard();
      lanyard.frame = requestAnimationFrame(tick);
    };

    const startDrag = (event) => {
      const position = localPointer(event);
      if (!cardContains(position.x, position.y)) return;
      lanyard.dragging = true;
      lanyard.pointerId = event.pointerId;
      lanyard.pointer.x = position.x;
      lanyard.pointer.y = position.y;
      lanyard.pointer.previousX = position.x;
      lanyard.pointer.previousY = position.y;
      els.heroLanyard.classList.add("is-dragging");
      document.body.style.cursor = "grabbing";
      event.preventDefault();
      event.stopPropagation();
    };

    const movePointer = (event) => {
      const position = localPointer(event);
      if (lanyard.dragging && event.pointerId === lanyard.pointerId) {
        lanyard.pointer.previousX = lanyard.pointer.x;
        lanyard.pointer.previousY = lanyard.pointer.y;
        lanyard.pointer.x = position.x;
        lanyard.pointer.y = position.y;
        event.preventDefault();
        return;
      }
      const nextHover = cardContains(position.x, position.y);
      if (nextHover !== lanyard.hover) {
        lanyard.hover = nextHover;
        document.body.style.cursor = nextHover ? "grab" : "";
      }
    };

    const releaseDrag = (event) => {
      if (!lanyard.dragging || event.pointerId !== lanyard.pointerId) return;
      lanyard.dragging = false;
      lanyard.pointerId = null;
      els.heroLanyard.classList.remove("is-dragging");
      document.body.style.cursor = "";
    };

    document.addEventListener("pointerdown", startDrag, true);
    window.addEventListener("pointermove", movePointer);
    window.addEventListener("pointerup", releaseDrag);
    window.addEventListener("pointercancel", releaseDrag);
    window.addEventListener("resize", resetScene);

    resetScene();
    lanyard.frame = requestAnimationFrame(tick);
  }

  bindLanyard();

  function spherePoint(index, total) {
    if (total === 1) return { x: 0, y: 0, z: 1 };
    const y = 1 - (index / (total - 1)) * 2;
    const radius = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = index * Math.PI * (3 - Math.sqrt(5));
    return {
      x: Math.cos(theta) * radius,
      y,
      z: Math.sin(theta) * radius
    };
  }

  function renderLevelOrbit() {
    if (!els.orbitCanvas || orbit.initialized) {
      updateOrbitSelection();
      return;
    }

    els.orbitCanvas.innerHTML = data.levels
      .map((level) => {
        const shortName = levelShort(level);
        return `
          <button class="orbit-disc" type="button" data-level="${level.id}" aria-label="${level.label}">
            <span>${shortName}</span>
            <strong>${levelCount(level.id)}</strong>
            <em>${level.techniques[0] || "groove"}</em>
          </button>
        `;
      })
      .join("");

    orbit.discs = [...els.orbitCanvas.querySelectorAll(".orbit-disc")].map((element, index) => ({
      element,
      point: spherePoint(index, data.levels.length),
      level: data.levels[index]
    }));

    orbit.discs.forEach((disc) => {
      disc.element.addEventListener("click", () => {
        if (orbit.moved) return;
        setLevel(disc.level.id, true);
      });
    });

    bindInfiniteMenu();
    orbit.initialized = true;
    orbit.frame = requestAnimationFrame(updateOrbit);
  }

  function bindInfiniteMenu() {
    const root = els.infiniteMenu;
    if (!root) return;

    root.addEventListener("pointerdown", (event) => {
      orbit.pointerDown = true;
      orbit.moved = false;
      orbit.lastX = event.clientX;
      orbit.lastY = event.clientY;
      root.classList.add("is-moving");
      root.setPointerCapture(event.pointerId);
    });

    root.addEventListener("pointermove", (event) => {
      if (!orbit.pointerDown) return;
      const dx = event.clientX - orbit.lastX;
      const dy = event.clientY - orbit.lastY;
      if (Math.abs(dx) + Math.abs(dy) > 4) orbit.moved = true;
      orbit.rotationY += dx * 0.006;
      orbit.rotationX = Math.max(-0.9, Math.min(0.9, orbit.rotationX - dy * 0.004));
      orbit.velocityY = dx * 0.00075;
      orbit.velocityX = -dy * 0.00045;
      orbit.lastX = event.clientX;
      orbit.lastY = event.clientY;
    });

    const endDrag = (event) => {
      orbit.pointerDown = false;
      root.classList.remove("is-moving");
      if (event.pointerId !== undefined && root.hasPointerCapture(event.pointerId)) {
        root.releasePointerCapture(event.pointerId);
      }
      setTimeout(() => {
        orbit.moved = false;
      }, 0);
    };

    root.addEventListener("pointerup", endDrag);
    root.addEventListener("pointercancel", endDrag);
    root.addEventListener("pointerleave", () => {
      orbit.pointerDown = false;
      root.classList.remove("is-moving");
    });

    els.orbitAction.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
    });

    els.orbitAction.addEventListener("click", (event) => {
      event.stopPropagation();
      const level = data.levels[orbit.activeIndex];
      if (level) setLevel(level.id, true);
    });
  }

  function updateOrbitSelection() {
    if (!orbit.initialized) return;
    orbit.discs.forEach((disc) => {
      disc.element.classList.toggle("is-selected", state.level === disc.level.id);
    });
  }

  function setOrbitActive(index) {
    if (index === orbit.activeIndex && els.orbitTitle.textContent) return;
    orbit.activeIndex = index;
    const level = data.levels[index];
    if (!level) return;
    els.orbitTitle.textContent = level.label;
    els.orbitDescription.textContent = level.core;
    els.orbitAction.dataset.level = level.id;
  }

  function updateOrbit() {
    const width = els.orbitCanvas.clientWidth || 620;
    const height = els.orbitCanvas.clientHeight || 560;
    const orbitRadiusX = Math.min(250, width * 0.34);
    const orbitRadiusY = Math.min(200, height * 0.32);
    const depth = 190;
    const perspective = 560;
    let frontIndex = 0;
    let frontZ = -Infinity;

    if (!orbit.pointerDown) {
      orbit.rotationY += orbit.velocityY;
      orbit.rotationX += orbit.velocityX;
      orbit.velocityY = orbit.velocityY * 0.985 + 0.0024 * 0.015;
      orbit.velocityX *= 0.96;
    }

    const cosY = Math.cos(orbit.rotationY);
    const sinY = Math.sin(orbit.rotationY);
    const cosX = Math.cos(orbit.rotationX);
    const sinX = Math.sin(orbit.rotationX);

    orbit.discs.forEach((disc, index) => {
      const { x, y, z } = disc.point;
      const x1 = x * cosY + z * sinY;
      const z1 = -x * sinY + z * cosY;
      const y1 = y * cosX - z1 * sinX;
      const z2 = y * sinX + z1 * cosX;
      const scale = perspective / (perspective - z2 * depth);
      const screenX = x1 * orbitRadiusX * scale;
      const screenY = y1 * orbitRadiusY * scale;
      const alpha = 0.28 + Math.max(0, (z2 + 1) / 2) * 0.72;

      if (z2 > frontZ) {
        frontZ = z2;
        frontIndex = index;
      }

      disc.element.style.transform = `translate(-50%, -50%) translate3d(${screenX}px, ${screenY}px, 0) scale(${scale})`;
      disc.element.style.zIndex = String(Math.round((z2 + 2) * 100));
      disc.element.style.opacity = alpha.toFixed(3);
    });

    orbit.discs.forEach((disc, index) => {
      disc.element.classList.toggle("is-front", index === frontIndex);
    });
    setOrbitActive(frontIndex);
    updateOrbitSelection();
    orbit.frame = requestAnimationFrame(updateOrbit);
  }

  function renderLevelSongPicker() {
    if (!els.levelSongPicker) return;
    const level = levelById[state.activeLevelPicker];
    if (!state.levelPickerOpen || !level) {
      resetLevelSongSplash();
      els.levelSongPicker.hidden = true;
      els.levelSongPicker.innerHTML = "";
      return;
    }

    const songs = songsForLevel(level.id);
    els.levelSongPicker.hidden = false;
    els.levelSongPicker.innerHTML = `
      <section class="level-song-picker-panel" aria-label="${level.label} song picker">
        <div class="level-song-picker-head">
          <div>
            <p class="marker-caption">choose one song</p>
            <h3>${level.label} song drawer</h3>
            <p>${level.core}</p>
          </div>
          <button type="button" class="picker-close" data-close-picker aria-label="Close song picker">×</button>
        </div>
        <div class="level-song-picker-body">
          <canvas class="level-song-splash" aria-hidden="true"></canvas>
          <div class="level-song-picker-grid chroma-grid" style="--r: 300px;">
            ${songs
              .map((song, index) => `
                <button
                  type="button"
                  class="song-picker-card chroma-card"
                  data-song="${song.id}"
                  aria-label="Choose ${song.title}"
                >
                  <div class="chroma-img-wrapper song-picker-visual">
                    <span>${levelShort(level)}</span>
                    <strong>${String(index + 1).padStart(2, "0")}</strong>
                    <em>${song.category}</em>
                  </div>
                  <footer class="chroma-info song-picker-info">
                    <h3 class="name">${song.title}</h3>
                    <span class="handle">${song.source.includes("2024") ? "2024" : "old"}</span>
                    <p class="role">${song.artist || "Template Original"} · ${song.style}</p>
                    <span class="location">${song.techniques.slice(0, 2).join(" / ")}</span>
                  </footer>
                </button>
              `)
              .join("")}
          </div>
        </div>
      </section>
    `;
    bindLevelSongPicker();
  }

  function bindLevelSongPicker() {
    if (!els.levelSongPicker) return;
    const grid = els.levelSongPicker.querySelector(".level-song-picker-grid");
    const fade = grid?.querySelector(".chroma-fade");
    if (grid) {
      initLevelSongSplash(grid);
      grid.style.setProperty("--x", "50%");
      grid.style.setProperty("--y", "50%");
      grid.onpointermove = (event) => {
        const rect = grid.getBoundingClientRect();
        grid.style.setProperty("--x", `${event.clientX - rect.left}px`);
        grid.style.setProperty("--y", `${event.clientY - rect.top}px`);
        if (fade) fade.style.opacity = "0";
        paintLevelSongSplash(event, 0.84);

        const card = event.target.closest(".chroma-card");
        if (card) {
          const cardRect = card.getBoundingClientRect();
          card.style.setProperty("--mouse-x", `${event.clientX - cardRect.left}px`);
          card.style.setProperty("--mouse-y", `${event.clientY - cardRect.top}px`);
        }
      };
      grid.onpointerdown = (event) => paintLevelSongSplash(event, 1.45);
      grid.onpointerleave = () => {
        if (fade) fade.style.opacity = "1";
      };
    }

    els.levelSongPicker.querySelector("[data-close-picker]")?.addEventListener("click", closeLevelSongPicker);
    els.levelSongPicker.querySelectorAll("[data-song]").forEach((button) => {
      button.addEventListener("click", () => selectSong(button.dataset.song, true));
    });
  }

  function renderLevelBoard() {
    if (!els.levelBoard) return;
    els.levelBoard.innerHTML = `<div class="circular-gallery-track">` + data.levels
      .map((level) => {
        const active = state.level === level.id ? " is-active" : "";
        const expanded = state.levelPickerOpen && state.activeLevelPicker === level.id ? "true" : "false";
        const media = level.cover
          ? `
            <div class="circular-media has-cover">
              <img
                class="circular-cover"
                src="${escapeAttribute(level.cover)}"
                alt="${escapeAttribute(`${level.label} RSL Acoustic cover`)}"
                loading="eager"
                decoding="async"
              />
            </div>
          `
          : `
            <div class="circular-media">
              <span>${levelShort(level)}</span>
              <strong>${levelCount(level.id)}</strong>
              <em>songs</em>
            </div>
          `;
        return `
          <button
            type="button"
            class="level-label circular-card chroma-card${active}"
            data-level="${level.id}"
            aria-controls="levelSongPicker"
            aria-expanded="${expanded}"
            style="${chromaStyle(level)}"
          >
            ${media}
            <footer class="circular-caption chroma-info">
              <h3 class="name">${level.label}</h3>
              <span class="handle">${level.techniques[0] || "groove"}</span>
              <p class="role">${level.core}</p>
              <span class="location">${level.techniques.slice(0, 2).join(" / ")}</span>
            </footer>
          </button>
        `;
      })
      .join("") + `</div><div class="chroma-overlay"></div><div class="chroma-fade"></div>`;

    levelGallery.cards = [...els.levelBoard.querySelectorAll("[data-level]")];
    const selectedIndex = data.levels.findIndex((level) => level.id === state.level);
    if (!levelGallery.initialized) {
      levelGallery.current = selectedIndex >= 0 ? selectedIndex : 0;
      levelGallery.target = levelGallery.current;
      levelGallery.initialized = true;
    } else if (selectedIndex >= 0) {
      levelGallery.target = selectedIndex;
    }

    levelGallery.cards.forEach((button, index) => {
      button.dataset.galleryIndex = String(index);
    });
    bindChromaGrid();
    updateLevelGalleryLayout();
  }

  function clampGalleryTarget(value) {
    return Math.max(0, Math.min(data.levels.length - 1, value));
  }

  function startLevelGalleryAnimation() {
    if (!levelGallery.frame) {
      levelGallery.frame = requestAnimationFrame(animateLevelGallery);
    }
  }

  function updateLevelGalleryLayout() {
    const root = els.levelBoard;
    if (!root || !levelGallery.cards.length) return;
    levelGallery.cardStep = Math.min(370, Math.max(245, root.clientWidth * 0.34));

    levelGallery.cards.forEach((card, index) => {
      const offset = index - levelGallery.current;
      const abs = Math.abs(offset);
      const bend = Math.pow(Math.min(abs, 3.4), 1.55) * 18;
      const translateX = offset * levelGallery.cardStep;
      const rotate = offset * -5.5;
      const scale = Math.max(0.72, 1 - abs * 0.075);
      const alpha = abs > 4.1 ? 0 : Math.max(0.3, 1 - abs * 0.15);
      const zIndex = Math.max(1, 100 - Math.round(abs * 10));
      card.style.setProperty("--tx", `${translateX}px`);
      card.style.setProperty("--ty", `${bend}px`);
      card.style.setProperty("--rz", `${rotate}deg`);
      card.style.setProperty("--scale", scale.toFixed(3));
      card.style.setProperty("--alpha", alpha.toFixed(3));
      card.style.zIndex = String(zIndex);
      card.tabIndex = abs < 2.6 ? 0 : -1;
    });
  }

  function animateLevelGallery() {
    levelGallery.current += (levelGallery.target - levelGallery.current) * 0.08;
    if (Math.abs(levelGallery.target - levelGallery.current) < 0.002) {
      levelGallery.current = levelGallery.target;
      updateLevelGalleryLayout();
      levelGallery.frame = 0;
      return;
    }
    updateLevelGalleryLayout();
    levelGallery.frame = requestAnimationFrame(animateLevelGallery);
  }

  function bindChromaGrid() {
    const root = els.levelBoard;
    const fade = root.querySelector(".chroma-fade");
    root.style.setProperty("--x", "50%");
    root.style.setProperty("--y", "50%");
    root.onpointerdown = (event) => {
      const dragCard = event.target.closest("#levelBoard [data-level]");
      if (!dragCard) return;
      levelGallery.pointerDown = true;
      levelGallery.moved = false;
      levelGallery.startX = event.clientX;
      levelGallery.startTarget = levelGallery.target;
      root.classList.add("is-dragging");
      root.setPointerCapture?.(event.pointerId);
    };
    root.onpointermove = (event) => {
      const rect = root.getBoundingClientRect();
      root.style.setProperty("--x", `${event.clientX - rect.left}px`);
      root.style.setProperty("--y", `${event.clientY - rect.top}px`);
      if (fade) fade.style.opacity = "0";

      const card = event.target.closest(".chroma-card");
      if (card) {
        const rect = card.getBoundingClientRect();
        card.style.setProperty("--mouse-x", `${event.clientX - rect.left}px`);
        card.style.setProperty("--mouse-y", `${event.clientY - rect.top}px`);
      }

      if (levelGallery.pointerDown) {
        const delta = (levelGallery.startX - event.clientX) / levelGallery.cardStep;
        if (Math.abs(event.clientX - levelGallery.startX) > 6) levelGallery.moved = true;
        levelGallery.target = clampGalleryTarget(levelGallery.startTarget + delta);
        startLevelGalleryAnimation();
      }
    };
    root.onpointerup = (event) => {
      if (!levelGallery.pointerDown) return;
      levelGallery.pointerDown = false;
      levelGallery.target = Math.round(clampGalleryTarget(levelGallery.target));
      root.classList.remove("is-dragging");
      if (event.pointerId !== undefined && root.hasPointerCapture?.(event.pointerId)) {
        root.releasePointerCapture(event.pointerId);
      }
      startLevelGalleryAnimation();
      setTimeout(() => {
        levelGallery.moved = false;
      }, 0);
    };
    root.onpointercancel = root.onpointerup;
    root.onclick = (event) => {
      const pointed = document.elementFromPoint(event.clientX, event.clientY);
      const button = pointed?.closest("#levelBoard [data-level]") || event.target.closest("[data-level]");
      if (!button || levelGallery.moved) return;
      const index = Number(button.dataset.galleryIndex || 0);
      levelGallery.target = index;
      startLevelGalleryAnimation();
      openLevelSongPicker(button.dataset.level);
    };
    root.onpointerleave = () => {
      levelGallery.pointerDown = false;
      root.classList.remove("is-dragging");
      if (fade) fade.style.opacity = "1";
    };
    root.onkeydown = (event) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        levelGallery.target = clampGalleryTarget(Math.round(levelGallery.target) + 1);
        startLevelGalleryAnimation();
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        levelGallery.target = clampGalleryTarget(Math.round(levelGallery.target) - 1);
        startLevelGalleryAnimation();
      }
      if (event.key === "Home") {
        event.preventDefault();
        levelGallery.target = 0;
        startLevelGalleryAnimation();
      }
      if (event.key === "End") {
        event.preventDefault();
        levelGallery.target = data.levels.length - 1;
        startLevelGalleryAnimation();
      }
    };
  }

  function renderTechCloud(filteredSongs) {
    if (!els.techCloud) return;
    const counts = new Map();
    filteredSongs.forEach((song) => {
      song.techniques.forEach((tech) => counts.set(tech, (counts.get(tech) || 0) + 1));
    });

    const tags = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14);
    els.techCloud.innerHTML = `
      <span>sticky tags</span>
      ${tags
        .map(
          ([tech, count]) => `
            <button type="button" data-tech="${tech}" class="${normalize(state.query) === normalize(tech) ? "is-active" : ""}">
              ${tech}<em>${count}</em>
            </button>
          `
        )
        .join("")}
    `;

    els.techCloud.querySelectorAll("[data-tech]").forEach((button) => {
      button.addEventListener("click", () => setQuery(button.dataset.tech, false));
    });
  }

  function renderSongList(filteredSongs) {
    if (!els.songList || !els.resultCount || !els.activeSummary) return;
    els.resultCount.textContent = `${filteredSongs.length} labels`;
    const summary = [];
    if (state.query.trim()) summary.push(`search: ${state.query.trim()}`);
    if (state.level !== "all") summary.push(levelById[state.level].label);
    if (state.source !== "all") summary.push(state.source);
    if (state.category !== "all") summary.push(state.category);
    els.activeSummary.textContent = summary.length ? summary.join(" · ") : "all songs";

    if (!filteredSongs.length) {
      els.songList.innerHTML = `<div class="empty-note">No matches. Try another keyword, stage, or source.</div>`;
      return;
    }

    els.songList.innerHTML = filteredSongs
      .map((song, index) => {
        const level = levelById[song.level];
        const active = song.id === state.selectedSongId ? " is-active" : "";
        return `
          <button type="button" class="song-label${active}" data-song="${song.id}">
            <span class="roll-number">${String(index + 1).padStart(2, "0")}</span>
            <span class="label-field">Name</span>
            <strong>${song.title}</strong>
            <small>${song.artist || "Template Original"} · ${song.style}</small>
            <div class="sticker-grid">
              <p><span>Class</span><b>${levelShort(level)}</b></p>
              <p><span>Source</span><b>${song.source}</b></p>
            </div>
            <div class="song-tags">${tagMarkup([song.category, ...song.techniques], 4)}</div>
          </button>
        `;
      })
      .join("");

    els.songList.querySelectorAll("[data-song]").forEach((button) => {
      button.addEventListener("click", () => selectSong(button.dataset.song, true));
    });
  }

  function audioVersionSlots(song) {
    const audioItems = Array.isArray(song.audio) ? song.audio : [];
    const count = audioItems.length || AUDIO_VERSION_COUNT;
    return Array.from({ length: count }, (_, index) => {
      const item = audioItems[index] || {};
      return {
        index,
        number: String(index + 1).padStart(2, "0"),
        title: item.title || item.label || item.name || `Version ${index + 1}`,
        src: item.src || ""
      };
    });
  }

  function activeAudioVersionIndex(song, slots) {
    const value = Number(state.audioVersionBySong[song.id] || 0);
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(slots.length - 1, value));
  }

  function formatAudioDuration(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0) return "--:--";
    const totalSeconds = Math.round(seconds);
    const minutes = Math.floor(totalSeconds / 60);
    const rest = String(totalSeconds % 60).padStart(2, "0");
    return `${minutes}:${rest}`;
  }

  function bindAudioProgress() {
    // The external speed-player component owns playback, progress, duration, and rate changes.
  }

  function renderAudio(song) {
    const slots = audioVersionSlots(song);
    const activeIndex = activeAudioVersionIndex(song, slots);
    const activeSlot = slots[activeIndex];
    const playerLabel = `${song.title} - ${activeSlot.title}`;

    return `
      <div class="audio-workbench">
        <div class="audio-player-frame">
          <div class="audio-version-head">
            <div>
              <span>audio placeholder</span>
              <strong>${escapeHtml(activeSlot.title)}</strong>
              <em>${escapeHtml(playerLabel)}</em>
            </div>
            <label class="audio-version-select-label">
              <span>version</span>
              <select data-audio-version-select aria-label="${escapeAttribute(song.title)} audio version">
                ${slots
                  .map(
                    (slot) => `
                      <option value="${slot.index}"${slot.index === activeIndex ? " selected" : ""}>
                        ${escapeHtml(slot.title)}
                      </option>
                    `
                  )
                  .join("")}
              </select>
            </label>
          </div>
          <div class="audio-speed-player-shell">
            <audio-speed-player
              src="${escapeAttribute(activeSlot.src)}"
              label="${escapeAttribute(playerLabel)}"
              rate="1"
              min-rate="0.5"
              max-rate="1.5"
              step="0.05"
              engine="rubberband"
              no-upload
              version-selector
            ></audio-speed-player>
          </div>
        </div>
      </div>
    `;
  }

  function renderScores(song) {
    if (!song.scoreImages.length) {
      return `
        <div class="resource-note">
          <span>tab / score area</span>
          <strong>TAB sheets and chord diagrams pending</strong>
          <small>Add licensed Intro, Verse, Chorus, Solo, or Outro score images later.</small>
        </div>
      `;
    }
    return song.scoreImages
      .map(
        (item) => `
          <figure class="score-card score-sheet">
            <div class="score-image-frame">
              <img src="${item.src}" alt="${item.title || song.title}" loading="eager" decoding="async" />
            </div>
          </figure>
        `
      )
      .join("");
  }

  function renderLesson(song, level) {
    return `
      <div class="practice-steps">
        ${song.teaching.practiceOrder
          .map(
            (step, index) => `
              <div>
                <span>${String(index + 1).padStart(2, "0")}</span>
                <strong>${step}</strong>
              </div>
            `
          )
          .join("")}
      </div>
      <dl class="lesson-list">
        <dt>Goal</dt><dd>${song.teaching.goal}</dd>
        <dt>Focus</dt><dd>${song.teaching.focus}</dd>
        <dt>Common issues</dt><dd>${song.teaching.commonIssues.join("; ")}</dd>
        <dt>Pass standard</dt><dd>${song.teaching.passStandard}</dd>
        <dt>Stage evidence</dt><dd>${level.label} · ${level.core}</dd>
      </dl>
    `;
  }

  function renderEvidence(song, level) {
    return `
      <div class="evidence-tags">
        <div><span>grade</span><strong>${level.label}</strong><small>${level.core}</small></div>
        <div><span>source</span><strong>${song.source}</strong><small>${song.category}</small></div>
        <div><span>style</span><strong>${song.style}</strong><small>${song.artist || "Template Original"}</small></div>
      </div>
      <p>${level.boundary}</p>
      <div class="song-tags">${techButtonMarkup(song.techniques)}</div>
    `;
  }

  function renderContentPane(song, level) {
    if (state.detailTab === "score") return `<div class="score-grid">${renderScores(song)}</div>`;
    if (state.detailTab === "evidence") return renderEvidence(song, level);
    return renderLesson(song, level);
  }

  function bindDetailTechButtons(root) {
    root.querySelectorAll("[data-tech]").forEach((button) => {
      button.addEventListener("click", () => setQuery(button.dataset.tech, true));
    });
  }

  function updateSongDetailTab(song, level) {
    const audioPane = els.songDetail.querySelector("[data-audio-pane]");
    const contentPane = els.songDetail.querySelector("[data-content-pane]");

    els.songDetail.querySelectorAll("[data-tab]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.tab === state.detailTab);
    });

    if (audioPane) audioPane.hidden = state.detailTab !== "audio";
    if (contentPane) {
      contentPane.hidden = state.detailTab === "audio";
      if (state.detailTab !== "audio") {
        contentPane.innerHTML = renderContentPane(song, level);
        bindDetailTechButtons(contentPane);
      }
    }
  }

  function renderSongDetail() {
    if (!els.songDetail) return;
    const song = getSelectedSong();
    if (!song) {
      els.songDetail.innerHTML = `<div class="empty-note">Choose a song.</div>`;
      return;
    }
    const level = levelById[song.level];
    els.songDetail.innerHTML = `
      <div class="lesson-cover">
        <span class="label-field">Name</span>
        <h3>${song.title}</h3>
        <p>${song.artist || "Template Original"} · ${song.style}</p>
        <div class="sticker-grid lesson-fields">
          <p><span>Class</span><b>${level.label}</b></p>
          <p><span>Source</span><b>${song.source}</b></p>
          <p><span>Type</span><b>${song.category}</b></p>
        </div>
        <div class="song-tags">${techButtonMarkup(song.techniques)}</div>
      </div>
      <div class="lesson-tabs" role="tablist" aria-label="Song details">
        <button type="button" class="${state.detailTab === "lesson" ? "is-active" : ""}" data-tab="lesson">Lesson</button>
        <button type="button" class="${state.detailTab === "audio" ? "is-active" : ""}" data-tab="audio">Audio</button>
        <button type="button" class="${state.detailTab === "score" ? "is-active" : ""}" data-tab="score">Score</button>
        <button type="button" class="${state.detailTab === "evidence" ? "is-active" : ""}" data-tab="evidence">Evidence</button>
      </div>
      <div class="lesson-pane lesson-audio-pane" data-audio-pane ${state.detailTab === "audio" ? "" : "hidden"}>${renderAudio(song)}</div>
      <div class="lesson-pane" data-content-pane ${state.detailTab === "audio" ? "hidden" : ""}>${state.detailTab === "audio" ? "" : renderContentPane(song, level)}</div>
    `;

    els.songDetail.querySelectorAll("[data-tab]").forEach((button) => {
      button.addEventListener("click", () => {
        state.detailTab = button.dataset.tab;
        updateSongDetailTab(song, level);
      });
    });

    els.songDetail.querySelectorAll("[data-audio-version]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        state.audioVersionBySong[song.id] = Number(button.dataset.audioVersion || 0);
        state.detailTab = "audio";
        renderSongDetail();
      });
    });
    els.songDetail.querySelector("[data-audio-version-select]")?.addEventListener("change", (event) => {
      state.audioVersionBySong[song.id] = Number(event.target.value || 0);
      state.detailTab = "audio";
      renderSongDetail();
    });

    bindDetailTechButtons(els.songDetail);
    bindAudioProgress(els.songDetail);
  }

  function render() {
    const filteredSongs = getFilteredSongs();
    if (!filteredSongs.some((song) => song.id === state.selectedSongId)) {
      state.selectedSongId = filteredSongs[0] ? filteredSongs[0].id : "";
      state.detailTab = "lesson";
    }
    syncControls();
    renderHeroStats(filteredSongs);
    renderHeroNotebook();
    renderLevelOrbit();
    renderLevelBoard();
    renderLevelSongPicker();
    renderTechCloud(filteredSongs);
    renderSongList(filteredSongs);
    renderSongDetail();
  }

  function bindEvents() {
    els.queryInput?.addEventListener("input", (event) => {
      state.query = event.target.value;
      state.detailTab = "lesson";
      render();
    });

    els.sourceFilter?.addEventListener("change", (event) => {
      state.source = event.target.value;
      state.detailTab = "lesson";
      render();
    });

    els.categoryFilter?.addEventListener("change", (event) => {
      state.category = event.target.value;
      state.detailTab = "lesson";
      render();
    });

    els.levelFilter?.addEventListener("change", (event) => setLevel(event.target.value, false));

  }

  function initDecryptedText() {
    const targets = document.querySelectorAll("[data-decrypt-text]");
    if (!targets.length) return;

    const scrambleChars = "GUITARCHORDFINGERSTYLECLASSMAINTAIN0123456789";
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

    const decrypt = (element) => {
      const text = element.dataset.decryptText || element.textContent || "";
      if (!text) return;

      window.clearInterval(element._decryptTimer);

      if (reduceMotion) {
        element.textContent = text;
        element.classList.remove("is-encrypted");
        return;
      }

      const order = [];
      const middle = Math.floor(text.length / 2);
      for (let offset = 0; order.length < text.length; offset += 1) {
        const right = middle + offset;
        const left = middle - offset - 1;
        if (right < text.length) order.push(right);
        if (left >= 0) order.push(left);
      }

      let revealed = new Set();
      let tick = 0;
      element.classList.add("is-encrypted");

      const renderScramble = () => {
        element.textContent = Array.from(text)
          .map((char, index) => {
            if (char.trim() === "" || /[，。,.]/.test(char) || revealed.has(index)) return char;
            return scrambleChars[Math.floor(Math.random() * scrambleChars.length)];
          })
          .join("");
      };

      renderScramble();
      element._decryptTimer = window.setInterval(() => {
        const nextItems = order.slice(tick, tick + 2);
        if (nextItems.length) {
          revealed = new Set(revealed);
          nextItems.forEach((next) => revealed.add(next));
          renderScramble();
          tick += 2;
          return;
        }

        window.clearInterval(element._decryptTimer);
        element.textContent = text;
        element.classList.remove("is-encrypted");
      }, 36);
    };

    const reveal = (element) => {
      if (element.dataset.decryptedOnce === "true") return;
      element.dataset.decryptedOnce = "true";
      decrypt(element);
    };

    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            reveal(entry.target);
            observer.unobserve(entry.target);
          });
        },
        { threshold: 0.45 }
      );
      targets.forEach((element) => observer.observe(element));
    } else {
      targets.forEach(reveal);
    }

    targets.forEach((element) => {
      element.addEventListener("mouseenter", () => decrypt(element));
    });
  }

  function initSupportFolder() {
    const toggle = document.querySelector(".support-toggle");
    const popover = document.getElementById("supportFolder");
    const folder = popover?.querySelector(".support-folder");
    if (!toggle || !popover || !folder) return;

    const setOpen = (open) => {
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      popover.setAttribute("aria-hidden", open ? "false" : "true");
      popover.classList.toggle("is-open", open);
      folder.classList.toggle("open", open);
      if (open) {
        window.setTimeout(() => {
          (popover.querySelector(".support-qr-grid") || popover).scrollIntoView({ behavior: "smooth", block: "start" });
        }, 420);
      }
    };

    const toggleOpen = () => {
      setOpen(!popover.classList.contains("is-open"));
    };

    toggle.addEventListener("click", toggleOpen);
    folder.addEventListener("click", (event) => {
      if (event.target.closest(".paper")) return;
      toggleOpen();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setOpen(false);
    });
  }

  initFilters();
  bindEvents();
  render();
  initDecryptedText();
  initSupportFolder();
})();
