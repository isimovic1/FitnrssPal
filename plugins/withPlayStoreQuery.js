// expo-camera checks for Google Play (com.android.vending) before it enables
// the Google code scanner and ML Kit image scanning. Since Android 11 that
// check only works when the app declares the package in <queries>; without it
// the check always fails and barcode scanning silently falls back.
const { withAndroidManifest } = require('expo/config-plugins');

const PACKAGE = 'com.android.vending';

module.exports = function withPlayStoreQuery(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    manifest.queries = manifest.queries ?? [{}];
    const queries = manifest.queries[0];
    queries.package = queries.package ?? [];
    if (!queries.package.some((p) => p.$?.['android:name'] === PACKAGE)) {
      queries.package.push({ $: { 'android:name': PACKAGE } });
    }
    return cfg;
  });
};
