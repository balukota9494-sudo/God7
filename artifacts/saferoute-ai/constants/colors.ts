/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: '#15261F',
    tint: '#1B5A42',

    // Core surfaces
    background: '#F4F7F1',
    foreground: '#15261F',

    // Cards / elevated surfaces
    card: '#FFFFFF',
    cardForeground: '#15261F',

    // Primary action color (buttons, links, active states)
    primary: '#1B5A42',
    primaryForeground: '#FFFFFF',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#EAF0E8',
    secondaryForeground: '#253B31',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#E8EEE6',
    mutedForeground: '#718078',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#E58963',
    accentForeground: '#FFFFFF',

    // Destructive actions (delete, error states)
    destructive: '#B84238',
    destructiveForeground: '#FFFFFF',

    // Borders and input outlines
    border: '#E1E9E0',
    input: '#D8E2D8',
    routeSafe: '#267150',
    routeQuick: '#C97938',
    routeSteady: '#47759A',
    deepGreen: '#173D31',
    lime: '#D6EF78',
    safeTint: '#E5F1E8',
    accentTint: '#F8EAE3',
    destructiveTint: '#FBEAE7',
    mapSurface: '#EDF2E8',
    mapRoad: '#D5E0D3',
    mapPark: '#DAE9D7',
    onDarkMuted: '#C3D4CB',
    statusBarStyle: 'dark' as const,
  },

  dark: {
    text: '#EFF4EF',
    tint: '#9BD1AC',
    background: '#111B16',
    foreground: '#EFF4EF',
    card: '#19251F',
    cardForeground: '#EFF4EF',
    primary: '#8BC5A0',
    primaryForeground: '#11251B',
    secondary: '#202E27',
    secondaryForeground: '#DFE8E0',
    muted: '#25342C',
    mutedForeground: '#A2B1A8',
    accent: '#E89A73',
    accentForeground: '#17231D',
    destructive: '#ED897D',
    destructiveForeground: '#281210',
    border: '#314139',
    input: '#394A40',
    routeSafe: '#8BCBA2',
    routeQuick: '#F0AE77',
    routeSteady: '#91B8DD',
    deepGreen: '#1D4436',
    lime: '#DAF28B',
    safeTint: '#20372A',
    accentTint: '#3B2B23',
    destructiveTint: '#3A2522',
    mapSurface: '#1A2921',
    mapRoad: '#314139',
    mapPark: '#28483A',
    onDarkMuted: '#C3D4CB',
    statusBarStyle: 'light' as const,
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 8,
};

export default colors;
