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

  const sourceByLevel = {
    debut: "RSL Acoustic Guitar Debut (2016)",
    g1: "RSL Acoustic Guitar Grade 1 (2016)",
    g2: "RSL Acoustic Guitar Grade 2 (2016)",
    g3: "RSL Acoustic Guitar Grade 3 (2016)",
    g4: "RSL Acoustic Guitar Grade 4 (2016)",
    g5: "RSL Acoustic Guitar Grade 5 (2016)",
    g6: "RSL Acoustic Guitar Grade 6 (2016)",
    g7: "RSL Acoustic Guitar Grade 7 (2016)",
    g8: "RSL Acoustic Guitar Grade 8 (2016)"
  };

  const sourcePdfByLevel = {
    debut: "RSLAcousticGuitar Debut.pdf",
    g1: "RSLAcousticG1.pdf",
    g2: "RSLAcousticG2.pdf",
    g3: "RSLAcousticG3.pdf",
    g4: "RSLAcousticG4.pdf",
    g5: "RSLAcousticG5.pdf",
    g6: "RSLAcousticG6.pdf",
    g7: "RSLAcousticG7.pdf",
    g8: "RSLAcousticG8.pdf"
  };

  const scoreAssetVersion = "20260714-kiss-the-rain";

  const songs = [
    makeSong({ id: "rsl-acoustic-debut-learn-to-fly", title: "Learn To Fly", artist: "Foo Fighters", level: "debut", pdfPages: "9-10", scoreImageCount: 2 }),
    makeSong({ id: "rsl-acoustic-debut-chasing-cars", title: "Chasing Cars", artist: "Snow Patrol", level: "debut", pdfPages: "13-14", scoreImageCount: 2 }),
    makeSong({ id: "rsl-acoustic-debut-yellow", title: "Yellow", artist: "Coldplay", level: "debut", pdfPages: "17-18", scoreImageCount: 2 }),
    makeSong({ id: "rsl-acoustic-debut-brown-eyed-girl", title: "Brown Eyed Girl", artist: "Van Morrison", level: "debut", pdfPages: "21-22", scoreImageCount: 2 }),
    makeSong({ id: "rsl-acoustic-debut-if-i-were-a-boy", title: "If I Were A Boy", artist: "Beyonce", level: "debut", pdfPages: "25-26", scoreImageCount: 2 }),
    makeSong({ id: "rsl-acoustic-debut-no-woman-no-cry", title: "No Woman, No Cry", artist: "Bob Marley", level: "debut", pdfPages: "29-30", scoreImageCount: 2 }),

    makeSong({ id: "rsl-acoustic-g1-the-unforgiven", title: "The Unforgiven", artist: "Metallica", level: "g1", pdfPages: "9-10", scoreImageCount: 2 }),
    makeSong({ id: "rsl-acoustic-g1-beautiful", title: "Beautiful", artist: "Christina Aguilera", level: "g1", pdfPages: "13-14", scoreImageCount: 2 }),
    makeSong({ id: "rsl-acoustic-g1-stella-by-starlight", title: "Stella By Starlight", artist: "Ray Charles", level: "g1", pdfPages: "17-18", scoreImageCount: 2 }),
    makeSong({ id: "rsl-acoustic-g1-let-it-be", title: "Let It Be", artist: "The Beatles", level: "g1", pdfPages: "21-22", scoreImageCount: 2 }),
    makeSong({ id: "rsl-acoustic-g1-someone-like-you", title: "Someone Like You", artist: "Adele", level: "g1", pdfPages: "25-26", scoreImageCount: 2 }),
    makeSong({ id: "rsl-acoustic-g1-free-fallin", title: "Free Fallin'", artist: "Tom Petty", level: "g1", pdfPages: "29-30", scoreImageCount: 2 }),
    makeSong({
      id: "rsl-acoustic-g4-the-sound-of-silence",
      title: "The Sound of Silence",
      artist: "P. Simon",
      level: "g4",
      source: "Teacher Upload",
      sourcePdf: "The Sound Of Silence.png",
      category: "独奏",
      style: "Classical Guitar Solo",
      techniques: ["classical guitar", "fingerstyle", "solo", "arpeggio"],
      pdfPages: "1",
      scoreImageCount: 1,
      practiceOrder: ["Map the arpeggio pattern", "Practice melody and bass balance", "Learn the full score slowly", "Play the solo with steady pulse"],
      commonIssues: ["Letting accompaniment notes cover the melody", "Changing position before the beat is stable", "Rushing the 84 BPM arpeggio"],
      passStandard: "Perform the solo with clear melody, steady arpeggio flow, and balanced bass notes."
    }),
    makeSong({
      id: "rsl-acoustic-g4-you-raise-me-up",
      title: "You Raise Me Up",
      artist: "Secret Garden",
      level: "g4",
      source: "Teacher Upload",
      sourcePdf: "You Raise Me Up#1.png",
      category: "独奏",
      style: "Fingerstyle Solo",
      techniques: ["fingerstyle", "solo", "ballad", "arpeggio"],
      pdfPages: "1",
      scoreImageCount: 1,
      practiceOrder: ["Map the key and meter changes", "Practice melody and bass separately", "Learn the score line by line", "Play the full solo slowly"],
      commonIssues: ["Losing pulse across the 3/8 to 4/4 change", "Letting sustained melody notes disappear", "Rushing fills before bar lines"],
      passStandard: "Perform the solo with steady pulse, clear melody sustain, and balanced accompaniment."
    }),

    makeSong({ id: "rsl-acoustic-g2-all-along-the-watchtower", title: "All Along The Watchtower", artist: "Jimi Hendrix", level: "g2", pdfPages: "9-10", scoreImageCount: 2 }),
    makeSong({ id: "rsl-acoustic-g2-the-a-team", title: "The A Team", artist: "Ed Sheeran", level: "g2", pdfPages: "13-16", scoreImageCount: 4 }),
    makeSong({ id: "rsl-acoustic-g2-lover-you-shouldve-come-over", title: "Lover, You Should've Come Over", artist: "Jeff Buckley", level: "g2", pdfPages: "19-22", scoreImageCount: 4 }),
    makeSong({ id: "rsl-acoustic-g2-sittin-on-the-dock-of-the-bay", title: "(Sittin' On) The Dock Of The Bay", artist: "Otis Redding", level: "g2", pdfPages: "25-28", scoreImageCount: 4 }),
    makeSong({ id: "rsl-acoustic-g2-wonderwall", title: "Wonderwall", artist: "Oasis", level: "g2", pdfPages: "31-32", scoreImageCount: 2 }),
    makeSong({ id: "rsl-acoustic-g2-wild-wood", title: "Wild Wood", artist: "Paul Weller", level: "g2", pdfPages: "35-36", scoreImageCount: 2 }),

    makeSong({ id: "rsl-acoustic-g3-thinking-out-loud", title: "Thinking Out Loud", artist: "Ed Sheeran", level: "g3", pdfPages: "9-10", scoreImageCount: 2 }),
    makeSong({ id: "rsl-acoustic-g3-everything-has-changed", title: "Everything Has Changed", artist: "Taylor Swift", level: "g3", pdfPages: "13-14", scoreImageCount: 2 }),
    makeSong({ id: "rsl-acoustic-g3-best-of-you", title: "Best Of You", artist: "Foo Fighters", level: "g3", pdfPages: "17-18", scoreImageCount: 2 }),
    makeSong({ id: "rsl-acoustic-g3-i-dont-want-to-miss-a-thing", title: "I Don't Want To Miss A Thing", artist: "Aerosmith", level: "g3", pdfPages: "21-22", scoreImageCount: 2 }),
    makeSong({ id: "rsl-acoustic-g3-when-you-say-nothing-at-all", title: "When You Say Nothing At All", artist: "Alison Krauss", level: "g3", pdfPages: "25-30", scoreImageCount: 6 }),
    makeSong({ id: "rsl-acoustic-g3-bless-the-broken-road", title: "Bless The Broken Road", artist: "Rascal Flatts", level: "g3", pdfPages: "33-38", scoreImageCount: 6 }),
    makeSong({
      id: "rsl-acoustic-g4-canon",
      title: "Canon",
      artist: "J. Pachelbel",
      level: "g4",
      source: "Teacher Upload",
      sourcePdf: "Canon#1.png + Canon#2.png",
      category: "独奏",
      style: "Classical Guitar Solo",
      techniques: ["classical guitar", "fingerstyle", "solo", "arpeggio"],
      pdfPages: "1-2",
      scoreImageCount: 2,
      practiceOrder: ["Map the chord sequence", "Practice melody and bass balance", "Learn the score page by page", "Play the full canon slowly"],
      commonIssues: ["Letting repeated harmony become uneven", "Rushing the sixteenth-note passages", "Changing bass shapes before the melody is clear"],
      passStandard: "Perform the solo with steady pulse, balanced voices, and clear melodic direction."
    }),
    makeSong({
      id: "rsl-acoustic-g4-perfect",
      title: "Perfect",
      artist: "Ed Sheeran",
      level: "g4",
      source: "Teacher Upload",
      sourcePdf: "Perfect#1.png + Perfect#2.png",
      category: "独奏",
      style: "Fingerstyle Solo",
      techniques: ["fingerstyle", "solo", "ballad", "arpeggio"],
      pdfPages: "1-2",
      scoreImageCount: 2,
      practiceOrder: ["Map the 12/8 pulse", "Practice melody and bass separately", "Learn the score page by page", "Play the full solo slowly"],
      commonIssues: ["Losing the 12/8 subdivision", "Letting sustained melody notes disappear", "Rushing fills before bar lines"],
      passStandard: "Perform the solo with steady 12/8 pulse, clear melody sustain, and balanced accompaniment."
    }),
    makeSong({
      id: "rsl-acoustic-g4-kiss-the-rain",
      title: "Kiss The Rain",
      artist: "Yiruma",
      level: "g4",
      source: "Teacher Upload",
      sourcePdf: "Kiss The Rain#1.png + Kiss The Rain#2.png",
      category: "独奏",
      style: "Fingerstyle Solo",
      techniques: ["fingerstyle", "solo", "instrumental", "arpeggio"],
      pdfPages: "1-2",
      scoreImageCount: 2,
      practiceOrder: ["Map the 6/8 pulse", "Practice melody and bass separately", "Learn the score page by page", "Play the full solo slowly"],
      commonIssues: ["Losing the 6/8 subdivision", "Letting melody notes disappear inside the arpeggio", "Rushing transitions before bar lines"],
      passStandard: "Perform the solo with steady 6/8 pulse, clear melodic sustain, and balanced accompaniment."
    }),
    makeSong({
      id: "rsl-acoustic-g4-wake-me-up-when-september-ends",
      title: "Wake Me Up When September Ends",
      artist: "Green Day",
      level: "g4",
      source: "Teacher Upload",
      sourcePdf: "Wake Me Up When September Ends#1.png + Wake Me Up When September Ends#2.png + Wake Me Up When September Ends#3.png",
      category: "独奏",
      style: "Fingerstyle Solo",
      techniques: ["fingerstyle", "solo", "arpeggio", "pop rock"],
      pdfPages: "1-3",
      scoreImageCount: 3,
      practiceOrder: ["Map the 104 BPM pulse", "Practice bass and melody balance", "Learn the score page by page", "Play the full solo slowly"],
      commonIssues: ["Rushing repeated arpeggio figures", "Letting bass notes cover the melody", "Losing continuity across repeated sections"],
      passStandard: "Perform the solo with steady pulse, clear melody, and balanced accompaniment."
    }),
    makeSong({
      id: "rsl-acoustic-g5-romance-de-amor",
      title: "Romance de Amor",
      artist: "Traditional",
      level: "g5",
      source: "Teacher Upload",
      sourcePdf: "Romance_de_Amor#1.png + Romance_de_Amor#2.png",
      category: "独奏",
      style: "Classical Guitar Solo",
      techniques: ["classical guitar", "fingerstyle", "solo", "arpeggio"],
      pdfPages: "1-2",
      scoreImageCount: 2,
      practiceOrder: ["Map the arpeggio pattern", "Practice melody and bass balance", "Learn the score page by page", "Play the full solo slowly"],
      commonIssues: ["Letting the bass overpower the melody", "Rushing the triplet arpeggio", "Changing positions before the left hand is prepared"],
      passStandard: "Perform the solo with steady triplet flow, clear melody, and balanced bass notes."
    }),

    makeSong({ id: "rsl-acoustic-g4-nothing-else-matters", title: "Nothing Else Matters", artist: "Metallica", level: "g4", pdfPages: "9-12", scoreImageCount: 4 }),
    makeSong({ id: "rsl-acoustic-g4-fearless", title: "Fearless", artist: "Taylor Swift", level: "g4", pdfPages: "15-18", scoreImageCount: 4 }),
    makeSong({ id: "rsl-acoustic-g4-big-yellow-taxi", title: "Big Yellow Taxi", artist: "Joni Mitchell", level: "g4", pdfPages: "21-24", scoreImageCount: 4 }),
    makeSong({ id: "rsl-acoustic-g4-baby-now-that-ive-found-you", title: "Baby, Now That I've Found You", artist: "Alison Krauss", level: "g4", pdfPages: "27-32", scoreImageCount: 6 }),
    makeSong({ id: "rsl-acoustic-g4-layla", title: "Layla", artist: "Eric Clapton", level: "g4", pdfPages: "35-40", scoreImageCount: 6 }),
    makeSong({ id: "rsl-acoustic-g4-little-lion-man", title: "Little Lion Man", artist: "Mumford and Sons", level: "g4", pdfPages: "43-46", scoreImageCount: 4 }),

    makeSong({ id: "rsl-acoustic-g5-wanted-dead-or-alive", title: "Wanted Dead Or Alive", artist: "Bon Jovi", level: "g5", pdfPages: "9-10", scoreImageCount: 2 }),
    makeSong({ id: "rsl-acoustic-g5-shape-of-my-heart", title: "Shape Of My Heart", artist: "Sting", level: "g5", pdfPages: "13-18", scoreImageCount: 6 }),
    makeSong({ id: "rsl-acoustic-g5-songbird", title: "Songbird", artist: "Eva Cassidy", level: "g5", pdfPages: "21-22", scoreImageCount: 2 }),
    makeSong({ id: "rsl-acoustic-g5-brothers-in-arms", title: "Brothers In Arms", artist: "Dire Straits", level: "g5", pdfPages: "25-28", scoreImageCount: 4 }),
    makeSong({ id: "rsl-acoustic-g5-tears-in-heaven", title: "Tears In Heaven", artist: "Eric Clapton", level: "g5", pdfPages: "31-38", scoreImageCount: 8 }),
    makeSong({ id: "rsl-acoustic-g5-blackbird", title: "Blackbird", artist: "The Beatles", level: "g5", pdfPages: "41-42", scoreImageCount: 2 }),

    makeSong({ id: "rsl-acoustic-g6-pride-and-joy", title: "Pride And Joy", artist: "Stevie Ray Vaughan", level: "g6", pdfPages: "9-16", scoreImageCount: 8 }),
    makeSong({ id: "rsl-acoustic-g6-man-in-the-mirror", title: "Man In The Mirror", artist: "Michael Jackson", level: "g6", pdfPages: "19-28", scoreImageCount: 10 }),
    makeSong({ id: "rsl-acoustic-g6-dont-know-why", title: "Don't Know Why", artist: "Norah Jones", level: "g6", pdfPages: "31-36", scoreImageCount: 6 }),
    makeSong({ id: "rsl-acoustic-g6-the-boxer", title: "The Boxer", artist: "Simon & Garfunkel", level: "g6", pdfPages: "39-42", scoreImageCount: 4 }),
    makeSong({ id: "rsl-acoustic-g6-what-a-friend-we-have-in-jesus", title: "What A Friend We Have In Jesus", artist: "Brad Paisley", level: "g6", pdfPages: "45-48", scoreImageCount: 4 }),
    makeSong({ id: "rsl-acoustic-g6-here-there-and-everywhere", title: "Here, There And Everywhere", artist: "The Beatles", level: "g6", pdfPages: "51-54", scoreImageCount: 4 }),

    makeSong({ id: "rsl-acoustic-g7-woke-up-dreaming", title: "Woke Up Dreaming", artist: "Joe Bonamassa", level: "g7", pdfPages: "9-12", scoreImageCount: 4 }),
    makeSong({ id: "rsl-acoustic-g7-neon", title: "Neon", artist: "John Mayer", level: "g7", pdfPages: "15-25", scoreImageCount: 11 }),
    makeSong({ id: "rsl-acoustic-g7-teardrop", title: "Teardrop", artist: "Newton Faulkner", level: "g7", pdfPages: "29-34", scoreImageCount: 6 }),
    makeSong({ id: "rsl-acoustic-g7-our-spanish-love-song", title: "Our Spanish Love Song", artist: "Pat Metheny", level: "g7", pdfPages: "37-42", scoreImageCount: 6 }),
    makeSong({ id: "rsl-acoustic-g7-and-so-it-goes", title: "And So It Goes", artist: "Tommy Emmanuel", level: "g7", pdfPages: "45-48", scoreImageCount: 4 }),
    makeSong({ id: "rsl-acoustic-g7-georgia-on-my-mind", title: "Georgia On My Mind", artist: "Hoagy Carmichael", level: "g7", pdfPages: "51-54", scoreImageCount: 4 }),

    makeSong({ id: "rsl-acoustic-g8-kind-hearted-woman", title: "Kind Hearted Woman", artist: "Robert Johnson", level: "g8", pdfPages: "9-16", scoreImageCount: 8 }),
    makeSong({ id: "rsl-acoustic-g8-jerrys-breakdown", title: "Jerry's Breakdown", artist: "Jerry Reed", level: "g8", pdfPages: "19-22", scoreImageCount: 4 }),
    makeSong({ id: "rsl-acoustic-g8-tears-for-jerusalem", title: "Tears For Jerusalem", artist: "Tommy Emmanuel", level: "g8", pdfPages: "25-32", scoreImageCount: 8 }),
    makeSong({ id: "rsl-acoustic-g8-first-rule-of-thumb", title: "First Rule Of Thumb", artist: "Brent Mason", level: "g8", pdfPages: "35-40", scoreImageCount: 6 }),
    makeSong({ id: "rsl-acoustic-g8-midnight-express", title: "Midnight Express", artist: "Extreme", level: "g8", pdfPages: "43-53", scoreImageCount: 11 }),
    makeSong({ id: "rsl-acoustic-g8-i-need-something", title: "I Need Something", artist: "Newton Faulkner", level: "g8", pdfPages: "57-64", scoreImageCount: 8 })
  ];

  const audioFilesBySong = {
    "rsl-acoustic-debut-brown-eyed-girl": ["full-mix.mp3", "backing-track.mp3"],
    "rsl-acoustic-debut-chasing-cars": ["full-mix.mp3", "backing-track-1.mp3", "backing-track-2.mp3"],
    "rsl-acoustic-debut-if-i-were-a-boy": ["full-mix.mp3", "backing-track.mp3"],
    "rsl-acoustic-debut-learn-to-fly": ["full-mix.mp3", "backing-track.mp3"],
    "rsl-acoustic-debut-no-woman-no-cry": ["full-mix.mp3", "backing-track.mp3"],
    "rsl-acoustic-debut-yellow": ["full-mix.mp3", "backing-track-1.mp3", "backing-track-2.mp3"],
    "rsl-acoustic-g1-beautiful": ["full-mix.mp3", "backing-track.mp3"],
    "rsl-acoustic-g1-free-fallin": ["full-mix.mp3", "backing-track.mp3"],
    "rsl-acoustic-g1-let-it-be": ["full-mix.mp3", "backing-track.mp3"],
    "rsl-acoustic-g1-someone-like-you": ["full-mix.mp3", "backing-track.mp3"],
    "rsl-acoustic-g1-stella-by-starlight": ["full-mix.mp3", "backing-track.mp3"],
    "rsl-acoustic-g4-the-sound-of-silence": ["solo.mp3", "solo-click.mp3"],
    "rsl-acoustic-g1-the-unforgiven": ["full-mix.mp3", "backing-track.mp3"],
    "rsl-acoustic-g2-all-along-the-watchtower": ["full-mix.mp3", "backing-track.mp3"],
    "rsl-acoustic-g2-lover-you-shouldve-come-over": ["full-mix.mp3", "backing-track.mp3"],
    "rsl-acoustic-g2-sittin-on-the-dock-of-the-bay": ["full-mix.mp3", "backing-track.mp3"],
    "rsl-acoustic-g2-the-a-team": ["full-mix.mp3", "backing-track.mp3"],
    "rsl-acoustic-g2-wild-wood": ["full-mix.mp3", "backing-track.mp3"],
    "rsl-acoustic-g2-wonderwall": ["full-mix.mp3", "backing-track.mp3"],
    "rsl-acoustic-g3-best-of-you": ["full-mix.mp3", "backing-track.mp3"],
    "rsl-acoustic-g3-bless-the-broken-road": ["full-mix.mp3", "backing-track.mp3"],
    "rsl-acoustic-g4-canon": ["solo.mp3", "solo-click.mp3"],
    "rsl-acoustic-g3-everything-has-changed": ["full-mix.mp3", "backing-track.mp3"],
    "rsl-acoustic-g3-i-dont-want-to-miss-a-thing": ["full-mix.mp3", "backing-track.mp3"],
    "rsl-acoustic-g4-kiss-the-rain": ["solo.mp3", "solo-click.mp3"],
    "rsl-acoustic-g4-perfect": ["solo.mp3"],
    "rsl-acoustic-g4-wake-me-up-when-september-ends": ["solo.mp3", "solo-click.mp3"],
    "rsl-acoustic-g5-romance-de-amor": ["solo.mp3", "solo-click.mp3"],
    "rsl-acoustic-g3-thinking-out-loud": ["full-mix.mp3", "backing-track.mp3"],
    "rsl-acoustic-g3-when-you-say-nothing-at-all": ["full-mix.mp3", "backing-track.mp3"],
    "rsl-acoustic-g4-you-raise-me-up": ["solo.mp3", "solo-click.mp3"],
    "rsl-acoustic-g4-baby-now-that-ive-found-you": ["full-mix.mp3", "backing-track.mp3"],
    "rsl-acoustic-g4-big-yellow-taxi": ["full-mix.mp3", "backing-track.mp3"],
    "rsl-acoustic-g4-fearless": ["full-mix.mp3", "backing-track.mp3"],
    "rsl-acoustic-g4-layla": ["full-mix.mp3", "backing-track.mp3"],
    "rsl-acoustic-g4-little-lion-man": ["full-mix.mp3", "backing-track.mp3"],
    "rsl-acoustic-g4-nothing-else-matters": ["full-mix.mp3", "backing-track.mp3"],
    "rsl-acoustic-g5-blackbird": ["full-mix.mp3", "backing-track.mp3"],
    "rsl-acoustic-g5-brothers-in-arms": ["full-mix.mp3", "backing-track.mp3"],
    "rsl-acoustic-g5-shape-of-my-heart": ["full-mix.mp3", "backing-track.mp3"],
    "rsl-acoustic-g5-songbird": ["full-mix.mp3", "backing-track.mp3"],
    "rsl-acoustic-g5-tears-in-heaven": ["full-mix.mp3", "backing-track.mp3"],
    "rsl-acoustic-g5-wanted-dead-or-alive": ["full-mix.mp3", "backing-track.mp3"],
    "rsl-acoustic-g6-dont-know-why": ["full-mix.mp3", "backing-track.mp3"],
    "rsl-acoustic-g6-here-there-and-everywhere": ["full-mix.mp3", "backing-track.mp3"],
    "rsl-acoustic-g6-man-in-the-mirror": ["full-mix.mp3", "backing-track.mp3"],
    "rsl-acoustic-g6-pride-and-joy": ["full-mix.mp3", "backing-track.mp3"],
    "rsl-acoustic-g6-the-boxer": ["full-mix.mp3", "backing-track.mp3"],
    "rsl-acoustic-g6-what-a-friend-we-have-in-jesus": ["solo.mp3"],
    "rsl-acoustic-g7-and-so-it-goes": ["solo.mp3"],
    "rsl-acoustic-g7-georgia-on-my-mind": ["solo.mp3"],
    "rsl-acoustic-g7-neon": ["solo.mp3"],
    "rsl-acoustic-g7-our-spanish-love-song": ["full-mix.mp3", "backing-track.mp3"],
    "rsl-acoustic-g7-teardrop": ["full-mix.mp3", "backing-track.mp3"],
    "rsl-acoustic-g7-woke-up-dreaming": ["full-mix.mp3", "backing-track.mp3"],
    "rsl-acoustic-g8-first-rule-of-thumb": ["full-mix.mp3", "backing-track.mp3"],
    "rsl-acoustic-g8-i-need-something": ["full-mix.mp3", "backing-track.mp3"],
    "rsl-acoustic-g8-jerrys-breakdown": ["full-mix.mp3", "backing-track.mp3"],
    "rsl-acoustic-g8-kind-hearted-woman": ["full-mix.mp3", "backing-track.mp3"],
    "rsl-acoustic-g8-midnight-express": ["full-mix.mp3", "backing-track.mp3"],
    "rsl-acoustic-g8-tears-for-jerusalem": ["full-mix.mp3"]
  };

  const audioTitleByFile = {
    "full-mix.mp3": "Full mix",
    "backing-track.mp3": "Backing track",
    "backing-track-1.mp3": "Backing track 1",
    "backing-track-2.mp3": "Backing track 2",
    "solo.mp3": "Solo",
    "solo-click.mp3": "Solo (click)"
  };

  function audioVersionsFor(songId) {
    return (audioFilesBySong[songId] || []).map((fileName) => ({
      id: fileName.replace(/\.mp3$/i, ""),
      title: audioTitleByFile[fileName] || fileName.replace(/\.mp3$/i, ""),
      src: `./assets/audio/rockschool/acoustic-guitar/${songId}/${fileName}`
    }));
  }

  function scoreImagesFor(songId, title, count) {
    return Array.from({ length: count }, (_, index) => {
      const number = String(index + 1).padStart(2, "0");
      return {
        title: `${title} score ${number}`,
        src: `./scores/acoustic-guitar/${songId}/score-${number}.png?v=${scoreAssetVersion}`
      };
    });
  }

  function makeSong(song) {
    const { scoreImageCount, ...songData } = song;
    const level = levels.find((item) => item.id === song.level);
    const levelLabel = level ? level.label : song.level;
    const teaching = {
      goal: song.goal || `Study the ${levelLabel} acoustic arrangement of "${song.title}" from the official score pages.`,
      focus: song.focus || "Read the notation and TAB first, then isolate rhythm, fingering, tone, and transitions.",
      practiceOrder: song.practiceOrder || ["Map the song form", "Clap and count the rhythm", "Learn the score page by page", "Rehearse with backing track"],
      commonIssues: song.commonIssues || ["Skipping score reading before playing", "Letting position shifts break the pulse", "Practicing full tempo before fingering is secure"],
      passStandard: song.passStandard || "Perform the assessed acoustic part with steady time, clear articulation, and controlled dynamics."
    };

    return {
      ...songData,
      source: song.source || sourceByLevel[song.level],
      sourcePdf: song.sourcePdf || sourcePdfByLevel[song.level],
      category: song.category || "Hit Tune",
      style: song.style || "Acoustic Exam Piece",
      techniques: song.techniques || ["RSL Acoustic", levelLabel, "score reading", "performance"],
      goal: teaching.goal,
      focus: teaching.focus,
      practiceOrder: teaching.practiceOrder,
      commonIssues: teaching.commonIssues,
      passStandard: teaching.passStandard,
      audio: [],
      scoreImageCount,
      scoreImages: scoreImagesFor(song.id, song.title, scoreImageCount),
      teaching
    };
  }

  songs.forEach((song) => {
    song.audio = audioVersionsFor(song.id);
  });

  window.GUITAR_LEVEL_DATA = { levels, songs };
})();
