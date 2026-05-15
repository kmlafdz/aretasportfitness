import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.areta.sport',
  appName: 'Areta Fitness',
  webDir: 'out',
  server: {
    url: 'https://aretasportmanagement.web.app',
    cleartext: true
  }
};

export default config;
