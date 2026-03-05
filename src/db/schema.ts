import {
  sqliteTable,
  text,
  integer,
  real,
  index,
} from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";

// ─────────────────────────────────────────────
// USER PROFILE (single row, id always = 1)
// ─────────────────────────────────────────────
export const profile = sqliteTable("profile", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().default("Athlete"),
  weightKg: real("weight_kg"),
  heightCm: real("height_cm"),
  ageYears: integer("age_years"),
  biologicalSex: text("biological_sex").$type<"male" | "female" | "other">(),
  goalType: text("goal_type").$type<"lose" | "maintain" | "gain">(),
  activityLevel: text("activity_level").$type<
    "sedentary" | "light" | "moderate" | "active" | "veryActive"
  >(),
  targetCalories: integer("target_calories").notNull().default(2000),
  targetProteinG: real("target_protein_g").notNull().default(150),
  targetCarbsG: real("target_carbs_g").notNull().default(200),
  targetFatG: real("target_fat_g").notNull().default(65),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ─────────────────────────────────────────────
// EXERCISE LIBRARY
// ─────────────────────────────────────────────
export const exercises = sqliteTable(
  "exercises",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull().unique(),
    category: text("category")
      .notNull()
      .$type<
        | "chest"
        | "back"
        | "legs"
        | "shoulders"
        | "arms"
        | "core"
        | "cardio"
        | "other"
      >(),
    equipment: text("equipment").$type<
      "barbell" | "dumbbell" | "machine" | "bodyweight" | "cable" | "other"
    >(),
    muscleGroup: text("muscle_group"),
    notes: text("notes"),
    isCustom: integer("is_custom", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => ({
    nameIdx: index("exercises_name_idx").on(t.name),
    categoryIdx: index("exercises_category_idx").on(t.category),
  })
);

// ─────────────────────────────────────────────
// WORKOUT ROUTINES (templates)
// ─────────────────────────────────────────────
export const routines = sqliteTable("routines", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  profileId: integer("profile_id").notNull().default(1),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").notNull().default("#a78bfa"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ─────────────────────────────────────────────
// ROUTINE EXERCISES (template line items)
// ─────────────────────────────────────────────
export const routineExercises = sqliteTable(
  "routine_exercises",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    routineId: integer("routine_id")
      .notNull()
      .references(() => routines.id, { onDelete: "cascade" }),
    exerciseId: integer("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "restrict" }),
    sortOrder: integer("sort_order").notNull().default(0),
    defaultSets: integer("default_sets").notNull().default(3),
    defaultRepsMin: integer("default_reps_min").notNull().default(8),
    defaultRepsMax: integer("default_reps_max").notNull().default(12),
    defaultWeightKg: real("default_weight_kg"),
    restSeconds: integer("rest_seconds").notNull().default(90),
    notes: text("notes"),
    // Cardio-specific defaults
    defaultDurationSec: integer("default_duration_sec"),
    defaultDistanceM: real("default_distance_m"),
    defaultSpeedMph: real("default_speed_mph"),
    defaultIncline: real("default_incline"),
    defaultResistance: real("default_resistance"),
  },
  (t) => ({
    routineIdx: index("routine_exercises_routine_idx").on(t.routineId),
  })
);

// ─────────────────────────────────────────────
// WORKOUT SESSIONS
// ─────────────────────────────────────────────
export const workoutSessions = sqliteTable(
  "workout_sessions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    profileId: integer("profile_id").notNull().default(1),
    routineId: integer("routine_id").references(() => routines.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    startedAt: integer("started_at", { mode: "timestamp" }).notNull(),
    finishedAt: integer("finished_at", { mode: "timestamp" }),
    durationSec: integer("duration_sec"),
    notes: text("notes"),
    bodyWeightKg: real("body_weight_kg"),
    dateStr: text("date_str").notNull(),
  },
  (t) => ({
    dateIdx: index("workout_sessions_date_idx").on(t.dateStr),
    startedIdx: index("workout_sessions_started_idx").on(t.startedAt),
  })
);

// ─────────────────────────────────────────────
// LOGGED EXERCISES (within a session)
// ─────────────────────────────────────────────
export const loggedExercises = sqliteTable(
  "logged_exercises",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sessionId: integer("session_id")
      .notNull()
      .references(() => workoutSessions.id, { onDelete: "cascade" }),
    exerciseId: integer("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "restrict" }),
    exerciseName: text("exercise_name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    notes: text("notes"),
  },
  (t) => ({
    sessionIdx: index("logged_exercises_session_idx").on(t.sessionId),
    exerciseIdx: index("logged_exercises_exercise_idx").on(t.exerciseId),
  })
);

// ─────────────────────────────────────────────
// SETS
// ─────────────────────────────────────────────
export const sets = sqliteTable(
  "sets",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    loggedExerciseId: integer("logged_exercise_id")
      .notNull()
      .references(() => loggedExercises.id, { onDelete: "cascade" }),
    setNumber: integer("set_number").notNull(),
    reps: integer("reps"),
    weightKg: real("weight_kg"),
    durationSec: integer("duration_sec"),
    distanceM: real("distance_m"),
    rpe: real("rpe"),
    incline: real("incline"),
    resistance: real("resistance"),
    speedMph: real("speed_mph"),
    isWarmup: integer("is_warmup", { mode: "boolean" }).notNull().default(false),
    isDropSet: integer("is_drop_set", { mode: "boolean" })
      .notNull()
      .default(false),
    isPersonalBest: integer("is_personal_best", { mode: "boolean" })
      .notNull()
      .default(false),
    completedAt: integer("completed_at", { mode: "timestamp" }),
  },
  (t) => ({
    loggedExIdx: index("sets_logged_exercise_idx").on(t.loggedExerciseId),
  })
);

// ─────────────────────────────────────────────
// FOOD DATABASE
// ─────────────────────────────────────────────
export const foods = sqliteTable(
  "foods",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    brand: text("brand"),
    servingSizeG: real("serving_size_g").notNull().default(100),
    servingUnit: text("serving_unit").notNull().default("g"),
    calories: real("calories").notNull(),
    proteinG: real("protein_g").notNull().default(0),
    carbsG: real("carbs_g").notNull().default(0),
    fatG: real("fat_g").notNull().default(0),
    fiberG: real("fiber_g"),
    sugarG: real("sugar_g"),
    sodiumMg: real("sodium_mg"),
    isCustom: integer("is_custom", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => ({
    nameIdx: index("foods_name_idx").on(t.name),
    brandIdx: index("foods_brand_idx").on(t.brand),
  })
);

// ─────────────────────────────────────────────
// FOOD LOG (daily entries)
// ─────────────────────────────────────────────
export const foodLog = sqliteTable(
  "food_log",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    profileId: integer("profile_id").notNull().default(1),
    dateStr: text("date_str").notNull(),
    mealType: text("meal_type")
      .notNull()
      .$type<"breakfast" | "lunch" | "dinner" | "snack">(),
    foodId: integer("food_id").references(() => foods.id, {
      onDelete: "set null",
    }),
    foodName: text("food_name").notNull(),
    servings: real("servings").notNull().default(1),
    servingSizeG: real("serving_size_g").notNull(),
    calories: real("calories").notNull(),
    proteinG: real("protein_g").notNull().default(0),
    carbsG: real("carbs_g").notNull().default(0),
    fatG: real("fat_g").notNull().default(0),
    fiberG: real("fiber_g"),
    loggedAt: integer("logged_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => ({
    dateIdx: index("food_log_date_idx").on(t.dateStr),
    mealIdx: index("food_log_meal_idx").on(t.dateStr, t.mealType),
  })
);

// ─────────────────────────────────────────────
// BODY WEIGHT LOG
// ─────────────────────────────────────────────
export const weightLog = sqliteTable(
  "weight_log",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    profileId: integer("profile_id").notNull().default(1),
    weightKg: real("weight_kg").notNull(),
    dateStr: text("date_str").notNull(), // YYYY-MM-DD
    loggedAt: integer("logged_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => ({
    dateIdx: index("weight_log_date_idx").on(t.dateStr),
    profileDateUniq: index("weight_log_profile_date_idx").on(t.profileId, t.dateStr),
  })
);

// ─────────────────────────────────────────────
// BODY MEASUREMENTS
// ─────────────────────────────────────────────
export const measurements = sqliteTable(
  "measurements",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    profileId: integer("profile_id").notNull().default(1),
    dateStr: text("date_str").notNull(),
    chestCm: real("chest_cm"),
    waistCm: real("waist_cm"),
    hipsCm: real("hips_cm"),
    leftArmCm: real("left_arm_cm"),
    rightArmCm: real("right_arm_cm"),
    leftThighCm: real("left_thigh_cm"),
    rightThighCm: real("right_thigh_cm"),
    neckCm: real("neck_cm"),
    shouldersCm: real("shoulders_cm"),
    bodyFatPct: real("body_fat_pct"),
    notes: text("notes"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => ({
    profileDateIdx: index("measurements_profile_date_idx").on(t.profileId, t.dateStr),
  })
);

// ─────────────────────────────────────────────
// PROFILE STATS (gamification)
// ─────────────────────────────────────────────
export const profileStats = sqliteTable("profile_stats", {
  profileId: integer("profile_id").primaryKey(),
  totalXp: integer("total_xp").notNull().default(0),
  level: integer("level").notNull().default(1),
  streakFreezeTokens: integer("streak_freeze_tokens").notNull().default(0),
  lastFreezeUsedDate: text("last_freeze_used_date"),
  lastFreezeEarnedWeek: text("last_freeze_earned_week"),
  lifetimeWorkouts: integer("lifetime_workouts").notNull().default(0),
  lifetimePRs: integer("lifetime_prs").notNull().default(0),
  lifetimeVolumeKg: real("lifetime_volume_kg").notNull().default(0),
});

// ─────────────────────────────────────────────
// XP EVENTS
// ─────────────────────────────────────────────
export const xpEvents = sqliteTable(
  "xp_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    profileId: integer("profile_id").notNull().default(1),
    eventType: text("event_type")
      .notNull()
      .$type<"workout_complete" | "pr_set" | "nutrition_logged" | "challenge_complete" | "streak_milestone" | "measurement_logged">(),
    xpGained: integer("xp_gained").notNull(),
    refId: integer("ref_id"),
    description: text("description"),
    dateStr: text("date_str").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => ({
    profileDateIdx: index("xp_events_profile_date_idx").on(t.profileId, t.dateStr),
  })
);

// ─────────────────────────────────────────────
// ACHIEVEMENTS
// ─────────────────────────────────────────────
export const achievements = sqliteTable(
  "achievements",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    profileId: integer("profile_id").notNull().default(1),
    achievementKey: text("achievement_key").notNull(),
    unlockedAt: integer("unlocked_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    metadata: text("metadata"),
  },
  (t) => ({
    profileKeyUniq: index("achievements_profile_key_idx").on(t.profileId, t.achievementKey),
  })
);

// ─────────────────────────────────────────────
// WEEKLY CHALLENGES
// ─────────────────────────────────────────────
export const challenges = sqliteTable(
  "challenges",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    profileId: integer("profile_id").notNull().default(1),
    weekStr: text("week_str").notNull(),
    challengeKey: text("challenge_key").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    targetValue: integer("target_value").notNull(),
    currentValue: integer("current_value").notNull().default(0),
    isCompleted: integer("is_completed", { mode: "boolean" }).notNull().default(false),
    completedAt: integer("completed_at", { mode: "timestamp" }),
    xpReward: integer("xp_reward").notNull().default(150),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => ({
    profileWeekIdx: index("challenges_profile_week_idx").on(t.profileId, t.weekStr),
  })
);

// ─────────────────────────────────────────────
// WATER LOG
// ─────────────────────────────────────────────
export const waterLog = sqliteTable(
  "water_log",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    profileId: integer("profile_id").notNull().default(1),
    dateStr: text("date_str").notNull(),
    totalMl: integer("total_ml").notNull().default(0),
    goalMl: integer("goal_ml").notNull().default(2500),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => ({
    profileDateUniq: index("water_log_profile_date_idx").on(t.profileId, t.dateStr),
  })
);

// ─────────────────────────────────────────────
// PROGRESS PHOTOS
// ─────────────────────────────────────────────
export const progressPhotos = sqliteTable("progress_photos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  profileId: integer("profile_id").notNull().default(1),
  dateStr: text("date_str").notNull(),
  filename: text("filename").notNull(),
  angle: text("angle").$type<"front" | "side" | "back">().notNull().default("front"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ─────────────────────────────────────────────
// ROUTINE SCHEDULE
// ─────────────────────────────────────────────
export const routineSchedule = sqliteTable(
  "routine_schedule",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    routineId: integer("routine_id")
      .notNull()
      .references(() => routines.id, { onDelete: "cascade" }),
    dayOfWeek: integer("day_of_week").notNull(), // 0=Sun..6=Sat
  },
  (t) => ({
    routineDayUniq: index("routine_schedule_routine_day_idx").on(t.routineId, t.dayOfWeek),
  })
);

// ─────────────────────────────────────────────
// RELATIONS
// ─────────────────────────────────────────────

export const routinesRelations = relations(routines, ({ many }) => ({
  routineExercises: many(routineExercises),
  workoutSessions: many(workoutSessions),
}));

export const exercisesRelations = relations(exercises, ({ many }) => ({
  routineExercises: many(routineExercises),
  loggedExercises: many(loggedExercises),
}));

export const routineExercisesRelations = relations(
  routineExercises,
  ({ one }) => ({
    routine: one(routines, {
      fields: [routineExercises.routineId],
      references: [routines.id],
    }),
    exercise: one(exercises, {
      fields: [routineExercises.exerciseId],
      references: [exercises.id],
    }),
  })
);

export const workoutSessionsRelations = relations(
  workoutSessions,
  ({ one, many }) => ({
    routine: one(routines, {
      fields: [workoutSessions.routineId],
      references: [routines.id],
    }),
    loggedExercises: many(loggedExercises),
  })
);

export const loggedExercisesRelations = relations(
  loggedExercises,
  ({ one, many }) => ({
    session: one(workoutSessions, {
      fields: [loggedExercises.sessionId],
      references: [workoutSessions.id],
    }),
    exercise: one(exercises, {
      fields: [loggedExercises.exerciseId],
      references: [exercises.id],
    }),
    sets: many(sets),
  })
);

export const setsRelations = relations(sets, ({ one }) => ({
  loggedExercise: one(loggedExercises, {
    fields: [sets.loggedExerciseId],
    references: [loggedExercises.id],
  }),
}));

export const foodLogRelations = relations(foodLog, ({ one }) => ({
  food: one(foods, {
    fields: [foodLog.foodId],
    references: [foods.id],
  }),
}));

// ─────────────────────────────────────────────
// TYPE EXPORTS
// ─────────────────────────────────────────────

export type Profile = typeof profile.$inferSelect;
export type Exercise = typeof exercises.$inferSelect;
export type NewExercise = typeof exercises.$inferInsert;
export type Routine = typeof routines.$inferSelect;
export type NewRoutine = typeof routines.$inferInsert;
export type RoutineExercise = typeof routineExercises.$inferSelect;
export type WorkoutSession = typeof workoutSessions.$inferSelect;
export type NewWorkoutSession = typeof workoutSessions.$inferInsert;
export type LoggedExercise = typeof loggedExercises.$inferSelect;
export type Set = typeof sets.$inferSelect;
export type NewSet = typeof sets.$inferInsert;
export type Food = typeof foods.$inferSelect;
export type NewFood = typeof foods.$inferInsert;
export type FoodLogEntry = typeof foodLog.$inferSelect;
export type NewFoodLogEntry = typeof foodLog.$inferInsert;
export type WeightEntry = typeof weightLog.$inferSelect;
export type Measurement = typeof measurements.$inferSelect;
export type NewMeasurement = typeof measurements.$inferInsert;
export type ProfileStats = typeof profileStats.$inferSelect;
export type XpEvent = typeof xpEvents.$inferSelect;
export type Achievement = typeof achievements.$inferSelect;
export type Challenge = typeof challenges.$inferSelect;
export type WaterLogEntry = typeof waterLog.$inferSelect;
export type ProgressPhoto = typeof progressPhotos.$inferSelect;
export type RoutineSchedule = typeof routineSchedule.$inferSelect;
