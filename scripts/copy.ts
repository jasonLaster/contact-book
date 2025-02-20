import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

// Always include ".env.local" at the top level
const alwaysInclude = ".env.local";

/**
 * Returns a backup directory path in the form "out/YYYY-MM-DD/increment".
 */
function getBackupDir(): string {
  const now = new Date();
  const day = now.toISOString().split("T")[0];
  const baseDir = "out";
  const dayDir = join(baseDir, day);
  mkdirSync(dayDir, { recursive: true });
  const backups = existsSync(dayDir)
    ? readdirSync(dayDir)
      .filter(name => /^\d+$/.test(name))
    : [];
  const increment = backups.length + 1;
  return join(dayDir, String(increment));
}

/**
 * Executes rsync command with the specified source and destination
 */
function executeRsync(source: string, destination: string): void {
  try {
    // Use .gitignore and exclude build directories
    const command = `rsync -a --delete --quiet --stats \
      --filter="dir-merge,- .gitignore" \
      --filter="- /.next/**" \
      --filter="- /out/**" \
      "${source}/" "${destination}/"`;

    execSync(command, { stdio: 'inherit' });
  } catch (error) {
    console.error('Error executing rsync:', error);
    throw error;
  }
}

/**
 * Main backup function
 */
function main() {
  try {
    console.log('Starting backup...');

    // Get backup directory
    const backupDir = getBackupDir();
    console.log(`Backing up to: ${backupDir}`);

    // Create the backup
    executeRsync('.', backupDir);

    // Update most-recent copy
    const mostRecent = join("out", "most-recent");

    // Remove existing most-recent directory if it exists
    if (existsSync(mostRecent)) {
      rmSync(mostRecent, { recursive: true, force: true });
    }

    executeRsync('.', mostRecent);

    console.log(`\nBackup completed: ${backupDir}`);
  } catch (error) {
    console.error('Backup failed:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
} 