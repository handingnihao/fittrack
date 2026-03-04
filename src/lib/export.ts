import { db } from "@/db";
import { exercises, routines, workoutSessions, loggedExercises, sets, foods, foodLog, profile } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

export async function exportAllDataAsJson(profileId?: number) {
  if (profileId) {
    const [profileData] = await Promise.all([db.select().from(profile).where(eq(profile.id, profileId))]);
    const exerciseData = await db.select().from(exercises);
    const foodData = await db.select().from(foods);
    const routineData = await db.select().from(routines).where(eq(routines.profileId, profileId));
    const sessionData = await db.select().from(workoutSessions).where(eq(workoutSessions.profileId, profileId));
    const foodLogData = await db.select().from(foodLog).where(eq(foodLog.profileId, profileId));

    const sessionIds = sessionData.map(s => s.id);
    const routineIds = routineData.map(r => r.id);

    const loggedExData = sessionIds.length > 0
      ? await db.select().from(loggedExercises).where(inArray(loggedExercises.sessionId, sessionIds))
      : [];
    const loggedExIds = loggedExData.map(e => e.id);
    const setData = loggedExIds.length > 0
      ? await db.select().from(sets).where(inArray(sets.loggedExerciseId, loggedExIds))
      : [];

    return {
      exportedAt: new Date().toISOString(),
      version: "1.0",
      data: {
        profile: profileData,
        exercises: exerciseData,
        routines: routineData,
        workoutSessions: sessionData,
        loggedExercises: loggedExData,
        sets: setData,
        foods: foodData,
        foodLog: foodLogData,
      },
    };
  }

  const [profileData, exerciseData, routineData, sessionData, loggedExData, setData, foodData, foodLogData] =
    await Promise.all([
      db.select().from(profile),
      db.select().from(exercises),
      db.select().from(routines),
      db.select().from(workoutSessions),
      db.select().from(loggedExercises),
      db.select().from(sets),
      db.select().from(foods),
      db.select().from(foodLog),
    ]);

  return {
    exportedAt: new Date().toISOString(),
    version: "1.0",
    data: {
      profile: profileData,
      exercises: exerciseData,
      routines: routineData,
      workoutSessions: sessionData,
      loggedExercises: loggedExData,
      sets: setData,
      foods: foodData,
      foodLog: foodLogData,
    },
  };
}

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsvRows<T extends Record<string, unknown>>(rows: T[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => escapeCsv(row[h])).join(",")),
  ];
  return lines.join("\n");
}

export async function exportWorkoutsCsv(profileId?: number): Promise<string> {
  const query = db.select().from(workoutSessions).orderBy(workoutSessions.startedAt);
  const sessions = profileId
    ? await db.select().from(workoutSessions).where(eq(workoutSessions.profileId, profileId)).orderBy(workoutSessions.startedAt)
    : await query;
  return toCsvRows(
    sessions.map((s) => ({
      id: s.id,
      date: s.dateStr,
      name: s.name,
      duration_minutes: s.durationSec ? Math.round(s.durationSec / 60) : "",
      notes: s.notes ?? "",
    }))
  );
}

export async function exportNutritionCsv(profileId?: number): Promise<string> {
  const logs = profileId
    ? await db.select().from(foodLog).where(eq(foodLog.profileId, profileId)).orderBy(foodLog.dateStr, foodLog.loggedAt)
    : await db.select().from(foodLog).orderBy(foodLog.dateStr, foodLog.loggedAt);
  return toCsvRows(
    logs.map((l) => ({
      id: l.id,
      date: l.dateStr,
      meal: l.mealType,
      food: l.foodName,
      servings: l.servings,
      serving_size_g: l.servingSizeG,
      calories: l.calories,
      protein_g: l.proteinG,
      carbs_g: l.carbsG,
      fat_g: l.fatG,
      fiber_g: l.fiberG ?? "",
    }))
  );
}
