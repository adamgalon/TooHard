import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

import { AppErrors } from '@core/errors/AppError';
import { err, ok, type Result } from '@core/result/Result';
import type { BackupBundle, BackupFileInfo, BackupIO } from '@domain/ports/Services';
import { ChallengeMapper, DailyLogMapper, SettingsMapper } from '@infrastructure/persistence/mappers';
import { SCHEMA_VERSION } from '@infrastructure/persistence/schemas';
import { backupBundleSchema } from '@infrastructure/backup/schemas';

const FOLDER = 'backups';

/**
 * Adapter over expo-sharing / expo-document-picker / expo-file-system's
 * `File`/`Directory` API. This is the one place a `BackupBundle` (domain
 * types) gets turned into a JSON record (via the same mappers/schemas the
 * AsyncStorage repositories use) and back — the use cases in
 * `application/use-cases/{Backup,Restore}Data.ts` never see the file format.
 */
export class ExpoBackupIO implements BackupIO {
  async writeAndShare(bundle: BackupBundle): Promise<Result<BackupFileInfo>> {
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        return err(AppErrors.unexpected('Sharing is not available on this device.'));
      }

      const payload = {
        schemaVersion: SCHEMA_VERSION,
        exportedAt: bundle.exportedAt,
        challenge: bundle.challenge ? ChallengeMapper.toRecord(bundle.challenge) : null,
        dailyLogs: bundle.dailyLogs.map(DailyLogMapper.toRecord),
        settings: SettingsMapper.toRecord(bundle.settings),
      };

      const fileName = `too-hard-backup-${bundle.exportedAt.slice(0, 10)}.json`;
      const directory = new Directory(Paths.cache, FOLDER);
      if (!directory.exists) directory.create();

      const file = new File(directory, fileName);
      if (file.exists) file.delete();
      file.create();
      file.write(JSON.stringify(payload, null, 2));

      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/json',
        dialogTitle: 'Save your Too Hard backup',
        UTI: 'public.json',
      });

      return ok({ fileName });
    } catch (cause) {
      return err(AppErrors.unexpected('Could not create the backup file.', { cause }));
    }
  }

  async pickAndRead(): Promise<Result<BackupBundle | null>> {
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });
      if (picked.canceled || !picked.assets?.[0]) return ok(null);

      const file = new File(picked.assets[0].uri);
      const text = await file.text();

      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch (cause) {
        return err(AppErrors.corrupted('That file is not valid JSON.', { cause }));
      }

      const validated = backupBundleSchema.safeParse(parsed);
      if (!validated.success) {
        return err(
          AppErrors.corrupted('That file does not look like a Too Hard backup.', {
            details: { issues: validated.error.issues.slice(0, 5) },
          }),
        );
      }
      if (validated.data.schemaVersion > SCHEMA_VERSION) {
        return err(
          AppErrors.corrupted('This backup was made by a newer version of the app.'),
        );
      }

      const data = validated.data;
      return ok({
        challenge: data.challenge ? ChallengeMapper.toDomain(data.challenge) : null,
        dailyLogs: data.dailyLogs.map(DailyLogMapper.toDomain),
        settings: SettingsMapper.toDomain(data.settings),
        exportedAt: data.exportedAt,
      });
    } catch (cause) {
      return err(AppErrors.unexpected('Could not read that backup file.', { cause }));
    }
  }
}

/** Used on web, where expo-file-system's File/Directory API isn't exercised elsewhere either. */
export class NoopBackupIO implements BackupIO {
  async writeAndShare(): Promise<Result<BackupFileInfo>> {
    return err(AppErrors.unexpected('Backup is not available on web yet.'));
  }

  async pickAndRead(): Promise<Result<BackupBundle | null>> {
    return err(AppErrors.unexpected('Restore is not available on web yet.'));
  }
}
