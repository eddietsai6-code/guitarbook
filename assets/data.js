(function () {
  const levels = [
    {
      id: "beginner",
      label: "Beginner",
      order: 0,
      core: "First-position basics, open chords, and simple melody",
      boundary: "Play common C and G key chord changes in the first three frets, plus a short melody or solo.",
      techniques: ["first position", "open chords", "C key", "G key", "simple solo"],
      color: "#f97316"
    },
    {
      id: "beginner-plus",
      label: "Beginner Plus",
      order: 1,
      core: "Basic accompaniment patterns, common rhythms, and song sections",
      boundary: "Keep a steady verse/chorus accompaniment and understand the basic harmonic movement.",
      techniques: ["strumming", "arpeggio", "steady pulse", "harmony"],
      color: "#3b82f6"
    },
    {
      id: "intermediate",
      label: "Intermediate",
      order: 2,
      core: "Complete fingerstyle pieces and entry-level original arrangements",
      boundary: "Break down a full fingerstyle piece into melody, bass, inner voices, and common ornaments.",
      techniques: ["fingerstyle", "melody bass", "slide", "hammer-on"],
      color: "#10b981"
    },
    {
      id: "intermediate-plus",
      label: "Intermediate Focus",
      order: 3,
      core: "Full-neck accompaniment chords and high-density rhythm work",
      boundary: "Move one progression across different neck positions and handle 32nd-note style rhythm patterns.",
      techniques: ["full-neck chords", "inversions", "32nd rhythm", "syncopation"],
      color: "#ec4899"
    },
    {
      id: "advanced",
      label: "Advanced",
      order: 4,
      core: "Style-aware performance, arranging, and applied theory",
      boundary: "Choose right-hand texture, harmony, tone, and arrangement strategy according to the song style.",
      techniques: ["arranging", "style comping", "applied theory", "dynamics"],
      color: "#8b5cf6"
    },
    {
      id: "advanced-style",
      label: "Advanced Style",
      order: 5,
      core: "Flamenco-style topics and integrated expression",
      boundary: "Blend style-specific technique, rhythmic vocabulary, and harmonic color into a short performance.",
      techniques: ["flamenco", "tremolo", "rasgueado", "style vocabulary"],
      color: "#0f766e"
    }
  ];

  const songs = [
    makeSong({
      id: "three-fret-warmup",
      title: "First-Position Warmup",
      artist: "GuitarBook Placeholder",
      level: "beginner",
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
      level: "beginner-plus",
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
      level: "beginner",
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
      level: "intermediate",
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
      level: "intermediate-plus",
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
      level: "advanced-style",
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
