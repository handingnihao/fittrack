import { z } from "zod";

// ─── Profile ───────────────────────────────
export const UpdateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  weightKg: z.number().positive().max(500).optional().nullable(),
  heightCm: z.number().positive().max(300).optional().nullable(),
  ageYears: z.number().int().min(1).max(120).optional().nullable(),
  biologicalSex: z.enum(["male", "female", "other"]).optional().nullable(),
  goalType: z.enum(["lose", "maintain", "gain"]).optional().nullable(),
  activityLevel: z
    .enum(["sedentary", "light", "moderate", "active", "veryActive"])
    .optional()
    .nullable(),
  targetCalories: z.number().int().positive().max(10000).optional(),
  targetProteinG: z.number().positive().max(1000).optional(),
  targetCarbsG: z.number().positive().max(2000).optional(),
  targetFatG: z.number().positive().max(1000).optional(),
});

// ─── Exercises ─────────────────────────────
export const CreateExerciseSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.enum(["chest", "back", "legs", "shoulders", "arms", "core", "cardio", "other"]),
  equipment: z
    .enum(["barbell", "dumbbell", "machine", "bodyweight", "cable", "other"])
    .optional()
    .nullable(),
  muscleGroup: z.string().max(100).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

// ─── Routines ──────────────────────────────
export const CreateRoutineSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional().nullable(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export const UpdateRoutineSchema = CreateRoutineSchema.partial();

export const AddRoutineExerciseSchema = z.object({
  exerciseId: z.number().int().positive(),
  sortOrder: z.number().int().min(0).optional(),
  defaultSets: z.number().int().positive().max(20).optional(),
  defaultRepsMin: z.number().int().positive().max(100).optional(),
  defaultRepsMax: z.number().int().positive().max(100).optional(),
  defaultWeightKg: z.number().positive().optional().nullable(),
  restSeconds: z.number().int().min(0).max(600).optional(),
  notes: z.string().max(500).optional().nullable(),
});

// ─── Workout Sessions ──────────────────────
export const CreateSessionSchema = z.object({
  routineId: z.number().int().positive().optional().nullable(),
  name: z.string().min(1).max(200),
  dateStr: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const UpdateSessionSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  notes: z.string().max(1000).optional().nullable(),
  bodyWeightKg: z.number().positive().optional().nullable(),
  finishedAt: z.string().datetime().optional(),
  durationSec: z.number().int().min(0).optional(),
});

// ─── Logged Exercises ──────────────────────
export const AddLoggedExerciseSchema = z.object({
  exerciseId: z.number().int().positive(),
  sortOrder: z.number().int().min(0).optional(),
  notes: z.string().max(500).optional().nullable(),
});

// ─── Sets ──────────────────────────────────
export const CreateSetSchema = z.object({
  setNumber: z.number().int().positive(),
  reps: z.number().int().min(0).max(9999).optional().nullable(),
  weightKg: z.number().min(0).max(9999).optional().nullable(),
  durationSec: z.number().int().min(0).optional().nullable(),
  distanceM: z.number().min(0).optional().nullable(),
  rpe: z.number().min(1).max(10).optional().nullable(),
  incline: z.number().min(0).max(100).optional().nullable(),
  resistance: z.number().min(0).max(100).optional().nullable(),
  speedMph: z.number().min(0).max(100).optional().nullable(),
  isWarmup: z.boolean().optional(),
  isDropSet: z.boolean().optional(),
  completedAt: z.string().datetime().optional(),
});

export const UpdateSetSchema = CreateSetSchema.partial().omit({ setNumber: true });

// ─── Foods ─────────────────────────────────
export const CreateFoodSchema = z.object({
  name: z.string().min(1).max(200),
  brand: z.string().max(100).optional().nullable(),
  servingSizeG: z.number().positive().max(10000),
  servingUnit: z.string().min(1).max(20).optional(),
  calories: z.number().min(0).max(10000),
  proteinG: z.number().min(0).max(1000),
  carbsG: z.number().min(0).max(1000),
  fatG: z.number().min(0).max(1000),
  fiberG: z.number().min(0).max(200).optional().nullable(),
  sugarG: z.number().min(0).max(1000).optional().nullable(),
  sodiumMg: z.number().min(0).max(100000).optional().nullable(),
});

export const UpdateFoodSchema = CreateFoodSchema.partial();

// ─── Nutrition Log ─────────────────────────
export const AddFoodLogSchema = z.object({
  dateStr: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  foodId: z.number().int().positive().optional().nullable(),
  foodName: z.string().min(1).max(200),
  servings: z.number().positive().max(100),
  servingSizeG: z.number().positive().max(10000),
  calories: z.number().min(0).max(10000),
  proteinG: z.number().min(0).max(1000),
  carbsG: z.number().min(0).max(1000),
  fatG: z.number().min(0).max(1000),
  fiberG: z.number().min(0).max(200).optional().nullable(),
});

export const UpdateFoodLogSchema = z.object({
  servings: z.number().positive().max(100).optional(),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]).optional(),
});
