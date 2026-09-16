#!/usr/bin/env node
/**
 * Boots an iOS simulator, then hands over to `expo start --ios`.
 *
 * Expo installs Expo Go with `xcrun simctl install`, which fails with
 *
 *     Unable to lookup in current state: Shutdown
 *
 * when no simulator is booted — and Expo's own boot step is unreliable for
 * devices sitting on an older runtime. Booting first, and waiting until the
 * device actually reports `Booted`, removes the race entirely.
 *
 * Device choice: whatever is already booted, otherwise the newest available
 * iOS runtime. Override with `--device "iPhone 17 Pro"` or IOS_SIMULATOR.
 */
import { spawn, spawnSync } from 'node:child_process';

const BOOT_TIMEOUT_MS = 90_000;
const POLL_INTERVAL_MS = 1_000;

const argv = process.argv.slice(2);
const deviceFlagIndex = argv.indexOf('--device');
const requestedDevice =
  deviceFlagIndex === -1 ? process.env.IOS_SIMULATOR : argv[deviceFlagIndex + 1];
const passThrough = deviceFlagIndex === -1 ? argv : argv.filter((_, i) => i !== deviceFlagIndex && i !== deviceFlagIndex + 1);

const listDevices = () => {
  const result = spawnSync('xcrun', ['simctl', 'list', 'devices', 'available', '--json'], {
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(`xcrun simctl failed: ${result.stderr || result.stdout}`);
  }
  const { devices } = JSON.parse(result.stdout);

  return Object.entries(devices)
    .filter(([runtime]) => runtime.includes('iOS'))
    .flatMap(([runtime, entries]) =>
      entries.map((device) => ({
        ...device,
        runtime,
        // "com.apple.CoreSimulator.SimRuntime.iOS-26-5" → 26.5, for ordering.
        version: Number.parseFloat(
          (runtime.match(/iOS-(\d+)-(\d+)/) ?? []).slice(1).join('.') || '0',
        ),
      })),
    );
};

const pickDevice = (devices) => {
  const booted = devices.find((device) => device.state === 'Booted');
  if (booted) return { device: booted, alreadyBooted: true };

  const candidates = devices
    .filter((device) => device.isAvailable !== false)
    .filter((device) => (requestedDevice ? device.name === requestedDevice : device.name.startsWith('iPhone')))
    // Newest runtime first; within a runtime, keep simctl's own order.
    .sort((a, b) => b.version - a.version);

  const device = candidates[0];
  if (!device) {
    throw new Error(
      requestedDevice
        ? `No available simulator named "${requestedDevice}".`
        : 'No available iPhone simulators. Install one in Xcode › Settings › Components.',
    );
  }
  return { device, alreadyBooted: false };
};

const waitUntilBooted = async (udid) => {
  const deadline = Date.now() + BOOT_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const current = listDevices().find((device) => device.udid === udid);
    if (current?.state === 'Booted') return;
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  throw new Error(`Simulator ${udid} did not finish booting within 90s.`);
};

const main = async () => {
  const { device, alreadyBooted } = pickDevice(listDevices());

  if (alreadyBooted) {
    console.log(`▸ Using booted simulator: ${device.name}`);
  } else {
    console.log(`▸ Booting ${device.name} (${device.runtime.split('.').pop()})…`);
    const boot = spawnSync('xcrun', ['simctl', 'boot', device.udid], { encoding: 'utf8' });
    // "Unable to boot device in current state: Booted" is a race we can ignore.
    if (boot.status !== 0 && !/current state: Booted/.test(boot.stderr ?? '')) {
      throw new Error(boot.stderr || 'Could not boot the simulator.');
    }
    await waitUntilBooted(device.udid);
    console.log(`▸ ${device.name} is booted.`);
  }

  spawnSync('open', ['-a', 'Simulator']);

  const expo = spawn('npx', ['expo', 'start', '--ios', ...passThrough], {
    stdio: 'inherit',
    env: process.env,
  });
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => expo.kill(signal));
  }
  expo.on('exit', (code, signal) => process.exit(signal ? 1 : (code ?? 0)));
};

main().catch((error) => {
  console.error(`\n✖ ${error.message}\n`);
  process.exit(1);
});
