import {
  AlgorithmChallenge,
  BadgeItem,
  ClueCard,
  CrosswordWord,
  FlagQuestion,
  GameType,
  MatchingPair,
  QuestionCategory,
  QuizQuestion,
  RacingQuestion,
  ScoreRecord,
} from '../types';

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
];

export function getQuizQuestions(category: QuestionCategory): QuizQuestion[] {
  if (category === 'umum') return GENERAL_QUIZ_QUESTIONS;
  if (category === 'campuran') {
    return [...QUIZ_QUESTIONS.slice(0, 4), ...GENERAL_QUIZ_QUESTIONS.slice(0, 4)];
  }
  return QUIZ_QUESTIONS;
}

export function getClueCards(category: QuestionCategory): ClueCard[] {
  if (category === 'umum') return GENERAL_CLUE_CARDS;
  if (category === 'campuran') {
    return [...CLUE_CARDS.slice(0, 3), ...GENERAL_CLUE_CARDS.slice(0, 3)];
  }
  return CLUE_CARDS;
}

export function getRacingQuestions(category: QuestionCategory): RacingQuestion[] {
  if (category === 'umum') return GENERAL_RACING_QUESTIONS;
  if (category === 'campuran') {
    return [...RACING_QUESTIONS.slice(0, 4), ...GENERAL_RACING_QUESTIONS.slice(0, 4)];
  }
  return RACING_QUESTIONS;
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


