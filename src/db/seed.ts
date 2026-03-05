import { db } from "./index";
import { exercises } from "./schema";

const SEED_EXERCISES = [
  // CHEST
  { name: "Barbell Bench Press", category: "chest", equipment: "barbell", muscleGroup: "Chest" },
  { name: "Incline Barbell Bench Press", category: "chest", equipment: "barbell", muscleGroup: "Upper Chest" },
  { name: "Decline Barbell Bench Press", category: "chest", equipment: "barbell", muscleGroup: "Lower Chest" },
  { name: "Dumbbell Bench Press", category: "chest", equipment: "dumbbell", muscleGroup: "Chest" },
  { name: "Incline Dumbbell Press", category: "chest", equipment: "dumbbell", muscleGroup: "Upper Chest" },
  { name: "Dumbbell Flyes", category: "chest", equipment: "dumbbell", muscleGroup: "Chest" },
  { name: "Cable Crossover", category: "chest", equipment: "cable", muscleGroup: "Chest" },
  { name: "Push-Up", category: "chest", equipment: "bodyweight", muscleGroup: "Chest" },
  { name: "Dip", category: "chest", equipment: "bodyweight", muscleGroup: "Lower Chest" },
  { name: "Machine Chest Press", category: "chest", equipment: "machine", muscleGroup: "Chest" },
  { name: "Pec Deck", category: "chest", equipment: "machine", muscleGroup: "Chest" },

  // BACK
  { name: "Barbell Deadlift", category: "back", equipment: "barbell", muscleGroup: "Lower Back" },
  { name: "Pull-Up", category: "back", equipment: "bodyweight", muscleGroup: "Lats" },
  { name: "Chin-Up", category: "back", equipment: "bodyweight", muscleGroup: "Lats" },
  { name: "Barbell Row", category: "back", equipment: "barbell", muscleGroup: "Mid Back" },
  { name: "Dumbbell Row", category: "back", equipment: "dumbbell", muscleGroup: "Mid Back" },
  { name: "T-Bar Row", category: "back", equipment: "barbell", muscleGroup: "Mid Back" },
  { name: "Lat Pulldown", category: "back", equipment: "cable", muscleGroup: "Lats" },
  { name: "Seated Cable Row", category: "back", equipment: "cable", muscleGroup: "Mid Back" },
  { name: "Face Pull", category: "back", equipment: "cable", muscleGroup: "Rear Delt / Traps" },
  { name: "Romanian Deadlift", category: "back", equipment: "barbell", muscleGroup: "Hamstrings / Lower Back" },
  { name: "Good Morning", category: "back", equipment: "barbell", muscleGroup: "Lower Back" },
  { name: "Hyperextension", category: "back", equipment: "machine", muscleGroup: "Lower Back" },

  // LEGS
  { name: "Barbell Squat", category: "legs", equipment: "barbell", muscleGroup: "Quads / Glutes" },
  { name: "Front Squat", category: "legs", equipment: "barbell", muscleGroup: "Quads" },
  { name: "Leg Press", category: "legs", equipment: "machine", muscleGroup: "Quads / Glutes" },
  { name: "Hack Squat", category: "legs", equipment: "machine", muscleGroup: "Quads" },
  { name: "Lunge", category: "legs", equipment: "dumbbell", muscleGroup: "Quads / Glutes" },
  { name: "Bulgarian Split Squat", category: "legs", equipment: "dumbbell", muscleGroup: "Quads / Glutes" },
  { name: "Leg Extension", category: "legs", equipment: "machine", muscleGroup: "Quads" },
  { name: "Leg Curl", category: "legs", equipment: "machine", muscleGroup: "Hamstrings" },
  { name: "Romanian Deadlift", category: "legs", equipment: "barbell", muscleGroup: "Hamstrings" },
  { name: "Glute Bridge", category: "legs", equipment: "barbell", muscleGroup: "Glutes" },
  { name: "Hip Thrust", category: "legs", equipment: "barbell", muscleGroup: "Glutes" },
  { name: "Standing Calf Raise", category: "legs", equipment: "machine", muscleGroup: "Calves" },
  { name: "Seated Calf Raise", category: "legs", equipment: "machine", muscleGroup: "Calves" },
  { name: "Step Up", category: "legs", equipment: "dumbbell", muscleGroup: "Quads / Glutes" },

  // SHOULDERS
  { name: "Overhead Press", category: "shoulders", equipment: "barbell", muscleGroup: "Shoulders" },
  { name: "Dumbbell Shoulder Press", category: "shoulders", equipment: "dumbbell", muscleGroup: "Shoulders" },
  { name: "Arnold Press", category: "shoulders", equipment: "dumbbell", muscleGroup: "Shoulders" },
  { name: "Lateral Raise", category: "shoulders", equipment: "dumbbell", muscleGroup: "Side Delts" },
  { name: "Cable Lateral Raise", category: "shoulders", equipment: "cable", muscleGroup: "Side Delts" },
  { name: "Front Raise", category: "shoulders", equipment: "dumbbell", muscleGroup: "Front Delts" },
  { name: "Rear Delt Fly", category: "shoulders", equipment: "dumbbell", muscleGroup: "Rear Delts" },
  { name: "Upright Row", category: "shoulders", equipment: "barbell", muscleGroup: "Traps / Shoulders" },
  { name: "Shrug", category: "shoulders", equipment: "barbell", muscleGroup: "Traps" },
  { name: "Machine Shoulder Press", category: "shoulders", equipment: "machine", muscleGroup: "Shoulders" },

  // ARMS
  { name: "Barbell Curl", category: "arms", equipment: "barbell", muscleGroup: "Biceps" },
  { name: "Dumbbell Curl", category: "arms", equipment: "dumbbell", muscleGroup: "Biceps" },
  { name: "Hammer Curl", category: "arms", equipment: "dumbbell", muscleGroup: "Biceps / Brachialis" },
  { name: "Preacher Curl", category: "arms", equipment: "barbell", muscleGroup: "Biceps" },
  { name: "Cable Curl", category: "arms", equipment: "cable", muscleGroup: "Biceps" },
  { name: "Incline Dumbbell Curl", category: "arms", equipment: "dumbbell", muscleGroup: "Biceps" },
  { name: "Close-Grip Bench Press", category: "arms", equipment: "barbell", muscleGroup: "Triceps" },
  { name: "Skull Crusher", category: "arms", equipment: "barbell", muscleGroup: "Triceps" },
  { name: "Tricep Dip", category: "arms", equipment: "bodyweight", muscleGroup: "Triceps" },
  { name: "Tricep Pushdown", category: "arms", equipment: "cable", muscleGroup: "Triceps" },
  { name: "Overhead Tricep Extension", category: "arms", equipment: "cable", muscleGroup: "Triceps" },
  { name: "Diamond Push-Up", category: "arms", equipment: "bodyweight", muscleGroup: "Triceps" },

  // CORE
  { name: "Plank", category: "core", equipment: "bodyweight", muscleGroup: "Core" },
  { name: "Crunch", category: "core", equipment: "bodyweight", muscleGroup: "Abs" },
  { name: "Sit-Up", category: "core", equipment: "bodyweight", muscleGroup: "Abs" },
  { name: "Leg Raise", category: "core", equipment: "bodyweight", muscleGroup: "Lower Abs" },
  { name: "Russian Twist", category: "core", equipment: "bodyweight", muscleGroup: "Obliques" },
  { name: "Ab Rollout", category: "core", equipment: "other", muscleGroup: "Core" },
  { name: "Cable Crunch", category: "core", equipment: "cable", muscleGroup: "Abs" },
  { name: "Hanging Leg Raise", category: "core", equipment: "bodyweight", muscleGroup: "Lower Abs" },
  { name: "Side Plank", category: "core", equipment: "bodyweight", muscleGroup: "Obliques" },
  { name: "Mountain Climber", category: "core", equipment: "bodyweight", muscleGroup: "Core" },

  // CARDIO
  { name: "Treadmill Run", category: "cardio", equipment: "machine", muscleGroup: "Full Body" },
  { name: "Stationary Bike", category: "cardio", equipment: "machine", muscleGroup: "Legs" },
  { name: "Rowing Machine", category: "cardio", equipment: "machine", muscleGroup: "Full Body" },
  { name: "Jump Rope", category: "cardio", equipment: "other", muscleGroup: "Full Body" },
  { name: "Stair Climber", category: "cardio", equipment: "machine", muscleGroup: "Legs" },
  { name: "Elliptical", category: "cardio", equipment: "machine", muscleGroup: "Full Body" },
  { name: "Burpee", category: "cardio", equipment: "bodyweight", muscleGroup: "Full Body" },
  { name: "Box Jump", category: "cardio", equipment: "other", muscleGroup: "Legs" },
  { name: "Outdoor Walk", category: "cardio", equipment: "bodyweight", muscleGroup: "Full Body" },
  { name: "Treadmill Walk", category: "cardio", equipment: "machine", muscleGroup: "Full Body" },
] as const;

export async function seedExercises() {
  const existing = await db.select().from(exercises);
  if (existing.length > 0) return;

  for (const ex of SEED_EXERCISES) {
    try {
      await db.insert(exercises).values({
        name: ex.name,
        category: ex.category as Exercise["category"],
        equipment: ex.equipment as Exercise["equipment"],
        muscleGroup: ex.muscleGroup,
        isCustom: false,
      });
    } catch {
      // Skip duplicates
    }
  }
}

type Exercise = typeof import("./schema").exercises.$inferSelect;
