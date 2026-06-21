import type { CapacitorConfig } from '@capacitor/core';

const config: CapacitorConfig = {
  appId: 'com.dodiapp.launch',
  appName: 'Dodi',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
