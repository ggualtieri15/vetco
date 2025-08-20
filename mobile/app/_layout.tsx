import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { AuthProvider } from '../contexts/AuthContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    'Inter-Regular': require('../assets/fonts/Inter-Regular.ttf'),
    'Inter-Medium': require('../assets/fonts/Inter-Medium.ttf'),
    'Inter-SemiBold': require('../assets/fonts/Inter-SemiBold.ttf'),
    'Inter-Bold': require('../assets/fonts/Inter-Bold.ttf'),
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <NotificationProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="auth" options={{ headerShown: false }} />
          <Stack.Screen name="qr-scanner" options={{ 
            headerTitle: 'Scan QR Code',
            headerBackTitle: 'Back'
          }} />
          <Stack.Screen name="medication" options={{ 
            headerTitle: 'Medication Details',
            headerBackTitle: 'Back'
          }} />
          <Stack.Screen name="breathing" options={{ 
            headerTitle: 'Breathing Rate',
            headerBackTitle: 'Back'
          }} />
          <Stack.Screen name="chat" options={{ 
            headerTitle: 'Messages',
            headerBackTitle: 'Back'
          }} />
        </Stack>
      </NotificationProvider>
    </AuthProvider>
  );
}
