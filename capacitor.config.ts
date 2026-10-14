import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.visionace.motion',
  appName: 'Motion',
  webDir: 'dist',
  server: {
    url:'http://192.168.118.5:3000',
    cleartext: true
  }
};

export default config;
