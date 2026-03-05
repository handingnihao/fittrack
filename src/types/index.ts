export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export type ExerciseCategory =
  | "chest"
  | "back"
  | "legs"
  | "shoulders"
  | "arms"
  | "core"
  | "cardio"
  | "other";

export type Equipment =
  | "barbell"
  | "dumbbell"
  | "machine"
  | "bodyweight"
  | "cable"
  | "other";

export interface MacroSummary {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface DailySummary extends MacroSummary {
  targetCalories: number;
  targetProteinG: number;
  targetCarbsG: number;
  targetFatG: number;
}

export interface WeeklyStats {
  workoutStreak: number;
  nutritionStreak: number;
  thisWeekWorkouts: number;
  thisWeekAvgCalPercent: number; // 0–1
  weeklyBuckets: Array<{ label: string; workoutDays: number; avgCalPercent: number }>;
}

export interface ActiveSet {
  id?: number;
  setNumber: number;
  reps: number | null;
  weightKg: number | null;
  distanceM?: number | null;
  durationSec?: number | null;
  incline?: number | null;
  resistance?: number | null;
  speedMph?: number | null;
  isWarmup: boolean;
  isDropSet: boolean;
  isPersonalBest?: boolean;
  completed: boolean;
}

export interface ActiveExercise {
  exerciseId: number;
  exerciseName: string;
  exerciseCategory?: string;
  loggedExerciseId?: number;
  restSeconds: number;
  sets: ActiveSet[];
  previousSets?: Array<{
    weightKg: number | null;
    reps: number | null;
    distanceM?: number | null;
    durationSec?: number | null;
  }>;
}

export interface ActiveWorkoutState {
  sessionId: number | null;
  routineId: number | null;
  name: string;
  startedAt: Date;
  exercises: ActiveExercise[];
  currentExerciseIndex: number;
  restTimerActive: boolean;
  restTimerSeconds: number;
  restTimerRemaining: number;
  isFinished: boolean;
}

export type ActiveWorkoutAction =
  | { type: "INIT_SESSION"; sessionId: number; routineId: number | null; name: string; exercises: ActiveExercise[] }
  | { type: "RESTORE_SESSION"; sessionId: number; routineId: number | null; name: string; startedAt: Date; exercises: ActiveExercise[] }
  | { type: "ADD_EXERCISE"; exercise: ActiveExercise }
  | { type: "ADD_SET"; exerciseIndex: number }
  | { type: "UPDATE_SET"; exerciseIndex: number; setIndex: number; field: keyof ActiveSet; value: number | boolean | null }
  | { type: "COMPLETE_SET"; exerciseIndex: number; setIndex: number; loggedSetId: number }
  | { type: "REMOVE_SET"; exerciseIndex: number; setIndex: number }
  | { type: "START_REST_TIMER"; seconds: number }
  | { type: "TICK_REST_TIMER" }
  | { type: "STOP_REST_TIMER" }
  | { type: "SET_EXERCISE_INDEX"; index: number }
  | { type: "FINISH_SESSION" }
  | { type: "RESET" };

export interface ExerciseHistoryPoint {
  date: string;
  maxWeightKg: number | null;
  totalVolume: number; // sets × reps × weight
  maxReps: number | null;
  sessionName: string;
  sets: Array<{ weightKg: number | null; reps: number | null; distanceM?: number | null; durationSec?: number | null }>;
}

export interface RoutineWithExercises {
  id: number;
  name: string;
  description: string | null;
  color: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  exercises: Array<{
    id: number;
    exerciseId: number;
    exerciseName: string;
    category: string;
    sortOrder: number;
    defaultSets: number;
    defaultRepsMin: number;
    defaultRepsMax: number;
    defaultWeightKg: number | null;
    restSeconds: number;
    notes: string | null;
    defaultDurationSec?: number | null;
    defaultDistanceM?: number | null;
    defaultSpeedMph?: number | null;
    defaultIncline?: number | null;
    defaultResistance?: number | null;
  }>;
}

export interface SessionWithDetails {
  id: number;
  name: string;
  startedAt: Date;
  finishedAt: Date | null;
  durationSec: number | null;
  dateStr: string;
  notes: string | null;
  exercises: Array<{
    id: number;
    exerciseName: string;
    sets: Array<{
      setNumber: number;
      reps: number | null;
      weightKg: number | null;
      isWarmup: boolean;
      isPersonalBest: boolean;
    }>;
  }>;
}
