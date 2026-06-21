import type { CapacitorConfig } from '@capacitor/core';

const config: CapacitorConfig = {
  appId: 'com.dodiapp.launch',
  appName: 'Dodi',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    // custom URL scheme for OAuth redirect
    App: {
      appUrlOpen: {
        urlScheme: 'dodi',
      },
    },
  },
};

export default config;
