import { AppErrors } from '@core/errors/AppError';
import { err, ok, type Result } from '@core/result/Result';
import type { WidgetSnapshot, WidgetSync } from '@domain/ports/Services';
import TodayWidget, { type TodayWidgetProps } from '@widgets/TodayWidget';

const toProps = (snapshot: WidgetSnapshot | null): TodayWidgetProps =>
  snapshot === null
    ? {
        hasChallenge: false,
        dayNumber: 0,
        totalDays: 0,
        currentStreak: 0,
        completedDays: 0,
        daysRemaining: 0,
        ratio: 0,
        tasks: [],
      }
    : { hasChallenge: true, ...snapshot };

/**
 * `updateSnapshot` is a synchronous native call (see `expo-widgets`), but the
 * port stays `Promise`-shaped for consistency with every other adapter here.
 */
export class ExpoWidgetSync implements WidgetSync {
  async updateSnapshot(snapshot: WidgetSnapshot | null): Promise<Result<void>> {
    try {
      TodayWidget.updateSnapshot(toProps(snapshot));
      return ok(undefined);
    } catch (cause) {
      return err(AppErrors.unexpected('Could not update the home screen widget.', { cause }));
    }
  }
}

/** Android and web have no widget target (yet) — updates are simply discarded. */
export class NoopWidgetSync implements WidgetSync {
  async updateSnapshot(): Promise<Result<void>> {
    return ok(undefined);
  }
}
