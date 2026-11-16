import {
  AlgorithmChallenge,
  BadgeItem,
  ClueCard,
  Continent,
  CrosswordWord,
  CustomQuestion,
  FlagQuestion,
  GameType,
  MatchingPair,
  QuestionCategory,
  QuestionMode,
  QuizQuestion,
  RacingQuestion,
  ScoreRecord,
} from '../types';

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function shuffleWithSeed<T>(items: T[], seed: string): T[] {
  const arr = [...items];
  let state = hashSeed(seed) || 1;
  for (let i = arr.length - 1; i > 0; i--) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const j = state % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function createVariantSeed(
  userId: string,
  roomCode?: string,
  roundSeed?: string,
  questionMode: QuestionMode = 'varied',
  playNonce = 0
): string {
  if (questionMode === 'uniform') {
    return `${roomCode || 'GLOBAL'}-${roundSeed || 'base'}-${playNonce}`;
  }
  return `${userId}-${roomCode || 'SOLO'}-${roundSeed || 'base'}-${playNonce}`;
}

export function shortVariantCode(seed: string): string {
  return hashSeed(seed).toString(36).toUpperCase().slice(0, 5).padStart(5, '0');
}

function shuffleMcqOptions<T extends { id: string; options: string[]; correctIndex: number }>(
  item: T,
  seed: string
): T {
  if (item.options.length <= 2 && item.options[0] === 'Benar' && item.options[1] === 'Salah') {
    return item;
  }
  const indexed = item.options.map((text, idx) => ({ text, isCorrect: idx === item.correctIndex }));
  const shuffled = shuffleWithSeed(indexed, `${seed}-${item.id}`);
  return {
    ...item,
    options: shuffled.map((o) => o.text),
    correctIndex: shuffled.findIndex((o) => o.isCorrect),
  };
}

export const AVATAR_CHOICES: Array<{ id: string; icon: string; label: string }> = [
  { id: 'robot', icon: '🤖', label: 'Robot Cerdas' },
  { id: 'cat-astro', icon: '🐱', label: 'Kucing Astronot' },
  { id: 'hijab', icon: '🧕', label: 'Pelajar Berhijab' },
  { id: 'peci', icon: '🧑‍🎓', label: 'Pelajar Berpeci' },
  { id: 'rocket', icon: '🚀', label: 'Roket Sains' },
  { id: 'owl', icon: '🦉', label: 'Burung Hantu Ilmu' },
  { id: 'lion', icon: '🦁', label: 'Singa Pemberani' },
  { id: 'laptop', icon: '💻', label: 'Juara Kode' },
];

export const CATEGORY_LABELS: Record<QuestionCategory, string> = {
  tik: 'TIK & Adab Digital',
  umum: 'Pengetahuan Umum',
  campuran: 'Campuran TIK & Umum',
};

export const GAME_META: Record<
  GameType,
  {
    code: string;
    title: string;
    subtitle: string;
    topicFocus: string;
    estimatedMinutes: number;
  }
> = {
  quiz: {
    code: 'A',
    title: 'Quiz Interaktif',
    subtitle: 'Pilihan ganda & benar/salah kompetitif berbasis waktu.',
    topicFocus: 'TIK, Pengetahuan Umum & Adab Digital',
    estimatedMinutes: 5,
  },
  flag: {
    code: 'B',
    title: 'Tebak Bendera Dunia',
    subtitle: 'Kenali bendera negara dari Benua Asia, Afrika, Eropa, dan Amerika.',
    topicFocus: 'Geografi Global · 4 Benua Utama',
    estimatedMinutes: 4,
  },
  matching: {
    code: 'C',
    title: 'Game Balasan',
    subtitle: 'Cocokkan istilah TIK, ikon aplikasi, dan fungsinya secara tepat.',
    topicFocus: 'Konsep Komputasi & Aplikasi Produktivitas',
    estimatedMinutes: 4,
  },
  clue: {
    code: 'D',
    title: 'Tebak Clue Digital',
    subtitle: 'Pecahkan istilah TIK & umum dari 3 petunjuk bertahap sebelum waktu habis.',
    topicFocus: 'Literasi Digital & Wawasan Dunia',
    estimatedMinutes: 5,
  },
  puzzle: {
    code: 'E',
    title: 'Teka-Teki & Logika',
    subtitle: 'Teka-teki silang TIK dan susun alur algoritma komputasional.',
    topicFocus: 'Berpikir Komputasional & Algoritma',
    estimatedMinutes: 7,
  },
  racing: {
    code: 'F',
    title: 'Code Racer 2D',
    subtitle: 'Balapan mobil berikon unik real-time dengan nitro boost saat menjawab tepat.',
    topicFocus: 'Evaluasi Cepat Terpadu',
    estimatedMinutes: 5,
  },
};

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1',
    type: 'mcq',
    topic: 'Adab Digital & Literasi',
    question: 'Sebelum meneruskan berita di grup kelas WhatsApp, prinsip Islami apa yang wajib diterapkan agar tidak menyebarkan hoaks?',
    options: [
      'Tabayyun (memeriksa kebenaran sumber berita terlebih dahulu)',
      'Langsung meneruskan agar menjadi yang paling cepat memberi info',
      'Menambahkan opini pribadi tanpa membaca isi lengkapnya',
      'Mengirim ke semua kontak agar viral terlebih dahulu',
    ],
    correctIndex: 0,
    islamicValue: 'QS. Al-Hujurat: 6 mengajarkan pentingnya tabayyun (cek fakta) saat menerima kabar.',
    explanation: 'Tabayyun digital berarti memverifikasi fakta, sumber resmi, dan tanggal berita sebelum membagikannya.',
  },
  {
    id: 'q2',
    type: 'mcq',
    topic: 'Perangkat Keras',
    question: 'Komponen utama komputer yang bertugas mengeksekusi instruksi logika dan aritmetika sehingga disebut "otak komputer" adalah...',
    options: ['Hard Disk Drive (HDD)', 'Central Processing Unit (CPU)', 'Power Supply Unit (PSU)', 'Random Access Memory (RAM)'],
    correctIndex: 1,
    islamicValue: 'Ketertiban sistem komputer mencerminkan pentingnya kepemimpinan akal yang sehat.',
    explanation: 'CPU (Processor) mengolah seluruh instruksi program, sementara RAM hanya menyimpan data sementara.',
  },
  {
    id: 'q3',
    type: 'tf',
    topic: 'Keamanan Siber',
    question: 'Benar atau Salah: Menggunakan kata sandi yang sama persis untuk akun email sekolah, media sosial, dan game adalah kebiasaan yang aman.',
    options: ['Benar', 'Salah'],
    correctIndex: 1,
    islamicValue: 'Menjaga amanah data diri dan sekolah adalah bentuk tanggung jawab seorang muslim.',
    explanation: 'Salah! Jika satu layanan mengalami kebocoran data, seluruh akun lain berisiko ikut diretas.',
  },
  {
    id: 'q4',
    type: 'mcq',
    topic: 'Dasar Pemrograman',
    question: 'Dalam menyusun algoritma, struktur yang digunakan untuk membuat keputusan berdasarkan kondisi Benar atau Salah disebut...',
    options: ['Perulangan (Looping)', 'Percabangan (Conditional If-Else)', 'Variabel Konstanta', 'Komentar Kode'],
    correctIndex: 1,
    islamicValue: 'Berpikir terstruktur membantu mengambil keputusan bijak dalam kehidupan sehari-hari.',
    explanation: 'Percabangan (If-Else) mengevaluasi syarat logika tertentu untuk menentukan cabang langkah berikutnya.',
  },
  {
    id: 'q5',
    type: 'mcq',
    topic: 'Jaringan & Internet',
    question: 'Protokol keamanan web yang mengenkripsi komunikasi antara browser siswa dan server pembelajaran ditandai dengan awalan...',
    options: ['HTTP://', 'FTP://', 'HTTPS://', 'SMTP://'],
    correctIndex: 2,
    islamicValue: 'Melindungi privasi dan data orang lain merupakan bagian dari menjaga kehormatan sesama.',
    explanation: 'HTTPS (Hypertext Transfer Protocol Secure) menambahkan lapisan enkripsi SSL/TLS untuk melindungi data.',
  },
  {
    id: 'q6',
    type: 'tf',
    topic: 'Adab Digital & Literasi',
    question: 'Benar atau Salah: Menyalin tugas artikel dari internet tanpa mencantumkan sumber atau penulis aslinya termasuk perbuatan tidak amanah (plagiarisme).',
    options: ['Benar', 'Salah'],
    correctIndex: 0,
    islamicValue: 'Kejujuran ilmiah dan menghargai karya orang lain adalah wujud akhlak mulia pelajar.',
    explanation: 'Benar. Plagiarisme melanggar etika akademik dan hukum hak cipta. Selalu cantumkan sitasi sumber.',
  },
  {
    id: 'q7',
    type: 'mcq',
    topic: 'Perangkat Keras',
    question: 'Manakah kelompok perangkat berikut yang seluruhnya berfungsi sebagai perangkat keluaran (Output Device)?',
    options: [
      'Monitor, Printer, Speaker',
      'Keyboard, Mouse, Scanner',
      'Monitor, Keyboard, Proyektor',
      'Microphone, Webcam, Flashdisk',
    ],
    correctIndex: 0,
    islamicValue: 'Memanfaatkan teknologi untuk menghasilkan karya yang bermanfaat (maslahat).',
    explanation: 'Monitor, printer, dan speaker menampilkan hasil pemrosesan komputer kepada pengguna.',
  },
  {
    id: 'q8',
    type: 'mcq',
    topic: 'Keamanan Siber',
    question: 'Upaya penipuan digital melalui tautan palsu yang menyerupai halaman login resmi demi mencuri kata sandi disebut...',
    options: ['Debugging', 'Phishing', 'Rendering', 'Caching'],
    correctIndex: 1,
    islamicValue: 'Waspada dan tidak mudah tertipu tipu daya digital menjaga keamanan diri dan keluarga.',
    explanation: 'Phishing memancing korban memasukkan data sensitif ke situs palsu. Selalu periksa alamat domain resmi.',
  },
  {
    id: 'q9',
    type: 'mcq',
    topic: 'Aplikasi Produktivitas',
    question: 'Di aplikasi pengolah angka (Spreadsheet), fungsi yang dipakai untuk menghitung rata-rata sekumpulan nilai ulangan adalah...',
    options: ['=AVERAGE()', '=SUM()', '=COUNTIF()', '=MIN()'],
    correctIndex: 0,
    islamicValue: 'Ketelitian mengolah data nilai mencerminkan sifat itqan (profesional dan rapi).',
    explanation: 'Fungsi =AVERAGE(rentang) menghitung nilai rata-rata aritmetika dari sel-sel yang dipilih.',
  },
  {
    id: 'q10',
    type: 'mcq',
    topic: 'Jaringan & Internet',
    question: 'Alamat unik berupa deretan angka yang membedakan setiap perangkat di jaringan komputer disebut...',
    options: ['IP Address', 'File Extension', 'Resolution', 'Refresh Rate'],
    correctIndex: 0,
    islamicValue: 'Identitas yang jelas memudahkan komunikasi tertib dan bertanggung jawab.',
    explanation: 'IP Address (Internet Protocol Address) adalah alamat numerik unik untuk mengenali perangkat di jaringan.',
  },
  {
    id: 'q11',
    type: 'tf',
    topic: 'Keamanan Siber',
    question: 'Benar atau Salah: Mengaktifkan Autentikasi Dua Faktor (2FA) menambah lapisan perlindungan akun selain kata sandi.',
    options: ['Benar', 'Salah'],
    correctIndex: 0,
    islamicValue: 'Ikhtiar maksimal menjaga amanah akun sekolah sebelum bertawakal.',
    explanation: 'Benar! 2FA meminta verifikasi kedua (seperti kode OTP) sehingga pencuri sandi tetap tidak bisa masuk.',
  },
  {
    id: 'q12',
    type: 'mcq',
    topic: 'Dasar Pemrograman',
    question: 'Tipe data yang khusus digunakan untuk menyimpan nilai logika Benar (True) atau Salah (False) dalam pemrograman adalah...',
    options: ['Boolean', 'Integer', 'String', 'Float'],
    correctIndex: 0,
    islamicValue: 'Ketegasan membedakan kebenaran dan kesalahan adalah pondasi berpikir logis.',
    explanation: 'Boolean hanya memiliki dua kemungkinan nilai yaitu True atau False.',
  },
  {
    id: 'q13',
    type: 'mcq',
    topic: 'Perangkat Keras',
    question: 'Perangkat keras yang berfungsi mengubah dokumen fisik atau gambar di kertas menjadi berkas digital di komputer adalah...',
    options: ['Scanner', 'Plotter', 'Projector', 'Speaker'],
    correctIndex: 0,
    islamicValue: 'Mendigitalisasi catatan ilmu memudahkan penyimpanan dan berbagi manfaat.',
    explanation: 'Scanner memindai dokumen kertas menjadi citra digital yang dapat diedit atau disimpan.',
  },
  {
    id: 'q14',
    type: 'mcq',
    topic: 'Adab Digital & Literasi',
    question: 'Ketika melihat teman mendapat komentar perundungan (cyberbullying) di media sosial, sikap terbaik seorang pelajar SMP IT Al Mumtaz adalah...',
    options: [
      'Membantu menenangkan, melaporkan konten buruk, dan tidak ikut menyebarkan',
      'Ikut menertawakan di kolom komentar agar ramai',
      'Merekam layar dan menyebarkannya ke grup lain',
      'Membalas dengan kata-kata yang lebih kasar',
    ],
    correctIndex: 0,
    islamicValue: 'Sesama muslim adalah saudara; dilarang saling menghina dan wajib menjaga kehormatan sesama.',
    explanation: 'Menjaga lisan di dunia maya mencakup tidak ikut merundung dan melaporkan perilaku berbahaya kepada guru atau admin.',
  },
];

export const MATCHING_LEVELS: Array<{
  id: string;
  title: string;
  description: string;
  pairs: MatchingPair[];
}> = [
  {
    id: 'lvl-1',
    title: 'Level 1: Perangkat Keras & Aplikasi',
    description: 'Pasangkan komponen TIK dan ikon aplikasi dengan fungsi utamanya.',
    pairs: [
      { id: 'm1', term: 'CPU', category: 'Hardware', definition: 'Otak pemroses seluruh instruksi program komputer', iconKey: 'cpu' },
      { id: 'm2', term: 'RAM', category: 'Hardware', definition: 'Memori sementara untuk program yang sedang berjalan', iconKey: 'layers' },
      { id: 'm3', term: 'Router', category: 'Jaringan', definition: 'Mengatur lalu lintas paket data antar jaringan internet', iconKey: 'wifi' },
      { id: 'm4', term: 'Spreadsheet', category: 'Aplikasi', definition: 'Mengolah data angka, tabel nilai, dan grafik otomatis', iconKey: 'table' },
      { id: 'm5', term: 'Browser', category: 'Aplikasi', definition: 'Membuka halaman situs web dan aplikasi daring', iconKey: 'globe' },
      { id: 'm6', term: 'Cloud Drive', category: 'Penyimpanan', definition: 'Menyimpan dan berbagi berkas tugas secara daring', iconKey: 'cloud' },
    ],
  },
  {
    id: 'lvl-2',
    title: 'Level 2: Keamanan Siber & Adab Digital',
    description: 'Cocokkan istilah keamanan siber dan etika digital Islami dengan maknanya.',
    pairs: [
      { id: 'm7', term: '2FA (Two-Factor Auth)', category: 'Keamanan', definition: 'Verifikasi ganda menggunakan sandi dan kode OTP', iconKey: 'shield' },
      { id: 'm8', term: 'Tabayyun Digital', category: 'Adab Islami', definition: 'Memverifikasi kebenaran berita sebelum menyebarkan', iconKey: 'check' },
      { id: 'm9', term: 'Phishing', category: 'Ancaman', definition: 'Tautan palsu yang menyamar untuk mencuri data akun', iconKey: 'alert' },
      { id: 'm10', term: 'Enkripsi', category: 'Keamanan', definition: 'Mengacak data menjadi kode rahasia agar tidak terbaca penyusup', iconKey: 'lock' },
      { id: 'm11', term: 'Jejak Digital', category: 'Literasi', definition: 'Rekaman seluruh aktivitas dan komentar kita di internet', iconKey: 'footprint' },
      { id: 'm12', term: 'Sitasi Sumber', category: 'Adab Islami', definition: 'Menyebutkan penulis asli sebagai bentuk kejujuran karya', iconKey: 'book' },
    ],
  },
  {
    id: 'lvl-3',
    title: 'Level 3: Sains, Jaringan & Logika Komputasi',
    description: 'Pasangkan konsep pemrograman, jaringan, dan pengetahuan sains dasar.',
    pairs: [
      { id: 'm13', term: 'Algoritma', category: 'Pemrograman', definition: 'Urutan langkah logis dan terstruktur untuk menyelesaikan masalah', iconKey: 'layers' },
      { id: 'm14', term: 'IP Address', category: 'Jaringan', definition: 'Alamat numerik unik identitas perangkat di jaringan internet', iconKey: 'wifi' },
      { id: 'm15', term: 'Boolean', category: 'Pemrograman', definition: 'Tipe data logika yang hanya bernilai Benar atau Salah', iconKey: 'check' },
      { id: 'm16', term: 'Fotosintesis', category: 'Sains', definition: 'Proses tumbuhan hijau membuat makanan dengan cahaya matahari', iconKey: 'globe' },
      { id: 'm17', term: 'Firewall', category: 'Keamanan', definition: 'Sistem penyaring lalu lintas data masuk dan keluar jaringan', iconKey: 'shield' },
      { id: 'm18', term: 'Backup Data', category: 'Penyimpanan', definition: 'Salinan cadangan berkas penting agar aman saat perangkat rusak', iconKey: 'cloud' },
    ],
  },
];

export const CLUE_CARDS: ClueCard[] = [
  {
    id: 'c1',
    topic: 'Keamanan Siber',
    answer: 'FIREWALL',
    acceptedAliases: ['FIREWALL', 'TEMBOK API'],
    clues: [
      'Aku bertindak sebagai penjaga gerbang lalu lintas data pada jaringan komputer.',
      'Aku menyaring koneksi yang mencurigakan agar perangkat tidak mudah disusupi.',
      'Namaku dalam bahasa Inggris berarti "Tembok Api" (8 huruf, diawali huruf F).',
    ],
    islamicNote: 'Seperti menjaga lisan dan pandangan, jaringan pun butuh penyaring dari hal mudharat.',
  },
  {
    id: 'c2',
    topic: 'Dasar Pemrograman',
    answer: 'ALGORITMA',
    acceptedAliases: ['ALGORITMA', 'ALGORITHM'],
    clues: [
      'Namaku berasal dari nama ilmuwan muslim besar abad ke-9, Al-Khawarizmi.',
      'Aku berisi urutan langkah logis yang jelas untuk menyelesaikan suatu masalah.',
      'Sebelum menulis kode program, programmer merancangku dalam bentuk pseudocode atau flowchart.',
    ],
    islamicNote: 'Peradaban Islam melahirkan fondasi ilmu komputasi modern melalui karya Al-Khawarizmi.',
  },
  {
    id: 'c3',
    topic: 'Perangkat Keras',
    answer: 'SSD',
    acceptedAliases: ['SSD', 'SOLID STATE DRIVE'],
    clues: [
      'Aku adalah media penyimpanan data permanen yang jauh lebih cepat dari piringan cakram lama.',
      'Aku tidak memiliki komponen mekanis yang berputar sehingga tahan guncangan.',
      'Singkatanku terdiri dari 3 huruf: Solid State Drive.',
    ],
    islamicNote: 'Menyimpan ilmu dan catatan secara rapi membantu keberlanjutan belajar.',
  },
  {
    id: 'c4',
    topic: 'Literasi Digital',
    answer: 'TABAYYUN',
    acceptedAliases: ['TABAYYUN'],
    clues: [
      'Aku adalah sikap bijak saat menerima informasi viral di media sosial.',
      'Aku mendorong siswa mengecek sumber resmi, tanggal terbit, dan kebenaran fakta.',
      'Istilah Islami ini berasal dari Al-Quran Surat Al-Hujurat ayat 6 (8 huruf, diawali T).',
    ],
    islamicNote: 'Tabayyun menjaga persaudaraan umat dari fitnah dan berita bohong.',
  },
  {
    id: 'c5',
    topic: 'Jaringan & Internet',
    answer: 'HTML',
    acceptedAliases: ['HTML', 'HYPERTEXT MARKUP LANGUAGE'],
    clues: [
      'Aku adalah bahasa standar pembentuk struktur kerangka halaman web.',
      'Aku menggunakan tag pembuka dan penutup seperti <h1> dan <p>.',
      'Singkatanku 4 huruf: HyperText Markup Language.',
    ],
    islamicNote: 'Struktur yang baik membuat informasi bermanfaat lebih mudah dibaca semua orang.',
  },
  {
    id: 'c6',
    topic: 'Keamanan Siber',
    answer: 'BACKUP',
    acceptedAliases: ['BACKUP', 'CADANGAN'],
    clues: [
      'Aku adalah kebiasaan rutin menyalin file penting ke media lain atau cloud.',
      'Tujuanku agar tugas sekolah tidak hilang jika laptop tiba-tiba rusak atau terkena ransomware.',
      'Istilah bahasa Inggrisnya 6 huruf, diawali B dan diakhiri P.',
    ],
    islamicNote: 'Ikhtiar dan antisipasi sebelum musibah terjadi adalah wujud ikhtiar tawakal.',
  },
  {
    id: 'c7',
    topic: 'Dasar Pemrograman',
    answer: 'VARIABEL',
    acceptedAliases: ['VARIABEL', 'VARIABLE'],
    clues: [
      'Aku berfungsi seperti wadah bernama di memori komputer untuk menyimpan nilai data.',
      'Isiku bisa berubah-ubah selama program dijalankan, misalnya skor = 100.',
      'Namaku dalam bahasa Indonesia berjumlah 8 huruf, diawali V dan diakhiri L.',
    ],
    islamicNote: 'Menata informasi pada tempat yang tepat mencerminkan kedisiplinan berpikir.',
  },
  {
    id: 'c8',
    topic: 'Jaringan & Internet',
    answer: 'BROWSER',
    acceptedAliases: ['BROWSER', 'PERAMBAN'],
    clues: [
      'Aku adalah aplikasi yang kamu buka setiap kali ingin mengunjungi website.',
      'Contoh populerku antara lain Chrome, Firefox, Edge, dan Safari.',
      'Namaku dalam bahasa Inggris berjumlah 7 huruf, diawali B dan diakhiri R.',
    ],
    islamicNote: 'Gunakan peramban internet untuk mencari ilmu yang bermanfaat dan menjaga pandangan.',
  },
  {
    id: 'c9',
    topic: 'Keamanan Siber',
    answer: 'ENKRIPSI',
    acceptedAliases: ['ENKRIPSI', 'ENCRYPTION'],
    clues: [
      'Aku mengubah pesan asli menjadi kode sandi acak yang tidak bisa dibaca orang lain.',
      'Hanya penerima yang memiliki kunci pembuka yang dapat membaca pesan tersebut.',
      'Namaku berjumlah 8 huruf, diawali huruf E dan diakhiri I.',
    ],
    islamicNote: 'Menjaga kerahasiaan pesan amanah melindungi privasi antar sesama.',
  },
];

export const CROSSWORD_WORDS: CrosswordWord[] = [
  {
    number: 1,
    direction: 'across',
    answer: 'ALGORITMA',
    row: 1,
    col: 1,
    clue: 'Urutan langkah logis dan terstruktur untuk menyelesaikan masalah pemrograman',
  },
  {
    number: 2,
    direction: 'down',
    answer: 'AMANAH',
    row: 1,
    col: 1,
    clue: 'Sikap Islami menjaga kerahasiaan kata sandi dan data pribadi orang lain',
  },
  {
    number: 3,
    direction: 'down',
    answer: 'ROUTER',
    row: 1,
    col: 5,
    clue: 'Perangkat jaringan yang menghubungkan jaringan lokal ke internet',
  },
  {
    number: 4,
    direction: 'down',
    answer: 'MODEM',
    row: 1,
    col: 8,
    clue: 'Pengubah sinyal digital menjadi analog dan sebaliknya untuk koneksi internet',
  },
  {
    number: 5,
    direction: 'across',
    answer: 'RAM',
    row: 6,
    col: 5,
    clue: 'Memori sementara komputer saat menjalankan aplikasi',
  },
  {
    number: 6,
    direction: 'down',
    answer: 'MEDIA',
    row: 6,
    col: 7,
    clue: 'Sarana penyampai informasi teks, gambar, dan video digital',
  },
  {
    number: 7,
    direction: 'across',
    answer: 'CLOUD',
    row: 8,
    col: 3,
    clue: 'Teknologi penyimpanan data daring berbasis internet (komputasi awan)',
  },
  {
    number: 8,
    direction: 'down',
    answer: 'CPU',
    row: 8,
    col: 3,
    clue: 'Otak pemroses utama pada perangkat keras komputer',
  },
];

export const ALGORITHM_CHALLENGES: AlgorithmChallenge[] = [
  {
    id: 'algo-1',
    title: 'Algoritma Tabayyun Digital Sebelum Share Info',
    context: 'Susun langkah alur berpikir komputasional yang benar saat menerima berita berantai di grup kelas:',
    correctOrder: [
      '1. Mulai: Terima pesan informasi baru di grup',
      '2. Baca isi pesan secara utuh dan periksa sumber resminya',
      '3. Cek kondisi: Apakah berita terbukti benar dan bermanfaat?',
      '4. Jika benar -> Bagikan dengan sumber jelas; Jika hoaks -> Hentikan & klarifikasi',
      '5. Selesai: Jaga grup tetap aman dan kondusif',
    ],
  },
  {
    id: 'algo-2',
    title: 'Algoritma Login Aman Portal Sekolah',
    context: 'Urutkan proses autentikasi pengguna yang aman pada sistem informasi sekolah:',
    correctOrder: [
      '1. Mulai: Pastikan alamat situs diawali HTTPS://',
      '2. Input NIS/Email sekolah dan kata sandi rahasia',
      '3. Sistem memeriksa kecocokan data pada database',
      '4. Verifikasi OTP (2FA) apabila diminta sistem',
      '5. Selesai: Masuk ke dasbor belajar & ingat logout setelah selesai',
    ],
  },
  {
    id: 'algo-3',
    title: 'Algoritma Membuat Kata Sandi Aman & Unik',
    context: 'Susun urutan langkah membuat dan mengamankan akun pelajar secara berurutan:',
    correctOrder: [
      '1. Mulai: Tentukan layanan atau portal sekolah yang ingin didaftarkan',
      '2. Rangkai minimal 10 karakter kombinasi huruf besar, kecil, angka, dan simbol',
      '3. Hindari penggunaan tanggal lahir atau nama pribadi yang mudah ditebak',
      '4. Aktifkan verifikasi 2FA (OTP) pada pengaturan keamanan akun',
      '5. Selesai: Simpan pengingat secara aman dan jangan bagikan ke orang lain',
    ],
  },
  {
    id: 'algo-4',
    title: 'Algoritma Mengirim Tugas Digital dengan Etika Akademik',
    context: 'Urutkan langkah menyusun hingga mengumpulkan tugas karya tulis TIK:',
    correctOrder: [
      '1. Mulai: Pahami instruksi tugas dan tema materi dari guru',
      '2. Kumpulkan referensi terpercaya dan catat sumber penulis aslinya',
      '3. Susun tulisan dengan bahasa sendiri serta cantumkan sitasi sumber',
      '4. Periksa ulang format file dan nama lengkap sebelum diunggah',
      '5. Selesai: Kirim tugas tepat waktu sebelum batas pengumpulan berakhir',
    ],
  },
];

export const RACING_QUESTIONS: RacingQuestion[] = [
  {
    id: 'r1',
    topic: 'Perangkat Keras',
    question: 'Perangkat yang digunakan untuk menampilkan antarmuka visual komputer adalah...',
    options: ['Monitor', 'Scanner', 'Microphone', 'Modem'],
    correctIndex: 0,
  },
  {
    id: 'r2',
    topic: 'Dasar Pemrograman',
    question: 'Dalam Scratch atau Python, blok perintah yang mengulang aksi berkali-kali disebut...',
    options: ['Loop', 'Input', 'Print', 'Break'],
    correctIndex: 0,
  },
  {
    id: 'r3',
    topic: 'Keamanan Siber',
    question: 'Kombinasi kata sandi yang paling kuat terdiri atas...',
    options: [
      'Tanggal lahir siswa saja',
      'Huruf besar, kecil, angka, dan simbol',
      'Nama panggilan sekolah',
      'Angka berurutan 12345678',
    ],
    correctIndex: 1,
  },
  {
    id: 'r4',
    topic: 'Jaringan & Internet',
    question: 'Satuan dasar kecepatan transfer data internet umumnya diukur dalam...',
    options: ['Mbps', 'Kilogram', 'Pixel', 'Hertz'],
    correctIndex: 0,
  },
  {
    id: 'r5',
    topic: 'Adab Digital & Literasi',
    question: 'Saat berdiskusi di forum kelas daring, etika berkomunikasi (netiket) yang baik adalah...',
    options: [
      'Mengetik dengan huruf kapital semua',
      'Menggunakan salam dan bahasa yang santun',
      'Mengirim spam stiker terus-menerus',
      'Menyela penjelasan teman dengan ejekan',
    ],
    correctIndex: 1,
  },
  {
    id: 'r6',
    topic: 'Dasar Pemrograman',
    question: 'Bilangan biner yang digunakan komputer untuk memproses seluruh data hanya terdiri atas angka...',
    options: ['0 dan 1', '1 sampai 9', '0 sampai 7', 'A sampai F'],
    correctIndex: 0,
  },
  {
    id: 'r7',
    topic: 'Aplikasi Produktivitas',
    question: 'Rumus dasar di Spreadsheet (Excel/Sheets) untuk menjumlahkan rentang sel A1 sampai A5 adalah...',
    options: ['=SUM(A1:A5)', '=AVG(A1:A5)', '=COUNT(A1:A5)', '=MAX(A1:A5)'],
    correctIndex: 0,
  },
  {
    id: 'r8',
    topic: 'Keamanan Siber',
    question: 'Jika menemukan file mencurigakan berekstensi .exe dari pengirim tidak dikenal, tindakan paling tepat adalah...',
    options: [
      'Langsung membukanya untuk melihat isi',
      'Meneruskannya ke teman sekelas',
      'Tidak membukanya dan melaporkannya ke guru TIK',
      'Menyimpannya di folder tugas',
    ],
    correctIndex: 2,
  },
  {
    id: 'r9',
    topic: 'Jaringan & Internet',
    question: 'Perangkat lunak yang digunakan untuk mengakses halaman web di internet disebut...',
    options: ['Web Browser', 'Spreadsheet', 'Compiler', 'Antivirus'],
    correctIndex: 0,
  },
  {
    id: 'r10',
    topic: 'Perangkat Keras',
    question: 'Memori sementara yang menyimpan data aplikasi saat komputer aktif (hilang saat mati) adalah...',
    options: ['RAM', 'SSD', 'Flashdisk', 'DVD-ROM'],
    correctIndex: 0,
  },
  {
    id: 'r11',
    topic: 'Dasar Pemrograman',
    question: 'Kesalahan logika atau penulisan kode dalam program komputer disebut...',
    options: ['Bug', 'Pixel', 'Cache', 'Server'],
    correctIndex: 0,
  },
  {
    id: 'r12',
    topic: 'Adab Digital & Literasi',
    question: 'Jejak aktivitas, unggahan, dan komentar seseorang di internet yang tersimpan lama disebut...',
    options: ['Jejak Digital', 'Alamat MAC', 'Bandwidth', 'Resolution'],
    correctIndex: 0,
  },
  {
    id: 'r13',
    topic: 'Perangkat Keras',
    question: 'Komponen utama komputer yang bertugas mengeksekusi seluruh instruksi program (otak komputer) adalah...',
    options: ['CPU (Processor)', 'Power Supply', 'Printer', 'Projector'],
    correctIndex: 0,
  },
  {
    id: 'r14',
    topic: 'Perangkat Keras',
    question: 'Perangkat keras yang mengubah dokumen kertas fisik menjadi gambar digital ke dalam komputer adalah...',
    options: ['Scanner', 'Speaker', 'Plotter', 'Monitor'],
    correctIndex: 0,
  },
  {
    id: 'r15',
    topic: 'Jaringan & Internet',
    question: 'Protokol keamanan web yang mengenkripsi pertukaran data antara browser dan server ditandai dengan...',
    options: ['HTTPS', 'HTTP', 'FTP', 'HTML'],
    correctIndex: 0,
  },
  {
    id: 'r16',
    topic: 'Jaringan & Internet',
    question: 'Alamat numerik unik yang dimiliki setiap perangkat saat terhubung ke jaringan internet disebut...',
    options: ['IP Address', 'URL File', 'Bookmark', 'Cookie'],
    correctIndex: 0,
  },
  {
    id: 'r17',
    topic: 'Keamanan Siber',
    question: 'Metode keamanan tambahan menggunakan kode OTP setelah memasukkan kata sandi disebut...',
    options: ['2FA (Two-Factor Authentication)', 'Auto-Fill', 'Incognito Mode', 'Screen Saver'],
    correctIndex: 0,
  },
  {
    id: 'r18',
    topic: 'Keamanan Siber',
    question: 'Tindakan penipuan digital dengan menyamar sebagai lembaga resmi untuk mencuri akun atau data disebut...',
    options: ['Phishing', 'Rendering', 'Streaming', 'Debugging'],
    correctIndex: 0,
  },
  {
    id: 'r19',
    topic: 'Dasar Pemrograman',
    question: 'Urutan langkah logis yang sistematis dan terstruktur untuk menyelesaikan suatu masalah disebut...',
    options: ['Algoritma', 'Wallpaper', 'Hardware', 'Shortcut'],
    correctIndex: 0,
  },
  {
    id: 'r20',
    topic: 'Dasar Pemrograman',
    question: 'Dalam pemrograman, wadah bernama yang digunakan untuk menyimpan nilai data yang dapat berubah disebut...',
    options: ['Variabel', 'Monitor', 'Driver', 'Router'],
    correctIndex: 0,
  },
  {
    id: 'r21',
    topic: 'Dasar Pemrograman',
    question: 'Struktur percabangan logika untuk mengambil keputusan berdasarkan kondisi benar atau salah memakai kata kunci...',
    options: ['If - Else', 'Copy - Paste', 'Undo - Redo', 'Save - Load'],
    correctIndex: 0,
  },
  {
    id: 'r22',
    topic: 'Aplikasi Produktivitas',
    question: 'Fungsi di Microsoft Excel atau Google Sheets untuk menghitung nilai rata-rata dari sekumpulan angka adalah...',
    options: ['=AVERAGE()', '=SUM()', '=MIN()', '=COUNTIF()'],
    correctIndex: 0,
  },
  {
    id: 'r23',
    topic: 'Aplikasi Produktivitas',
    question: 'Kombinasi tombol pintas keyboard untuk membatalkan tindakan terakhir (Undo) adalah...',
    options: ['Ctrl + Z', 'Ctrl + C', 'Ctrl + P', 'Ctrl + S'],
    correctIndex: 0,
  },
  {
    id: 'r24',
    topic: 'Aplikasi Produktivitas',
    question: 'Format file dokumen yang umum dipakai agar tata letak tidak berubah saat dibuka di berbagai perangkat adalah...',
    options: ['PDF', 'MP3', 'EXE', 'WAV'],
    correctIndex: 0,
  },
  {
    id: 'r25',
    topic: 'Adab Digital & Literasi',
    question: 'Sikap memeriksa kebenaran sumber berita sebelum meneruskannya di media sosial sejalan dengan prinsip Islam...',
    options: ['Tabayyun', 'Ghibah', 'Takabur', 'Israf'],
    correctIndex: 0,
  },
  {
    id: 'r26',
    topic: 'Adab Digital & Literasi',
    question: 'Menyebutkan nama penulis atau sumber saat mengutip artikel internet untuk tugas sekolah mencerminkan sikap...',
    options: ['Amanah & Anti-Plagiarisme', 'Spamming', 'Clickbait', 'Hoaks'],
    correctIndex: 0,
  },
  {
    id: 'r27',
    topic: 'Perangkat Lunak',
    question: 'Perangkat lunak utama yang mengelola seluruh perangkat keras komputer dan menjadi wadah bagi aplikasi lain adalah...',
    options: ['Sistem Operasi (OS)', 'Pengolah Kata', 'Peramban Web', 'Pemutar Media'],
    correctIndex: 0,
  },
  {
    id: 'r28',
    topic: 'Teknologi Modern',
    question: 'Layanan penyimpanan dan pemrosesan data melalui server internet tanpa harus memenuhi memori lokal disebut...',
    options: ['Cloud Computing', 'Defragmentasi', 'Bluetooth', 'Infrared'],
    correctIndex: 0,
  },
];

export const GENERAL_QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'gq1',
    type: 'mcq',
    topic: 'Wawasan Kebangsaan',
    question: 'Semboyan nasional Indonesia "Bhinneka Tunggal Ika" yang berarti berbeda-beda tetapi tetap satu jua diambil dari kitab...',
    options: ['Kitab Sutasoma karya Mpu Tantular', 'Kitab Negarakertagama karya Mpu Prapanca', 'Kitab Bharatayuddha', 'Kitab Pararaton'],
    correctIndex: 0,
    islamicValue: 'Persaudaraan dalam keberagaman selaras dengan nilai ukhuwah wathaniyah.',
    explanation: 'Bhinneka Tunggal Ika berasal dari kakawin Sutasoma yang ditulis oleh Mpu Tantular pada masa Kerajaan Majapahit.',
  },
  {
    id: 'gq2',
    type: 'mcq',
    topic: 'Sains Remaja',
    question: 'Proses tumbuhan hijau mengubah air dan karbon dioksida menjadi glukosa dan oksigen dengan bantuan cahaya matahari disebut...',
    options: ['Respirasi', 'Fotosintesis', 'Transpirasi', 'Fermentasi'],
    correctIndex: 1,
    islamicValue: 'Keseimbangan alam ciptaan Allah SWT patut dijaga dan disyukuri.',
    explanation: 'Fotosintesis berlangsung pada klorofil daun untuk menghasilkan energi makanan dan oksigen.',
  },
  {
    id: 'gq3',
    type: 'tf',
    topic: 'Sejarah Islam & Nusantara',
    question: 'Benar atau Salah: Ilmuwan muslim Al-Khawarizmi dikenal sebagai Bapak Aljabar sekaligus tokoh yang namanya menjadi asal kata "Algoritma".',
    options: ['Benar', 'Salah'],
    correctIndex: 0,
    islamicValue: 'Meneladani semangat keilmuan cendekiawan muslim klasik.',
    explanation: 'Benar! Karya Muhammad ibn Musa al-Khawarizmi meletakkan dasar aljabar dan metode perhitungan sistematis (algoritma).',
  },
  {
    id: 'gq4',
    type: 'mcq',
    topic: 'Logika Remaja',
    question: 'Perhatikan pola bilangan: 2, 6, 12, 20, 30, ... Bilangan selanjutnya pada deret tersebut adalah...',
    options: ['38', '40', '42', '44'],
    correctIndex: 2,
    islamicValue: 'Ketelitian berpikir logis melatih kecermatan dalam mengambil keputusan.',
    explanation: 'Selisih antar suku bertambah 2 secara berurutan (+4, +6, +8, +10, +12), sehingga 30 + 12 = 42.',
  },
  {
    id: 'gq5',
    type: 'mcq',
    topic: 'Wawasan Kebangsaan',
    question: 'Organisasi pergerakan nasional pertama di Indonesia yang didirikan pada tanggal 20 Mei 1908 dan diperingati sebagai Hari Kebangkitan Nasional adalah...',
    options: ['Sarekat Islam', 'Budi Utomo', 'Indische Partij', 'Perhimpunan Indonesia'],
    correctIndex: 1,
    islamicValue: 'Semangat persatuan dan pendidikan mengangkat martabat bangsa.',
    explanation: 'Budi Utomo didirikan oleh Dr. Sutomo dan mahasiswa STOVIA pada 20 Mei 1908.',
  },
  {
    id: 'gq6',
    type: 'mcq',
    topic: 'Sains Remaja',
    question: 'Planet di tata surya kita yang memiliki cincin paling mencolok tersusun dari partikel es dan batuan adalah...',
    options: ['Jupiter', 'Uranus', 'Saturnus', 'Neptunus'],
    correctIndex: 2,
    islamicValue: 'Keteraturan orbit planet menunjukkan kebesaran Sang Pencipta alam semesta.',
    explanation: 'Saturnus memiliki sistem cincin terbesar dan paling terang di tata surya.',
  },
  {
    id: 'gq7',
    type: 'mcq',
    topic: 'Wawasan Kebangsaan',
    question: 'Peristiwa Sumpah Pemuda yang mengikrarkan satu nusa, satu bangsa, dan satu bahasa terjadi pada tanggal...',
    options: ['28 Oktober 1928', '17 Agustus 1945', '10 November 1945', '1 Juni 1945'],
    correctIndex: 0,
    islamicValue: 'Persatuan pemuda melampaui suku dan daerah demi kemaslahatan bangsa.',
    explanation: 'Kongres Pemuda II tanggal 28 Oktober 1928 melahirkan ikrar Sumpah Pemuda.',
  },
  {
    id: 'gq8',
    type: 'mcq',
    topic: 'Sains Remaja',
    question: 'Benda langit yang menjadi pusat tata surya dan memancarkan energi cahaya serta panas sendiri adalah...',
    options: ['Matahari', 'Bulan', 'Mars', 'Komet'],
    correctIndex: 0,
    islamicValue: 'Matahari beredar menurut perhitungan yang tepat sesuai ketetapan Allah SWT.',
    explanation: 'Matahari adalah bintang pusat tata surya yang mengikat planet-planet melalui gravitasi.',
  },
  {
    id: 'gq9',
    type: 'tf',
    topic: 'Logika Remaja',
    question: 'Benar atau Salah: Jika semua bilangan genap habis dibagi 2, dan 18 adalah bilangan genap, maka 18 habis dibagi 2.',
    options: ['Benar', 'Salah'],
    correctIndex: 0,
    islamicValue: 'Silogisme logika membantu menarik kesimpulan yang valid dan adil.',
    explanation: 'Benar! Penalaran deduktif menyatakan 18 habis dibagi 2 dengan hasil 9.',
  },
  {
    id: 'gq10',
    type: 'mcq',
    topic: 'Sejarah Islam & Nusantara',
    question: 'Ilmuwan muslim abad ke-10 yang menulis kitab Al-Manazir dan dijuluki Bapak Optik Modern karena penemuan prinsip kamera obscura adalah...',
    options: ['Ibnu Al-Haytham', 'Ibnu Sina', 'Al-Biruni', 'Jabir bin Hayyan'],
    correctIndex: 0,
    islamicValue: 'Riset ilmiah dan observasi empiris adalah warisan gemilang peradaban Islam.',
    explanation: 'Ibnu Al-Haytham (Alhazen) merintis metode ilmiah modern melalui eksperimen cahaya dan optik.',
  },
];

export const GENERAL_CLUE_CARDS: ClueCard[] = [
  {
    id: 'gc1',
    topic: 'Wawasan Kebangsaan',
    answer: 'PANCASILA',
    acceptedAliases: ['PANCASILA'],
    clues: [
      'Aku adalah dasar negara Republik Indonesia yang terdiri dari lima sila.',
      'Nama resmiku diusulkan oleh Ir. Soekarno pada sidang BPUPKI tanggal 1 Juni 1945.',
      'Sila pertamaku berbunyi Ketuhanan Yang Maha Esa (9 huruf, diawali P).',
    ],
    islamicNote: 'Sila pertama meneguhkan nilai ketuhanan sebagai landasan moral berbangsa.',
  },
  {
    id: 'gc2',
    topic: 'Sains Remaja',
    answer: 'GRAVITASI',
    acceptedAliases: ['GRAVITASI', 'GAYA GRAVITASI'],
    clues: [
      'Aku adalah gaya tarik-menarik antar benda bermassa di alam semesta.',
      'Akulah yang membuat buah jatuh ke bumi dan bulan tetap mengorbit bumi.',
      'Konsepku dirumuskan secara matematis oleh Sir Isaac Newton (9 huruf, diawali G).',
    ],
    islamicNote: 'Hukum fisika alam semesta merupakan sunnatullah yang teratur.',
  },
  {
    id: 'gc3',
    topic: 'Sejarah & Tokoh',
    answer: 'HABIBIE',
    acceptedAliases: ['HABIBIE', 'BJ HABIBIE'],
    clues: [
      'Aku adalah Presiden ke-3 Republik Indonesia yang sangat ahli di bidang dirgantara.',
      'Aku dijuluki "Mr. Crack" karena menemukan teori keretakan struktur pesawat terbang.',
      'Nama belakangku diabadikan sebagai nama universitas dan pesawat N250 (7 huruf, diawali H).',
    ],
    islamicNote: 'Kecerdasan intelektual yang dipadukan dengan iman dan takwa melahirkan teladan bangsa.',
  },
  {
    id: 'gc4',
    topic: 'Sains Remaja',
    answer: 'KLOROFIL',
    acceptedAliases: ['KLOROFIL', 'ZAT HIJAU DAUN'],
    clues: [
      'Aku adalah pigmen alami yang memberi warna khas pada sebagian besar daun tumbuhan.',
      'Aku berperan menyerap energi cahaya matahari saat proses fotosintesis.',
      'Namaku dalam istilah biologi berjumlah 8 huruf dan diawali huruf K.',
    ],
    islamicNote: 'Tumbuhan berkhidmat menyediakan oksigen bagi seluruh makhluk hidup.',
  },
  {
    id: 'gc5',
    topic: 'Sejarah Islam',
    answer: 'KHATIB',
    acceptedAliases: ['KHATIB', 'AL KHAWARIZMI', 'IBNU SINA'],
    clues: [
      'Ganti: Aku adalah tokoh ilmuwan kedokteran muslim penulis buku Qanun fi at-Tibb.',
      'Di dunia Barat aku dikenal dengan nama Avicenna.',
      'Namaku terdiri dari 2 kata: IBNU ____ (4 huruf di kata kedua).',
    ],
    islamicNote: 'Menjaga kesehatan fisik dan akal merupakan amanah besar dalam Islam.',
  },
  {
    id: 'gc6',
    topic: 'Wawasan Kebangsaan',
    answer: 'GARUDA',
    acceptedAliases: ['GARUDA', 'GARUDA PANCASILA'],
    clues: [
      'Aku adalah burung mitologi yang menjadi lambang negara Republik Indonesia.',
      'Di dadaku terdapat perisai berisi lima simbol sila Pancasila.',
      'Cakarku mencengkeram pita bertuliskan Bhinneka Tunggal Ika (6 huruf, diawali G).',
    ],
    islamicNote: 'Semangat menjaga keutuhan bangsa berlandaskan akhlak dan keadilan.',
  },
];

export const GENERAL_RACING_QUESTIONS: RacingQuestion[] = [
  {
    id: 'gr1',
    topic: 'Wawasan Kebangsaan',
    question: 'Lagu kebangsaan Indonesia Raya pertama kali dikumandangkan secara instrumental pada peristiwa...',
    options: ['Sumpah Pemuda 1928', 'Konferensi Meja Bundar', 'Peristiwa Rengasdengklok', 'Bandung Lautan Api'],
    correctIndex: 0,
  },
  {
    id: 'gr2',
    topic: 'Sains Remaja',
    question: 'Gas terbanyak di atmosfer bumi yang menyusun sekitar 78% komposisi udara adalah...',
    options: ['Nitrogen', 'Oksigen', 'Karbon Dioksida', 'Argon'],
    correctIndex: 0,
  },
  {
    id: 'gr3',
    topic: 'Sejarah Islam',
    question: 'Perpustakaan dan pusat penerjemahan ilmu pengetahuan terbesar pada masa Dinasti Abbasiyah di Baghdad bernama...',
    options: ['Baitul Hikmah', 'Al-Azhar', 'Qairawan', 'Cordoba'],
    correctIndex: 0,
  },
  {
    id: 'gr4',
    topic: 'Logika Remaja',
    question: 'Jika semua siswa kelas VII wajib mengikuti pramuka, dan Zaid adalah siswa kelas VII, maka...',
    options: ['Zaid wajib mengikuti pramuka', 'Zaid tidak perlu ikut pramuka', 'Hanya ketua kelas yang wajib', 'Tidak dapat disimpulkan'],
    correctIndex: 0,
  },
  {
    id: 'gr5',
    topic: 'Wawasan Kebangsaan',
    question: 'Benua terluas di permukaan bumi sekaligus tempat berdirinya negara Indonesia adalah...',
    options: ['Asia', 'Afrika', 'Amerika', 'Eropa'],
    correctIndex: 0,
  },
  {
    id: 'gr6',
    topic: 'Sains Remaja',
    question: 'Alat ukur yang digunakan untuk mengetahui besar suhu suatu ruangan atau tubuh manusia adalah...',
    options: ['Termometer', 'Barometer', 'Anemometer', 'Higrometer'],
    correctIndex: 0,
  },
  {
    id: 'gr7',
    topic: 'Logika Remaja',
    question: 'Sebuah jam menunjukkan pukul 07.15. Jika 45 menit lagi bel istirahat berbunyi, maka bel berbunyi pukul...',
    options: ['08.00', '07.50', '08.15', '07.45'],
    correctIndex: 0,
  },
  {
    id: 'gr8',
    topic: 'Sejarah Nusantara',
    question: 'Teks Proklamasi Kemerdekaan Indonesia tanggal 17 Agustus 1945 diketik menggunakan mesin tik oleh...',
    options: ['Sayuti Melik', 'Mohammad Hatta', 'Ahmad Subardjo', 'Sukarni'],
    correctIndex: 0,
  },
  {
    id: 'gr9',
    topic: 'Sains Remaja',
    question: 'Perubahan wujud benda dari gas langsung menjadi padat (seperti pembentukan salju) disebut...',
    options: ['Mengkristal (Deposisi)', 'Menyublim', 'Mengembun', 'Mencair'],
    correctIndex: 0,
  },
  {
    id: 'gr10',
    topic: 'Wawasan Kebangsaan',
    question: 'Ibu kota Negara Kesatuan Republik Indonesia saat proklamasi kemerdekaan tahun 1945 adalah...',
    options: ['Jakarta', 'Bandung', 'Surabaya', 'Medan'],
    correctIndex: 0,
  },
  {
    id: 'gr11',
    topic: 'Logika Remaja',
    question: 'Jika 3 buku tulis berharga Rp15.000, maka harga 5 buku tulis yang sama adalah...',
    options: ['Rp25.000', 'Rp20.000', 'Rp30.000', 'Rp18.000'],
    correctIndex: 0,
  },
  {
    id: 'gr12',
    topic: 'Sejarah Islam',
    question: 'Tokoh penjelajah muslim asal Maroko yang mengelilingi dunia selama hampir 30 tahun pada abad ke-14 adalah...',
    options: ['Ibnu Battuta', 'Al-Idrisi', 'Al-Kindi', 'Al-Farabi'],
    correctIndex: 0,
  },
  {
    id: 'gr13',
    topic: 'Wawasan Kebangsaan',
    question: 'Semboyan yang tertulis pada pita yang dicengkeram oleh burung Garuda Pancasila adalah...',
    options: ['Bhinneka Tunggal Ika', 'Tut Wuri Handayani', 'Gemah Ripah Loh Jinawi', 'Satyaku Kudarmakan'],
    correctIndex: 0,
  },
  {
    id: 'gr14',
    topic: 'Wawasan Kebangsaan',
    question: 'Konstitusi tertulis tertinggi yang menjadi landasan hukum negara Republik Indonesia adalah...',
    options: ['UUD Negara RI Tahun 1945', 'Piagam Jakarta', 'Dekrit Presiden', 'Peraturan Daerah'],
    correctIndex: 0,
  },
  {
    id: 'gr15',
    topic: 'Sains Remaja',
    question: 'Organ tubuh manusia yang berfungsi memompa darah kaya oksigen ke seluruh jaringan tubuh adalah...',
    options: ['Jantung', 'Ginjal', 'Lambung', 'Pankreas'],
    correctIndex: 0,
  },
  {
    id: 'gr16',
    topic: 'Sains Remaja',
    question: 'Satuan Internasional (SI) yang digunakan untuk mengukur besaran gaya fisika adalah...',
    options: ['Newton', 'Watt', 'Volt', 'Pascal'],
    correctIndex: 0,
  },
  {
    id: 'gr17',
    topic: 'Sains Remaja',
    question: 'Proses penguapan air dari permukaan laut dan daratan ke atmosfer dalam siklus air disebut...',
    options: ['Evaporasi', 'Kondensasi', 'Presipitasi', 'Infiltrasi'],
    correctIndex: 0,
  },
  {
    id: 'gr18',
    topic: 'Sejarah Islam',
    question: 'Ilmuwan muslim penulis ensiklopedia kedokteran Al-Qanun fi at-Tibb yang berpengaruh di Eropa adalah...',
    options: ['Ibnu Sina', 'Ibnu Khaldun', 'Al-Biruni', 'Al-Kindi'],
    correctIndex: 0,
  },
  {
    id: 'gr19',
    topic: 'Sejarah Nusantara',
    question: 'Bapak Pendidikan Nasional Indonesia yang mencetuskan semboyan "Ing Ngarsa Sung Tuladha" adalah...',
    options: ['Ki Hajar Dewantara', 'K.H. Ahmad Dahlan', 'Mohammad Natsir', 'Dr. Wahidin Sudirohusodo'],
    correctIndex: 0,
  },
  {
    id: 'gr20',
    topic: 'Sejarah Nusantara',
    question: 'Pertempuran heroik 10 November 1945 yang diperingati setiap tahun sebagai Hari Pahlawan terjadi di kota...',
    options: ['Surabaya', 'Semarang', 'Medan', 'Makassar'],
    correctIndex: 0,
  },
  {
    id: 'gr21',
    topic: 'Logika Remaja',
    question: 'Berapakah hasil dari operasi hitung campuran: 12 + 8 x 3 - 6?',
    options: ['30', '54', '24', '36'],
    correctIndex: 0,
  },
  {
    id: 'gr22',
    topic: 'Logika Remaja',
    question: 'Bilangan prima terkecil yang juga merupakan satu-satunya bilangan prima genap adalah...',
    options: ['2', '1', '3', '4'],
    correctIndex: 0,
  },
  {
    id: 'gr23',
    topic: 'Logika Remaja',
    question: 'Sebuah persegi panjang memiliki panjang 14 cm dan lebar 6 cm. Luas persegi panjang tersebut adalah...',
    options: ['84 cm²', '40 cm²', '20 cm²', '72 cm²'],
    correctIndex: 0,
  },
  {
    id: 'gr24',
    topic: 'Geografi Dunia',
    question: 'Samudra terluas di permukaan bumi yang berada di antara Asia, Australia, dan Amerika adalah...',
    options: ['Samudra Pasifik', 'Samudra Atlantik', 'Samudra Hindia', 'Samudra Arktik'],
    correctIndex: 0,
  },
  {
    id: 'gr25',
    topic: 'Geografi Nusantara',
    question: 'Garis khayal astronomis yang membelah bumi menjadi belahan utara dan selatan serta melintasi Kota Pontianak adalah...',
    options: ['Garis Khatulistiwa (Ekuator)', 'Garis Bujur Timur', 'Garis Wallace', 'Garis Weber'],
    correctIndex: 0,
  },
  {
    id: 'gr26',
    topic: 'Sains Remaja',
    question: 'Energi listrik pada panel surya dihasilkan dengan memanfaatkan sumber energi terbarukan berupa...',
    options: ['Cahaya Matahari', 'Batu Bara', 'Gas Alam', 'Minyak Bumi'],
    correctIndex: 0,
  },
  {
    id: 'gr27',
    topic: 'Sejarah Islam',
    question: 'Masjid yang merupakan kiblat pertama umat Islam sekaligus tempat Isra Miraj Nabi Muhammad SAW adalah...',
    options: ['Masjid Al-Aqsa', 'Masjid Quba', 'Masjid Cordoba', 'Masjid Agung Demak'],
    correctIndex: 0,
  },
  {
    id: 'gr28',
    topic: 'Logika Remaja',
    question: 'Jika hari ini adalah hari Selasa, maka 10 hari lagi adalah hari...',
    options: ['Jumat', 'Kamis', 'Sabtu', 'Rabu'],
    correctIndex: 0,
  },
];

function mapCustomToQuiz(cq: CustomQuestion): QuizQuestion {
  return {
    id: cq.id,
    type: (cq.options?.length || 4) === 2 ? 'tf' : 'mcq',
    topic: cq.topic,
    question: cq.question,
    options: cq.options || ['Benar', 'Salah'],
    correctIndex: cq.correctIndex ?? 0,
    islamicValue: 'Integrasi ilmu pengetahuan dan adab mulia SMP IT Al Mumtaz YPII.',
    explanation: cq.explanation || 'Soal khusus yang disusun oleh Guru TIK.',
  };
}

function mapCustomToRacing(cq: CustomQuestion): RacingQuestion {
  return {
    id: cq.id,
    topic: cq.topic,
    question: cq.question,
    options: cq.options || ['Benar', 'Salah'],
    correctIndex: cq.correctIndex ?? 0,
  };
}

function mapCustomToClue(cq: CustomQuestion): ClueCard {
  const ans = (cq.answer || 'TIK').toUpperCase();
  return {
    id: cq.id,
    topic: cq.topic,
    answer: ans,
    acceptedAliases: [ans],
    clues: cq.clues || [
      `Petunjuk 1 tentang ${cq.topic}.`,
      `Petunjuk 2 terkait istilah ${ans[0]}...`,
      `Terdiri atas ${ans.length} huruf.`,
    ],
    islamicNote: cq.explanation || 'Soal kustom Guru TIK SMP IT Al Mumtaz YPII.',
  };
}

export function getQuizQuestions(
  category: QuestionCategory,
  seed?: string,
  customQuestions: CustomQuestion[] = [],
  limit = 8
): QuizQuestion[] {
  const extraTik = customQuestions
    .filter((q) => q.targetGame === 'quiz' && q.category === 'tik')
    .map(mapCustomToQuiz);
  const extraUmum = customQuestions
    .filter((q) => q.targetGame === 'quiz' && q.category === 'umum')
    .map(mapCustomToQuiz);

  let pool: QuizQuestion[];
  if (category === 'umum') {
    pool = [...extraUmum, ...GENERAL_QUIZ_QUESTIONS];
  } else if (category === 'campuran') {
    pool = [...extraTik, ...extraUmum, ...QUIZ_QUESTIONS, ...GENERAL_QUIZ_QUESTIONS];
  } else {
    pool = [...extraTik, ...QUIZ_QUESTIONS];
  }

  if (!seed) {
    return pool.slice(0, limit);
  }
  return shuffleWithSeed(pool, seed)
    .slice(0, Math.min(limit, pool.length))
    .map((q) => shuffleMcqOptions(q, seed));
}

export function getClueCards(
  category: QuestionCategory,
  seed?: string,
  customQuestions: CustomQuestion[] = [],
  limit = 6
): ClueCard[] {
  const extraTik = customQuestions
    .filter((q) => q.targetGame === 'clue' && q.category === 'tik')
    .map(mapCustomToClue);
  const extraUmum = customQuestions
    .filter((q) => q.targetGame === 'clue' && q.category === 'umum')
    .map(mapCustomToClue);

  let pool: ClueCard[];
  if (category === 'umum') {
    pool = [...extraUmum, ...GENERAL_CLUE_CARDS];
  } else if (category === 'campuran') {
    pool = [...extraTik, ...extraUmum, ...CLUE_CARDS, ...GENERAL_CLUE_CARDS];
  } else {
    pool = [...extraTik, ...CLUE_CARDS];
  }

  if (!seed) {
    return pool.slice(0, limit);
  }
  return shuffleWithSeed(pool, seed).slice(0, Math.min(limit, pool.length));
}

export function getRacingQuestions(
  category: QuestionCategory,
  seed?: string,
  customQuestions: CustomQuestion[] = [],
  limit = 25
): RacingQuestion[] {
  const extraTik = customQuestions
    .filter((q) => (q.targetGame === 'racing' || q.targetGame === 'quiz') && q.category === 'tik')
    .map(mapCustomToRacing);
  const extraUmum = customQuestions
    .filter((q) => (q.targetGame === 'racing' || q.targetGame === 'quiz') && q.category === 'umum')
    .map(mapCustomToRacing);

  let pool: RacingQuestion[];
  if (category === 'umum') {
    pool = [...extraUmum, ...GENERAL_RACING_QUESTIONS];
  } else if (category === 'campuran') {
    pool = [...extraTik, ...extraUmum, ...RACING_QUESTIONS, ...GENERAL_RACING_QUESTIONS];
  } else {
    pool = [...extraTik, ...RACING_QUESTIONS];
  }

  if (!seed) {
    return pool.slice(0, limit);
  }
  return shuffleWithSeed(pool, seed)
    .slice(0, Math.min(limit, pool.length))
    .map((q) => shuffleMcqOptions(q, seed));
}

export function getFlagQuestions(
  continent: 'ALL' | Continent,
  seed?: string,
  limit = 8
): FlagQuestion[] {
  const pool =
    continent === 'ALL'
      ? FLAG_QUESTIONS
      : FLAG_QUESTIONS.filter((q) => q.continent === continent);

  if (!seed) {
    return pool.slice(0, continent === 'ALL' ? limit : pool.length);
  }
  const targetCount = continent === 'ALL' ? Math.min(limit, pool.length) : pool.length;
  return shuffleWithSeed(pool, seed)
    .slice(0, targetCount)
    .map((q) => shuffleMcqOptions(q, seed));
}

export function computeStudentBadges(scores: ScoreRecord[]): BadgeItem[] {
  const uniqueGames = new Set(scores.map((s) => s.gameType));
  const hasPerfect = scores.some((s) => s.totalQuestions > 0 && s.correctCount === s.totalQuestions);
  const hasHighRacer = scores.some((s) => s.gameType === 'racing' && s.score >= 850);
  const hasGeneral = scores.some((s) => s.category === 'umum' || s.category === 'campuran');
  const totalPoints = scores.reduce((sum, s) => sum + s.score, 0);

  return [
    {
      id: 'b-pioneer',
      title: 'Langkah Pertama',
      description: 'Menyelesaikan minimal 1 sesi permainan pembelajaran.',
      earned: scores.length >= 1,
    },
    {
      id: 'b-perfect',
      title: 'Akurasi Sempurna',
      description: 'Menjawab 100% soal dengan benar dalam satu sesi.',
      earned: hasPerfect,
    },
    {
      id: 'b-racer',
      title: 'Pembalap Nitro',
      description: 'Meraih skor >= 850 pada permainan Code Racer 2D.',
      earned: hasHighRacer,
    },
    {
      id: 'b-explorer',
      title: 'Penjelajah 3+ Game',
      description: 'Menyelesaikan minimal 3 variasi jenis game berbeda.',
      earned: uniqueGames.size >= 3,
    },
    {
      id: 'b-scholar',
      title: 'Cendekia Umum & TIK',
      description: 'Berpartisipasi pada kategori Pengetahuan Umum atau Campuran.',
      earned: hasGeneral,
    },
    {
      id: 'b-2500',
      title: 'Bintang Al Mumtaz',
      description: 'Mengumpulkan total 2.500 poin akumulasi atau lebih.',
      earned: totalPoints >= 2500,
    },
  ];
}

export const FLAG_QUESTIONS: FlagQuestion[] = [
  // Benua Asia
  {
    id: 'f-id',
    countryCode: 'ID',
    countryName: 'Indonesia',
    continent: 'Asia',
    capital: 'Jakarta',
    options: ['Indonesia', 'Monako', 'Polandia', 'Singapura'],
    correctIndex: 0,
    fact: 'Sang Saka Merah Putih melambangkan keberanian (merah) dan kesucian (putih).',
  },
  {
    id: 'f-jp',
    countryCode: 'JP',
    countryName: 'Jepang',
    continent: 'Asia',
    capital: 'Tokyo',
    options: ['Korea Selatan', 'Jepang', 'Bangladesh', 'Palau'],
    correctIndex: 1,
    fact: 'Hinomaru menampilkan lingkaran merah melambangkan matahari terbit.',
  },
  {
    id: 'f-ps',
    countryCode: 'PS',
    countryName: 'Palestina',
    continent: 'Asia',
    capital: 'Yerusalem Timur',
    options: ['Yordania', 'Palestina', 'Sudan', 'Kuwait'],
    correctIndex: 1,
    fact: 'Palestina adalah rumah bagi Masjid Al-Aqsa, kiblat pertama umat Islam.',
  },
  {
    id: 'f-sa',
    countryCode: 'SA',
    countryName: 'Arab Saudi',
    continent: 'Asia',
    capital: 'Riyadh',
    options: ['Pakistan', 'Arab Saudi', 'Aljazair', 'Nigeria'],
    correctIndex: 1,
    fact: 'Bendera hijau Arab Saudi bertuliskan kalimat syahadat dengan warna dasar hijau.',
  },
  // Benua Afrika
  {
    id: 'f-eg',
    countryCode: 'EG',
    countryName: 'Mesir',
    continent: 'Afrika',
    capital: 'Kairo',
    options: ['Mesir', 'Irak', 'Suriah', 'Yaman'],
    correctIndex: 0,
    fact: 'Mesir memiliki peradaban Sungai Nil sekaligus Universitas Al-Azhar yang bersejarah.',
  },
  {
    id: 'f-ma',
    countryCode: 'MA',
    countryName: 'Maroko',
    continent: 'Afrika',
    capital: 'Rabat',
    options: ['Tunisia', 'Maroko', 'Turki', 'Vietnam'],
    correctIndex: 1,
    fact: 'Maroko merupakan tempat berdirinya Universitas Al-Qarawiyyin, universitas tertua di dunia.',
  },
  {
    id: 'f-za',
    countryCode: 'ZA',
    countryName: 'Afrika Selatan',
    continent: 'Afrika',
    capital: 'Pretoria',
    options: ['Kenya', 'Afrika Selatan', 'Ghana', 'Etiopia'],
    correctIndex: 1,
    fact: 'Bentuk huruf Y pada bendera Afrika Selatan melambangkan persatuan bangsa yang beragam.',
  },
  {
    id: 'f-ng',
    countryCode: 'NG',
    countryName: 'Nigeria',
    continent: 'Afrika',
    capital: 'Abuja',
    options: ['Nigeria', 'Pakistan', 'Irlandia', 'Pantai Gading'],
    correctIndex: 0,
    fact: 'Nigeria adalah negara dengan jumlah penduduk terbesar di Benua Afrika.',
  },
  // Benua Eropa
  {
    id: 'f-fr',
    countryCode: 'FR',
    countryName: 'Prancis',
    continent: 'Eropa',
    capital: 'Paris',
    options: ['Belanda', 'Prancis', 'Rusia', 'Italia'],
    correctIndex: 1,
    fact: 'Tiga warna vertikal biru, putih, dan merah dikenal sebagai Tricolore.',
  },
  {
    id: 'f-de',
    countryCode: 'DE',
    countryName: 'Jerman',
    continent: 'Eropa',
    capital: 'Berlin',
    options: ['Belgia', 'Jerman', 'Austria', 'Spanyol'],
    correctIndex: 1,
    fact: 'Jerman dikenal sebagai pusat teknik rekayasa dan industri teknologi Eropa.',
  },
  {
    id: 'f-it',
    countryCode: 'IT',
    countryName: 'Italia',
    continent: 'Eropa',
    capital: 'Roma',
    options: ['Meksiko', 'Italia', 'Irlandia', 'Hungaria'],
    correctIndex: 1,
    fact: 'Italia terkenal dengan sejarah Renaissance serta inovasi desain dan arsitektur.',
  },
  {
    id: 'f-se',
    countryCode: 'SE',
    countryName: 'Swedia',
    continent: 'Eropa',
    capital: 'Stockholm',
    options: ['Finlandia', 'Norwegia', 'Swedia', 'Denmark'],
    correctIndex: 2,
    fact: 'Swedia merupakan negara asal Penghargaan Nobel di bidang sains dan perdamaian.',
  },
  // Benua Amerika
  {
    id: 'f-us',
    countryCode: 'US',
    countryName: 'Amerika Serikat',
    continent: 'Amerika',
    capital: 'Washington, D.C.',
    options: ['Amerika Serikat', 'Malaysia', 'Liberia', 'Chile'],
    correctIndex: 0,
    fact: 'Memiliki 50 bintang yang mewakili 50 negara bagian dan 13 garis bersejarah.',
  },
  {
    id: 'f-br',
    countryCode: 'BR',
    countryName: 'Brasil',
    continent: 'Amerika',
    capital: 'Brasilia',
    options: ['Argentina', 'Brasil', 'Kolombia', 'Portugal'],
    correctIndex: 1,
    fact: 'Brasil adalah negara terbesar di Amerika Selatan dan rumah bagi Hutan Amazon.',
  },
  {
    id: 'f-ca',
    countryCode: 'CA',
    countryName: 'Kanada',
    continent: 'Amerika',
    capital: 'Ottawa',
    options: ['Kanada', 'Peru', 'Swiss', 'Austria'],
    correctIndex: 0,
    fact: 'Daun maple merah di tengah bendera menjadi simbol alam khas Kanada.',
  },
  {
    id: 'f-ar',
    countryCode: 'AR',
    countryName: 'Argentina',
    continent: 'Amerika',
    capital: 'Buenos Aires',
    options: ['Uruguay', 'Argentina', 'Honduras', 'Nikaragua'],
    correctIndex: 1,
    fact: 'Argentina membentang sepanjang Pegunungan Andes di ujung selatan Benua Amerika.',
  },
];


