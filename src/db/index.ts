import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";

const DB_PATH = process.env.DATABASE_URL ?? path.join(process.cwd(), "fittrack.db");

// Singleton pattern — reuse the same connection across hot reloads in dev
const globalForDb = globalThis as unknown as { db: ReturnType<typeof drizzle> | undefined };

function createDb() {
  const sqlite = new Database(DB_PATH);

  // Performance pragmas
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("synchronous = NORMAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("cache_size = -32000"); // 32MB cache
  sqlite.pragma("temp_store = MEMORY");

  // Run migrations inline (create tables if not exist)
  runMigrations(sqlite);

  return drizzle(sqlite, { schema });
}

function runMigrations(sqlite: Database.Database) {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS profile (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL DEFAULT 'Athlete',
      weight_kg REAL,
      height_cm REAL,
      age_years INTEGER,
      biological_sex TEXT,
      goal_type TEXT,
      activity_level TEXT,
      target_calories INTEGER NOT NULL DEFAULT 2000,
      target_protein_g REAL NOT NULL DEFAULT 150,
      target_carbs_g REAL NOT NULL DEFAULT 200,
      target_fat_g REAL NOT NULL DEFAULT 65,
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    INSERT OR IGNORE INTO profile (id, name) VALUES (1, 'Athlete');

    CREATE TABLE IF NOT EXISTS exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL,
      equipment TEXT,
      muscle_group TEXT,
      notes TEXT,
      is_custom INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS exercises_name_idx ON exercises(name);
    CREATE INDEX IF NOT EXISTS exercises_category_idx ON exercises(category);

    CREATE TABLE IF NOT EXISTS routines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      color TEXT NOT NULL DEFAULT '#a78bfa',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS routine_exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      routine_id INTEGER NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
      exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      default_sets INTEGER NOT NULL DEFAULT 3,
      default_reps_min INTEGER NOT NULL DEFAULT 8,
      default_reps_max INTEGER NOT NULL DEFAULT 12,
      default_weight_kg REAL,
      rest_seconds INTEGER NOT NULL DEFAULT 90,
      notes TEXT
    );

    CREATE INDEX IF NOT EXISTS routine_exercises_routine_idx ON routine_exercises(routine_id);

    CREATE TABLE IF NOT EXISTS workout_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      routine_id INTEGER REFERENCES routines(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      finished_at INTEGER,
      duration_sec INTEGER,
      notes TEXT,
      body_weight_kg REAL,
      date_str TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS workout_sessions_date_idx ON workout_sessions(date_str);
    CREATE INDEX IF NOT EXISTS workout_sessions_started_idx ON workout_sessions(started_at);

    CREATE TABLE IF NOT EXISTS logged_exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
      exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
      exercise_name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      notes TEXT
    );

    CREATE INDEX IF NOT EXISTS logged_exercises_session_idx ON logged_exercises(session_id);
    CREATE INDEX IF NOT EXISTS logged_exercises_exercise_idx ON logged_exercises(exercise_id);

    CREATE TABLE IF NOT EXISTS sets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      logged_exercise_id INTEGER NOT NULL REFERENCES logged_exercises(id) ON DELETE CASCADE,
      set_number INTEGER NOT NULL,
      reps INTEGER,
      weight_kg REAL,
      duration_sec INTEGER,
      distance_m REAL,
      rpe REAL,
      is_warmup INTEGER NOT NULL DEFAULT 0,
      is_drop_set INTEGER NOT NULL DEFAULT 0,
      is_personal_best INTEGER NOT NULL DEFAULT 0,
      completed_at INTEGER
    );

    CREATE INDEX IF NOT EXISTS sets_logged_exercise_idx ON sets(logged_exercise_id);

    CREATE TABLE IF NOT EXISTS foods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      brand TEXT,
      serving_size_g REAL NOT NULL DEFAULT 100,
      serving_unit TEXT NOT NULL DEFAULT 'g',
      calories REAL NOT NULL,
      protein_g REAL NOT NULL DEFAULT 0,
      carbs_g REAL NOT NULL DEFAULT 0,
      fat_g REAL NOT NULL DEFAULT 0,
      fiber_g REAL,
      sugar_g REAL,
      sodium_mg REAL,
      is_custom INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS foods_name_idx ON foods(name);
    CREATE INDEX IF NOT EXISTS foods_brand_idx ON foods(brand);

    CREATE TABLE IF NOT EXISTS food_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date_str TEXT NOT NULL,
      meal_type TEXT NOT NULL,
      food_id INTEGER REFERENCES foods(id) ON DELETE SET NULL,
      food_name TEXT NOT NULL,
      servings REAL NOT NULL DEFAULT 1,
      serving_size_g REAL NOT NULL,
      calories REAL NOT NULL,
      protein_g REAL NOT NULL DEFAULT 0,
      carbs_g REAL NOT NULL DEFAULT 0,
      fat_g REAL NOT NULL DEFAULT 0,
      fiber_g REAL,
      logged_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS food_log_date_idx ON food_log(date_str);
    CREATE INDEX IF NOT EXISTS food_log_meal_idx ON food_log(date_str, meal_type);
  `);

  // Column-guarded migrations for new columns
  const addCol = (table: string, col: string, def: string) => {
    const exists = (sqlite.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).some(r => r.name === col)
    if (!exists) sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`)
  }
  addCol('routines', 'profile_id', 'INTEGER NOT NULL DEFAULT 1')
  addCol('workout_sessions', 'profile_id', 'INTEGER NOT NULL DEFAULT 1')
  addCol('food_log', 'profile_id', 'INTEGER NOT NULL DEFAULT 1')
  addCol('sets', 'incline', 'REAL')
  addCol('sets', 'resistance', 'REAL')
  addCol('sets', 'speed_mph', 'REAL')
  addCol('routine_exercises', 'default_duration_sec', 'INTEGER')
  addCol('routine_exercises', 'default_distance_m', 'REAL')
  addCol('routine_exercises', 'default_speed_mph', 'REAL')
  addCol('routine_exercises', 'default_incline', 'REAL')
  addCol('routine_exercises', 'default_resistance', 'REAL')

  // Insert missing exercises (idempotent)
  const insertExIfMissing = (name: string, category: string, equipment: string, muscleGroup: string) => {
    sqlite.prepare(`INSERT OR IGNORE INTO exercises (name, category, equipment, muscle_group, is_custom) VALUES (?, ?, ?, ?, 0)`)
      .run(name, category, equipment, muscleGroup)
  }
  insertExIfMissing('Outdoor Walk', 'cardio', 'bodyweight', 'Full Body')
  insertExIfMissing('Treadmill Walk', 'cardio', 'machine', 'Full Body')

  // Weight log table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS weight_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id INTEGER NOT NULL DEFAULT 1,
      weight_kg REAL NOT NULL,
      date_str TEXT NOT NULL,
      logged_at INTEGER NOT NULL DEFAULT (unixepoch()),
      UNIQUE(profile_id, date_str)
    );
    CREATE INDEX IF NOT EXISTS weight_log_date_idx ON weight_log(date_str);
  `)

  // Gamification + new feature tables (Phase 2)
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS measurements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id INTEGER NOT NULL DEFAULT 1,
      date_str TEXT NOT NULL,
      chest_cm REAL,
      waist_cm REAL,
      hips_cm REAL,
      left_arm_cm REAL,
      right_arm_cm REAL,
      left_thigh_cm REAL,
      right_thigh_cm REAL,
      neck_cm REAL,
      shoulders_cm REAL,
      body_fat_pct REAL,
      notes TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE INDEX IF NOT EXISTS measurements_profile_date_idx ON measurements(profile_id, date_str);

    CREATE TABLE IF NOT EXISTS profile_stats (
      profile_id INTEGER PRIMARY KEY,
      total_xp INTEGER NOT NULL DEFAULT 0,
      level INTEGER NOT NULL DEFAULT 1,
      streak_freeze_tokens INTEGER NOT NULL DEFAULT 0,
      last_freeze_used_date TEXT,
      last_freeze_earned_week TEXT,
      lifetime_workouts INTEGER NOT NULL DEFAULT 0,
      lifetime_prs INTEGER NOT NULL DEFAULT 0,
      lifetime_volume_kg REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS xp_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id INTEGER NOT NULL DEFAULT 1,
      event_type TEXT NOT NULL,
      xp_gained INTEGER NOT NULL,
      ref_id INTEGER,
      description TEXT,
      date_str TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE INDEX IF NOT EXISTS xp_events_profile_date_idx ON xp_events(profile_id, date_str);

    CREATE TABLE IF NOT EXISTS achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id INTEGER NOT NULL DEFAULT 1,
      achievement_key TEXT NOT NULL,
      unlocked_at INTEGER NOT NULL DEFAULT (unixepoch()),
      metadata TEXT,
      UNIQUE(profile_id, achievement_key)
    );
    CREATE INDEX IF NOT EXISTS achievements_profile_key_idx ON achievements(profile_id, achievement_key);

    CREATE TABLE IF NOT EXISTS challenges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id INTEGER NOT NULL DEFAULT 1,
      week_str TEXT NOT NULL,
      challenge_key TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      target_value INTEGER NOT NULL,
      current_value INTEGER NOT NULL DEFAULT 0,
      is_completed INTEGER NOT NULL DEFAULT 0,
      completed_at INTEGER,
      xp_reward INTEGER NOT NULL DEFAULT 150,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE INDEX IF NOT EXISTS challenges_profile_week_idx ON challenges(profile_id, week_str);

    CREATE TABLE IF NOT EXISTS water_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id INTEGER NOT NULL DEFAULT 1,
      date_str TEXT NOT NULL,
      total_ml INTEGER NOT NULL DEFAULT 0,
      goal_ml INTEGER NOT NULL DEFAULT 2500,
      updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
      UNIQUE(profile_id, date_str)
    );
    CREATE INDEX IF NOT EXISTS water_log_profile_date_idx ON water_log(profile_id, date_str);

    CREATE TABLE IF NOT EXISTS progress_photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id INTEGER NOT NULL DEFAULT 1,
      date_str TEXT NOT NULL,
      filename TEXT NOT NULL,
      angle TEXT NOT NULL DEFAULT 'front',
      notes TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS routine_schedule (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      routine_id INTEGER NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
      day_of_week INTEGER NOT NULL,
      UNIQUE(routine_id, day_of_week)
    );
    CREATE INDEX IF NOT EXISTS routine_schedule_routine_day_idx ON routine_schedule(routine_id, day_of_week);
  `)
}

export const db = globalForDb.db ?? createDb();

// Always preserve the singleton — not just in dev.
// In production Next.js may bundle routes into separate module instances
// that all share the same globalThis, so this prevents multiple connections.
globalForDb.db = db;
