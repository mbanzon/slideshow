import { ApplicationRef, Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter, take } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PwaUpdatesService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly appRef = inject(ApplicationRef);
  private readonly updates = inject(SwUpdate, { optional: true });
  private readonly checkIntervalMs = 5 * 60 * 1000;

  initialize(): void {
    if (!this.isBrowser || !this.updates?.isEnabled) {
      return;
    }

    this.updates.versionUpdates
      .pipe(
        filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY')
      )
      .subscribe(() => {
        void this.activateAndReload();
      });

    this.appRef.isStable
      .pipe(
        filter((isStable) => isStable),
        take(1)
      )
      .subscribe(() => {
        void this.checkForUpdate();
        window.setInterval(() => {
          void this.checkForUpdate();
        }, this.checkIntervalMs);
      });

    window.addEventListener('online', () => {
      void this.checkForUpdate();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        void this.checkForUpdate();
      }
    });
  }

  private async checkForUpdate(): Promise<void> {
    try {
      await this.updates?.checkForUpdate();
    } catch {
      // Ignore transient network errors; retries run on the next scheduled check.
    }
  }

  private async activateAndReload(): Promise<void> {
    try {
      await this.updates?.activateUpdate();
      document.location.reload();
    } catch {
      // Keep running on current version if update activation fails.
    }
  }
}
