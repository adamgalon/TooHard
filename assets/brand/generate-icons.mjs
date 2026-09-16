// Generates every "Too Hard" brand mark variant from one parametric definition,
// so the ring geometry, gradient and numeral stay identical across icon,
// splash, Android adaptive layers and favicon. Renders SVG -> PNG with sharp.
import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'node:fs';

const OUT = new URL('./out/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const RED = '#FF4D4D';
const ORANGE = '#FF9F1C';
const INK = '#0B0B0F'; // matches theme dark background / app.json splash backgroundColor
const TRACK_DARK = 'rgba(255,255,255,0.09)';

/**
 * Builds the ring + "75" mark as an SVG fragment (no outer <svg>/background),
 * centered at (cx, cy). `progress` is the fraction of the ring that is drawn
 * (0..1), following the same 12-o'clock-start, clockwise convention as the
 * in-app ProgressRing component.
 */
function buildMark({ cx, cy, radius, stroke, progress = 0.78, numeralSize, numeralColor = '#FFFFFF', gradId, trackColor = TRACK_DARK, glow = false, glowId }) {
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  const glowFragment = glow
    ? `<circle cx="${cx}" cy="${cy}" r="${radius * 1.55}" fill="url(#${glowId})" />`
    : '';

  return `
    ${glowFragment}
    <circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="${trackColor}" stroke-width="${stroke}" />
    <circle
      cx="${cx}" cy="${cy}" r="${radius}" fill="none"
      stroke="url(#${gradId})" stroke-width="${stroke}" stroke-linecap="round"
      stroke-dasharray="${circumference} ${circumference}"
      stroke-dashoffset="${dashOffset}"
      transform="rotate(-90 ${cx} ${cy})"
    />
    <text
      x="${cx}" y="${cy}" font-family="Helvetica Neue, Arial, sans-serif" font-weight="800"
      font-size="${numeralSize}" fill="${numeralColor}" text-anchor="middle"
      dominant-baseline="central" letter-spacing="-2"
    >75</text>
  `;
}

function gradDefs({ gradId, glowId, x1 = '15%', y1 = '10%', x2 = '85%', y2 = '95%' }) {
  return `
    <linearGradient id="${gradId}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">
      <stop offset="0%" stop-color="${RED}" />
      <stop offset="100%" stop-color="${ORANGE}" />
    </linearGradient>
    ${glowId ? `
    <radialGradient id="${glowId}">
      <stop offset="0%" stop-color="${ORANGE}" stop-opacity="0.30" />
      <stop offset="60%" stop-color="${RED}" stop-opacity="0.12" />
      <stop offset="100%" stop-color="${RED}" stop-opacity="0" />
    </radialGradient>` : ''}
  `;
}

const variants = [
  {
    // Primary app icon: dark canvas, glow, full mark. iOS applies its own
    // corner mask, so this stays a plain square.
    name: 'icon',
    size: 1024,
    background: INK,
    build: (s) => `
      <defs>${gradDefs({ gradId: 'g', glowId: 'glow' })}</defs>
      <rect width="${s}" height="${s}" fill="${INK}" />
      ${buildMark({ cx: s / 2, cy: s / 2, radius: 340, stroke: 56, numeralSize: 300, gradId: 'g', glow: true, glowId: 'glow' })}
    `,
  },
  {
    // Splash: transparent so it sits cleanly on app.json's own backgroundColor
    // (#0B0B0F) with zero seam, displayed at imageWidth ~200.
    name: 'splash-icon',
    size: 1024,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
    build: (s) => `
      <defs>${gradDefs({ gradId: 'g', glowId: 'glow' })}</defs>
      ${buildMark({ cx: s / 2, cy: s / 2, radius: 340, stroke: 56, numeralSize: 300, gradId: 'g', glow: true, glowId: 'glow' })}
    `,
  },
  {
    // Android adaptive icon foreground: transparent, content kept inside the
    // ~66% safe-zone circle so no launcher mask (circle/squircle/rounded)
    // clips the ring or numeral.
    name: 'android-icon-foreground',
    size: 512,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
    build: (s) => `
      <defs>${gradDefs({ gradId: 'g' })}</defs>
      ${buildMark({ cx: s / 2, cy: s / 2, radius: 130, stroke: 22, numeralSize: 116, gradId: 'g' })}
    `,
  },
  {
    name: 'android-icon-background',
    size: 512,
    background: INK,
    build: (s) => `
      <defs>${gradDefs({ gradId: 'g', glowId: 'glow' })}</defs>
      <rect width="${s}" height="${s}" fill="${INK}" />
      <circle cx="${s / 2}" cy="${s / 2}" r="${s * 0.62}" fill="url(#glow)" />
    `,
  },
  {
    // Android 13+ themed (monochrome) icon: single-alpha shape, OS applies
    // its own tint, so no gradient here — solid white kept within the
    // same safe zone as the foreground layer.
    name: 'android-icon-monochrome',
    size: 432,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
    build: (s) => `
      ${buildMark({ cx: s / 2, cy: s / 2, radius: 110, stroke: 19, numeralSize: 98, gradId: 'mono', numeralColor: '#FFFFFF', trackColor: 'rgba(255,255,255,0.35)' })
        .replace(/url\(#mono\)/g, '#FFFFFF')}
    `,
  },
  {
    name: 'favicon',
    size: 256, // downscaled to 48 on export
    background: INK,
    build: (s) => `
      <defs>${gradDefs({ gradId: 'g' })}</defs>
      <rect width="${s}" height="${s}" fill="${INK}" />
      ${buildMark({ cx: s / 2, cy: s / 2, radius: 84, stroke: 16, numeralSize: 74, gradId: 'g' })}
    `,
  },
];

const targets = {
  // `opaque: true` marks canvases that must ship with NO alpha channel —
  // Apple's App Store Connect rejects an app icon upload that has one, and an
  // opaque Android background layer should not carry transparency either.
  icon: { file: 'icon.png', size: 1024, opaque: true },
  'splash-icon': { file: 'splash-icon.png', size: 1024, opaque: false },
  'android-icon-foreground': { file: 'android-icon-foreground.png', size: 512, opaque: false },
  'android-icon-background': { file: 'android-icon-background.png', size: 512, opaque: true },
  'android-icon-monochrome': { file: 'android-icon-monochrome.png', size: 432, opaque: false },
  favicon: { file: 'favicon.png', size: 48, opaque: true },
};

for (const variant of variants) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${variant.size}" height="${variant.size}" viewBox="0 0 ${variant.size} ${variant.size}">${variant.build(variant.size)}</svg>`;
  const svgPath = `${OUT}${variant.name}.svg`;
  writeFileSync(svgPath, svg);

  const target = targets[variant.name];
  let pipeline = sharp(Buffer.from(svg)).resize(target.size, target.size);
  if (target.opaque) pipeline = pipeline.flatten({ background: INK });
  await pipeline.png().toFile(`${OUT}${target.file}`);

  const meta = await sharp(`${OUT}${target.file}`).metadata();
  console.log(`wrote ${target.file} (${target.size}x${target.size}) hasAlpha=${meta.hasAlpha}`);
}
