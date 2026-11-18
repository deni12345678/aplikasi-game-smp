export type UserRole = 'student' | 'teacher';

export type ClassRoom = 'VII-A' | 'VII-B' | 'VIII-A' | 'VIII-B' | 'IX-A' | 'IX-B' | 'Guru';

export type GameType = 'quiz' | 'flag' | 'clue' | 'puzzle' | 'racing' | 'horse';

export type SessionMode = 'live' | 'homework';

export type QuestionCategory = 'tik' | 'umum' | 'campuran';

export type Continent = 'Asia' | 'Afrika' | 'Eropa' | 'Amerika';

export type AccountStatus = 'pending' | 'approved' | 'rejected';

export type QuestionMode = 'varied' | 'uniform';

export interface UserAccount {
  id: string;
  nisOrEmail: string;
  fullName: string;
  className: ClassRoom;
  role: UserRole;
  avatarColor: string;
  avatarIcon?: string;
  avatarPhoto?: string;
  status?: AccountStatus;
  createdAt: string;
}

export interface AnswerDetail {
  questionId: string;
  topic: string;
  prompt: string;
  isCorrect: boolean;
  responseTimeMs: number;
}

export interface ScoreRecord {
  id: string;
  studentId: string;
  studentName: string;
  className: ClassRoom;
  gameType: GameType;
  mode: SessionMode;
  category?: QuestionCategory;
  roomCode?: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  avgTimeSec: number;
  maxStreak: number;
  createdAt: string;
  answers: AnswerDetail[];
}

export interface GameSession {
  code: string;
  title: string;
  gameType: GameType;
  mode: SessionMode;
  category?: QuestionCategory;
  questionMode?: QuestionMode;
  roundSeed?: string;
  createdBy: string;
  status: 'waiting' | 'active' | 'finished';
  targetClass: string;
  createdAt: string;
  participants: LiveRaceParticipant[];
}

export interface CustomQuestion {
  id: string;
  targetGame: 'quiz' | 'racing' | 'clue';
  category: 'tik' | 'umum';
  topic: string;
  question: string;
  options?: string[];
  correctIndex?: number;
  answer?: string;
  clues?: [string, string, string];
  explanation?: string;
  createdAt: string;
}

export interface BadgeItem {
  id: string;
  title: string;
  description: string;
  earned: boolean;
}

export interface LiveRaceParticipant {
  studentId: string;
  studentName: string;
  className: ClassRoom;
  carColor: string;
  avatarIcon?: string;
  avatarPhoto?: string;
  progress: number; // 0 to 100
  speedKmh: number;
  score: number;
  streak: number;
  statusEffect: 'normal' | 'nitro' | 'skid' | 'finished';
  finishedAt?: number;
}

export interface LeaderboardEntry {
  rank: number;
  studentId: string;
  studentName: string;
  className: ClassRoom;
  avatarColor: string;
  avatarIcon?: string;
  avatarPhoto?: string;
  totalScore: number;
  gamesPlayed: number;
  avgAccuracyPct: number;
  bestSingleScore: number;
  gameTypesPlayed: GameType[];
}

export interface AnalyticsSummary {
  totalStudents: number;
  totalGamesPlayed: number;
  averageScore: number;
  averageAccuracy: number;
  recentScores: ScoreRecord[];
  students: UserAccount[];
  pendingStudents?: UserAccount[];
  customQuestions?: CustomQuestion[];
  sessions: GameSession[];
  leaderboard: LeaderboardEntry[];
  topicAccuracy: Array<{
    topic: string;
    totalAttempts: number;
    correctAttempts: number;
    accuracyPct: number;
  }>;
  classSummary: Array<{
    className: string;
    attempts: number;
    avgScore: number;
  }>;
}

export interface QuizQuestion {
  id: string;
  type: 'mcq' | 'tf';
  topic: string;
  question: string;
  options: string[];
  correctIndex: number;
  islamicValue: string;
  explanation: string;
}

export interface MatchingPair {
  id: string;
  term: string;
  category: string;
  definition: string;
  iconKey: string;
}

export interface ClueCard {
  id: string;
  topic: string;
  answer: string;
  acceptedAliases: string[];
  clues: [string, string, string];
  islamicNote: string;
}

export interface CrosswordWord {
  number: number;
  direction: 'across' | 'down';
  answer: string;
  row: number;
  col: number;
  clue: string;
  difficulty?: 'mudah' | 'sedang' | 'sulit';
  topic?: string;
}

export interface AlgorithmChallenge {
  id: string;
  title: string;
  context: string;
  correctOrder: string[];
}

export interface RacingQuestion {
  id: string;
  topic: string;
  question: string;
  options: string[];
  correctIndex: number;
}

export interface FlagQuestion {
  id: string;
  countryCode: string;
  countryName: string;
  continent: Continent;
  capital: string;
  options: string[];
  correctIndex: number;
  fact: string;
}
