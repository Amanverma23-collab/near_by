import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nearbe.app',
  appName: 'NearBe',
  webDir: 'dist',
  server: {
    url: 'http://192.168.31.88:5173',
    cleartext: true
  }
};

export default config;
