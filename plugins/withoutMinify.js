// The Expo template enables R8 for release builds. R8 strips and renames the
// ML Kit classes that expo-camera loads by reflection, so on device every
// barcode path (live camera, Google code scanner, still-image scanning)
// failed with "MLKit / Google Play Services not available". The size saving
// is not worth it for a personal app, so release builds are left unminified.
const { withGradleProperties } = require('expo/config-plugins');

const OFF = {
  'android.enableMinifyInReleaseBuilds': 'false',
  'android.enableShrinkResourcesInReleaseBuilds': 'false',
};

module.exports = function withoutMinify(config) {
  return withGradleProperties(config, (cfg) => {
    for (const [key, value] of Object.entries(OFF)) {
      const existing = cfg.modResults.find((p) => p.type === 'property' && p.key === key);
      if (existing) existing.value = value;
      else cfg.modResults.push({ type: 'property', key, value });
    }
    return cfg;
  });
};
