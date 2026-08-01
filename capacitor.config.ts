import type { CapacitorConfig } from '@capacitor/core';

const config: CapacitorConfig = {
  appId: 'com.dodiapp.launch',
  appName: 'Dodi',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
    },
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '182880052939-g1e03pf3mvjjb87ffkrvu8uf9ib628fm.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
  ios: {
    contentInset: 'automatic',
    keyboardDisplayRequiresUserAction: false,
  },
};

export default config;
