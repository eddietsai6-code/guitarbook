(function () {
  const levels = [
    {
      id: "debut",
      label: "Debut",
      order: 0,
      core: "First-position basics, open chords, and simple acoustic melody",
      boundary: "Play common first-position chord changes and a short melody with steady pulse.",
      techniques: ["first position", "open chords", "steady pulse", "simple melody"],
      cover: "./assets/covers/rsl-acoustic-debut.webp",
      color: "#f97316"
    },
    {
      id: "g1",
      label: "Grade 1",
      order: 1,
      core: "Open-position accompaniment, basic rhythm control, and song sections",
      boundary: "Keep a steady verse/chorus accompaniment and explain the basic harmonic movement.",
      techniques: ["strumming", "arpeggio", "C key", "G key", "harmony"],
      cover: "./assets/covers/rsl-acoustic-g1.webp",
      color: "#3b82f6"
    },
    {
      id: "g2",
      label: "Grade 2",
      order: 2,
      core: "Early fingerstyle pieces, melody-bass balance, and clean ornaments",
      boundary: "Break down a fingerstyle piece into melody, bass, and common ornament patterns.",
      techniques: ["fingerstyle", "melody bass", "slide", "hammer-on"],
      cover: "./assets/covers/rsl-acoustic-g2.webp",
      color: "#10b981"
    },
    {
      id: "g3",
      label: "Grade 3",
      order: 3,
      core: "Full-neck accompaniment colors and denser acoustic rhythm work",
      boundary: "Move one progression across neck positions and keep denser rhythm patterns controlled.",
      techniques: ["full-neck chords", "inversions", "syncopation", "rhythm control"],
      cover: "./assets/covers/rsl-acoustic-g3.webp",
      color: "#ec4899"
    },
    {
      id: "g4",
      label: "Grade 4",
      order: 4,
      core: "Style-aware performance, arrangement choices, and applied theory",
      boundary: "Choose texture, harmony, tone, and arrangement strategy according to the song style.",
      techniques: ["arranging", "style comping", "applied theory", "dynamics"],
      cover: "./assets/covers/rsl-acoustic-g4.webp",
      color: "#8b5cf6"
    },
    {
      id: "g5",
      label: "Grade 5",
      order: 5,
      core: "Extended style vocabulary and integrated acoustic expression",
      boundary: "Blend style-specific technique, rhythmic vocabulary, and harmonic color into performance.",
      techniques: ["flamenco", "tremolo", "rasgueado", "style vocabulary"],
      cover: "./assets/covers/rsl-acoustic-g5.webp",
      color: "#0f766e"
    },
    {
      id: "g6",
      label: "Grade 6",
      order: 6,
      core: "Advanced acoustic texture, expressive phrasing, and confident repertoire control",
      boundary: "Shape longer performances with reliable tone, dynamics, and stylistic decision-making.",
      techniques: ["phrasing", "tone control", "advanced repertoire", "dynamics"],
      cover: "./assets/covers/rsl-acoustic-g6.webp",
      color: "#06b6d4"
    },
    {
      id: "g7",
      label: "Grade 7",
      order: 7,
      core: "Professional-level acoustic fluency, broader harmony, and detailed interpretation",
      boundary: "Sustain musical intention across complex pieces with mature timing and color choices.",
      techniques: ["interpretation", "advanced harmony", "time feel", "performance craft"],
      cover: "./assets/covers/rsl-acoustic-g7.webp",
      color: "#dc2626"
    },
    {
      id: "g8",
      label: "Grade 8",
      order: 8,
      core: "Capstone acoustic performance, refined arrangement thinking, and full musical ownership",
      boundary: "Deliver a complete performance with technical command, tone control, and stylistic authority.",
      techniques: ["capstone", "arranging", "musical ownership", "tone"],
      cover: "./assets/covers/rsl-acoustic-g8.webp",
      color: "#84cc16"
    }
  ];

  const songs = [
    makeSong({
      id: "three-fret-warmup",
      title: "First-Position Warmup",
      artist: "GuitarBook Placeholder",
      level: "debut",
      source: "Guitar Starter Pack",
      category: "Technique",
      style: "Foundation",
      techniques: ["first position", "open chords", "steady pulse"],
      goal: "Build reliable first-position finger placement and steady right-hand attack.",
      focus: "Clean tone first, then add pulse and simple transitions.",
      practiceOrder: ["Open-string pulse", "Single-note fretting", "Hold C major", "Change C to Am"],
      commonIssues: ["Fretting too far from the fret", "Right hand speeds up or slows down", "Stopping before chord changes"],
      passStandard: "Play 16 bars at 60 BPM with clear tone and continuous time."
    }),
    makeSong({
      id: "c-g-harmony-map",
      title: "C and G Harmony Map",
      artist: "GuitarBook Placeholder",
      level: "g1",
      source: "Harmony Pack",
      category: "Classroom Song",
      style: "Folk Pop",
      techniques: ["C key", "G key", "harmony", "strumming"],
      goal: "Understand common C and G key chords and use them in simple accompaniment.",
      focus: "Hear tonic, dominant, and subdominant functions instead of memorizing shapes only.",
      practiceOrder: ["C-F-G-C", "G-C-D-G", "Add Am and Em", "Apply to one song form"],
      commonIssues: ["Shape memory without hearing function", "Slow G to C changes", "Strumming direction drifting from the beat"],
      passStandard: "Explain and play two common harmonic progressions."
    }),
    makeSong({
      id: "simple-melody-study",
      title: "Simple Melody Study",
      artist: "GuitarBook Placeholder",
      level: "debut",
      source: "Melody Pack",
      category: "Original",
      style: "Ballad",
      techniques: ["simple solo", "melody", "phrasing", "sustain"],
      goal: "Play a short first-position melody with a natural sense of breath.",
      focus: "Phrase shape, note value, and left-hand release control.",
      practiceOrder: ["Sing the melody", "Practice phrase by phrase", "Add sustain", "Play the full melody"],
      commonIssues: ["Every note has the same weight", "Notes cut off too early", "Watching the hand instead of hearing the line"],
      passStandard: "The melody is clear and phrase endings feel intentional."
    }),
    makeSong({
      id: "fingerstyle-arrangement",
      title: "Fingerstyle Arrangement Placeholder",
      artist: "GuitarBook Placeholder",
      level: "g2",
      source: "Fingerstyle Pack",
      category: "Arrangement",
      style: "Fingerstyle",
      techniques: ["fingerstyle", "melody bass", "hammer-on"],
      goal: "Complete a fingerstyle solo that combines melody, bass, and harmony.",
      focus: "Keep melody forward, bass steady, and ornaments in time.",
      practiceOrder: ["Separate melody", "Separate bass", "Combine two layers", "Add ornaments"],
      commonIssues: ["Bass covers the melody", "Hammer-ons drift out of time", "Long pauses between sections"],
      passStandard: "Play the full piece slowly with audible layers."
    }),
    makeSong({
      id: "full-neck-comping",
      title: "Full-Neck Comping Study",
      artist: "GuitarBook Placeholder",
      level: "g3",
      source: "Comping Pack",
      category: "Technique",
      style: "Acoustic Pop",
      techniques: ["full-neck chords", "inversions", "syncopation", "32nd rhythm"],
      goal: "Move one progression into different positions for richer accompaniment color.",
      focus: "Chord inversions, bass connection, and stable high-density right-hand rhythm.",
      practiceOrder: ["Low-position chords", "Middle/high-position inversions", "Add bass connection", "Add 32nd-note rhythm"],
      commonIssues: ["Only using open chords", "Unclear note names up the neck", "32nd rhythm becomes forceful strumming"],
      passStandard: "Play one accompaniment in two positions while keeping rhythmic density clear."
    }),
    makeSong({
      id: "flamenco-style-study",
      title: "Flamenco Style Study",
      artist: "GuitarBook Placeholder",
      level: "g5",
      source: "Style Pack",
      category: "Style Study",
      style: "Flamenco",
      techniques: ["flamenco", "rasgueado", "tremolo", "dynamics"],
      goal: "Understand right-hand vocabulary, accents, and harmonic color in a flamenco-flavored study.",
      focus: "Style comes from the combination of accent, tone, technique, and harmony.",
      practiceOrder: ["Accent pattern", "Slow rasgueado", "Add harmonic color", "Apply to a short phrase"],
      commonIssues: ["Chasing speed first", "Unclear accents", "Overlarge right-hand motion"],
      passStandard: "Play a short phrase with clear style accents."
    })
  ];

  function makeSong(song) {
    return {
      ...song,
      audio: [],
      scoreImages: [],
      teaching: {
        goal: song.goal,
        focus: song.focus,
        practiceOrder: song.practiceOrder,
        commonIssues: song.commonIssues,
        passStandard: song.passStandard
      }
    };
  }

  window.GUITAR_LEVEL_DATA = { levels, songs };
})();
