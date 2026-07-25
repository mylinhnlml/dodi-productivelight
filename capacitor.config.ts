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
      serverClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
  ios: {
    contentInset: 'automatic',
    keyboardDisplayRequiresUserAction: false,
  },
};

export default config;
