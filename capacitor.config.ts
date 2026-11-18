import type { CapacitorConfig } from '@capacitor/cli';

// The Android app must load the built files in `dist` (webDir), not a development server.
// For live reload during development only, temporarily add:
//   server: { url: 'http://<your-computer-ip>:5173', cleartext: true }
// and remove it again before building a release.
const config: CapacitorConfig = {
  appId: 'com.visionace.motion',
  appName: 'Motion',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
