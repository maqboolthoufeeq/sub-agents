import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import tar from 'tar';

export class BackupManager {
  private backupDir: string;

  constructor(backupDir?: string) {
    this.backupDir = backupDir || join(dirname(process.cwd()), '.sub-agents-backups');
  }

  async createBackup(sourcePath: string): Promise<string> {
    await fs.mkdir(this.backupDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `backup-${timestamp}.tar.gz`;
    const backupPath = join(this.backupDir, backupName);

    await tar.create(
      {
        gzip: true,
        file: backupPath,
        cwd: dirname(sourcePath),
      },
      [sourcePath]
    );

    // Keep only last 5 backups
    await this.cleanupOldBackups();

    return backupPath;
  }

  async restoreBackup(backupPath: string, targetPath: string): Promise<void> {
    await tar.extract({
      file: backupPath,
      cwd: dirname(targetPath),
    });
  }

  async listBackups(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.backupDir);
      return files
        .filter(f => f.startsWith('backup-') && f.endsWith('.tar.gz'))
        .sort()
        .reverse();
    } catch {
      return [];
    }
  }

  private async cleanupOldBackups(keepCount: number = 5): Promise<void> {
    const backups = await this.listBackups();
    
    if (backups.length > keepCount) {
      const toDelete = backups.slice(keepCount);
      for (const backup of toDelete) {
        await fs.unlink(join(this.backupDir, backup));
      }
    }
  }
}