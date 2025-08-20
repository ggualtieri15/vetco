import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { useAuth } from './AuthContext';
import axios from 'axios';

interface NotificationContextType {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  registerForPushNotificationsAsync: () => Promise<string | null>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

// Configure notification handling
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const { user, token } = useAuth();

  useEffect(() => {
    if (user && token) {
      registerForPushNotificationsAsync().then(token => {
        if (token) {
          setExpoPushToken(token);
          // Register token with backend
          registerTokenWithBackend(token);
        }
      });
    }

    // Listen for incoming notifications
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    // Listen for notification responses (when user taps notification)
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      
      // Handle different notification types
      if (data?.type === 'medication_reminder') {
        // Navigate to medication details
        console.log('Navigate to medication:', data.scheduleId);
      } else if (data?.type === 'message') {
        // Navigate to chat
        console.log('Navigate to chat:', data.conversationId);
      }
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }, [user, token]);

  const registerForPushNotificationsAsync = async (): Promise<string | null> => {
    let token;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        alert('Failed to get push token for push notification!');
        return null;
      }
      
      token = (await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      })).data;
      
      console.log('Expo push token:', token);
    } else {
      alert('Must use physical device for Push Notifications');
    }

    return token || null;
  };

  const registerTokenWithBackend = async (pushToken: string) => {
    try {
      await axios.post(`${API_URL}/api/push-tokens`, {
        token: pushToken,
        platform: Platform.OS
      });
      console.log('Push token registered with backend');
    } catch (error) {
      console.error('Failed to register push token:', error);
    }
  };

  const value = {
    expoPushToken,
    notification,
    registerForPushNotificationsAsync
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
