import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { format } from 'date-fns';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

interface Pet {
  id: string;
  name: string;
  species: string;
  breed?: string;
  medicationSchedules: Array<{
    id: string;
    medication: string;
    frequency: string;
    startDate: string;
    endDate?: string;
  }>;
  breathingRates: Array<{
    id: string;
    rate: number;
    timestamp: string;
  }>;
}

interface DashboardData {
  pets: Pet[];
  upcomingReminders: Array<{
    id: string;
    time: string;
    message: string;
    medication: string;
    petName: string;
  }>;
  recentBreathingRates: Array<{
    id: string;
    rate: number;
    timestamp: string;
    petName: string;
  }>;
}

export default function DashboardScreen() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [petsResponse] = await Promise.all([
        axios.get(`${API_URL}/api/pets`)
      ]);

      setDashboardData({
        pets: petsResponse.data.pets,
        upcomingReminders: [], // Will be populated when reminders API is ready
        recentBreathingRates: []
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: logout }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, {user?.firstName}!</Text>
            <Text style={styles.subtitle}>Welcome back to VetCo</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => router.push('/qr-scanner')}
            >
              <Text style={styles.quickActionIcon}>📱</Text>
              <Text style={styles.quickActionTitle}>Scan QR Code</Text>
              <Text style={styles.quickActionSubtitle}>Add medication schedule</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => router.push('/breathing/record')}
            >
              <Text style={styles.quickActionIcon}>🫁</Text>
              <Text style={styles.quickActionTitle}>Record Breathing</Text>
              <Text style={styles.quickActionSubtitle}>Monitor breathing rate</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => router.push('/messages')}
            >
              <Text style={styles.quickActionIcon}>💬</Text>
              <Text style={styles.quickActionTitle}>Message Vet</Text>
              <Text style={styles.quickActionSubtitle}>Get professional advice</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => router.push('/pets/add')}
            >
              <Text style={styles.quickActionIcon}>🐕</Text>
              <Text style={styles.quickActionTitle}>Add Pet</Text>
              <Text style={styles.quickActionSubtitle}>Register new pet</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* My Pets Overview */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Pets</Text>
            <TouchableOpacity onPress={() => router.push('/pets')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          
          {dashboardData?.pets && dashboardData.pets.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {dashboardData.pets.map((pet) => (
                <TouchableOpacity
                  key={pet.id}
                  style={styles.petCard}
                  onPress={() => router.push(`/pets/${pet.id}`)}
                >
                  <Text style={styles.petEmoji}>
                    {pet.species.toLowerCase() === 'dog' ? '🐕' : 
                     pet.species.toLowerCase() === 'cat' ? '🐱' : 
                     pet.species.toLowerCase() === 'bird' ? '🐦' : '🐾'}
                  </Text>
                  <Text style={styles.petName}>{pet.name}</Text>
                  <Text style={styles.petSpecies}>{pet.species}</Text>
                  <Text style={styles.petMedications}>
                    {pet.medicationSchedules.length} active medications
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No pets registered yet</Text>
              <TouchableOpacity
                style={styles.addPetButton}
                onPress={() => router.push('/pets/add')}
              >
                <Text style={styles.addPetButtonText}>Add Your First Pet</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.activityCard}>
            <Text style={styles.activityTitle}>No recent activity</Text>
            <Text style={styles.activitySubtitle}>
              Start by adding a pet or scanning a medication QR code
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  logoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
  },
  logoutText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  seeAllText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  quickActionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  quickActionSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 2,
  },
  petCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    width: 140,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  petEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  petName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
  },
  petSpecies: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 2,
  },
  petMedications: {
    fontSize: 10,
    color: '#3b82f6',
    textAlign: 'center',
    marginTop: 4,
  },
  emptyState: {
    backgroundColor: '#ffffff',
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  addPetButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addPetButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  activityCard: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  activitySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
});
