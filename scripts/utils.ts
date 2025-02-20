import { mkdirSync, readdirSync } from "fs";
import { join } from "path";

/**
 * Returns a backup directory path in the format: out/YYYY-MM-DD/increment.
 * It creates the day directory and computes the next increment.
 */
export function getBackupDir(): string {
  const now = new Date();
  const day = now.toISOString().split("T")[0];
  const baseDir = "out";
  const dayDir = join(baseDir, day);
  mkdirSync(dayDir, { recursive: true });

  // Use the number of existing backup directories as the increment.
  const increments = readdirSync(dayDir).filter(name => /^\d+$/.test(name));
  const increment = increments.length + 1;
  return join(dayDir, String(increment));
} 