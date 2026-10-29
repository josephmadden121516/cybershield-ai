import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cybershield.ai',
  appName: 'ShieldPocket',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
