// Keep this project independent of PostCSS configs in parent directories.
// These are the default processors bundled with the pinned Next.js version.
module.exports = {
  plugins: [
    'next/dist/compiled/postcss-flexbugs-fixes',
    ['next/dist/compiled/postcss-preset-env', {
      browsers: ['defaults'],
      autoprefixer: { flexbox: 'no-2009' },
      stage: 3,
      features: { 'custom-properties': false },
    }],
  ],
};
