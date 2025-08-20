import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { format } from 'date-fns';
import { LineChart } from 'react-native-chart-kit';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
const screenWidth = Dimensions.get('window').width;

interface Pet {
  id: string;
  name: string;
  species: string;
  breed?: string;
}

interface BreathingRate {
  id: string;
  rate: number;
  timestamp: string;
  notes?: string;
  petId: string;
}

interface BreathingAnalytics {
  totalMeasurements: number;
  averageRate: number;
  minRate: number;
  maxRate: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  normalRange: {
    min: number;
    max: number;
  };
  lastMeasurement?: BreathingRate;
}

export default function BreathingScreen() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPetId, setSelectedPetId] = useState('');
  const [breathingRates, setBreathingRates] = useState<BreathingRate[]>([]);
  const [analytics, setAnalytics] = useState<BreathingAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user?.type !== 'user') {
      router.push('/vet-dashboard');
      return;
    }
    fetchPets();
  }, [user, router]);

  useEffect(() => {
    if (selectedPetId) {
      fetchBreathingData();
    }
  }, [selectedPetId]);

  const fetchPets = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/pets`);
      setPets(response.data.pets);
      if (response.data.pets.length > 0) {
        setSelectedPetId(response.data.pets[0].id);
      }
    } catch (error) {
      console.error('Error fetching pets:', error);
      Alert.alert('Error', 'Failed to load pets');
    } finally {
      setLoading(false);
    }
  };

  const fetchBreathingData = async () => {
    if (!selectedPetId) return;

    try {
      const [ratesResponse, analyticsResponse] = await Promise.all([
        axios.get(`${API_URL}/api/breathing`, { params: { petId: selectedPetId, limit: 20 } }),
        axios.get(`${API_URL}/api/breathing/${selectedPetId}/analytics`)
      ]);

      setBreathingRates(ratesResponse.data.breathingRates);
      setAnalytics(analyticsResponse.data.analytics);
    } catch (error) {
      console.error('Error fetching breathing data:', error);
      Alert.alert('Error', 'Failed to load breathing data');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBreathingData();
    setRefreshing(false);
  };

  const selectedPet = pets.find(pet => pet.id === selectedPetId);

  const chartData = {
    labels: breathingRates.slice(0, 7).reverse().map(rate => 
      format(new Date(rate.timestamp), 'MM/dd')
    ),
    datasets: [
      {
        data: breathingRates.slice(0, 7).reverse().map(rate => rate.rate),
        strokeWidth: 2,
        color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
      }
    ]
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'increasing': return '#ef4444';
      case 'decreasing': return '#f59e0b';
      case 'stable': return '#22c55e';
      default: return '#6b7280';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return '📈';
      case 'decreasing': return '📉';
      case 'stable': return '➡️';
      default: return '➡️';
    }
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

  if (pets.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🐾</Text>
          <Text style={styles.emptyTitle}>No Pets Found</Text>
          <Text style={styles.emptyText}>
            Add a pet first to start monitoring breathing rates
          </Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/pets/add')}
          >
            <Text style={styles.addButtonText}>Add Pet</Text>
          </TouchableOpacity>
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
          <Text style={styles.title}>Breathing Monitor</Text>
          <TouchableOpacity
            style={styles.recordButton}
            onPress={() => router.push('/breathing/record')}
          >
            <Text style={styles.recordButtonText}>+ Record</Text>
          </TouchableOpacity>
        </View>

        {/* Pet Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Pet</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {pets.map((pet) => (
              <TouchableOpacity
                key={pet.id}
                style={[
                  styles.petSelector,
                  selectedPetId === pet.id && styles.petSelectorSelected
                ]}
                onPress={() => setSelectedPetId(pet.id)}
              >
                <Text style={styles.petEmoji}>
                  {pet.species.toLowerCase() === 'dog' ? '🐕' : 
                   pet.species.toLowerCase() === 'cat' ? '🐱' : 
                   pet.species.toLowerCase() === 'bird' ? '🐦' : '🐾'}
                </Text>
                <Text style={[
                  styles.petName,
                  selectedPetId === pet.id && styles.petNameSelected
                ]}>
                  {pet.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {selectedPet && analytics && (
          <>
            {/* Analytics Cards */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Health Overview</Text>
              <View style={styles.analyticsGrid}>
                <View style={styles.analyticsCard}>
                  <Text style={styles.analyticsValue}>{analytics.averageRate}</Text>
                  <Text style={styles.analyticsLabel}>Avg Rate</Text>
                  <Text style={styles.analyticsUnit}>breaths/min</Text>
                </View>
                
                <View style={styles.analyticsCard}>
                  <Text style={[styles.analyticsValue, { color: getTrendColor(analytics.trend) }]}>
                    {getTrendIcon(analytics.trend)}
                  </Text>
                  <Text style={styles.analyticsLabel}>Trend</Text>
                  <Text style={styles.analyticsUnit}>{analytics.trend}</Text>
                </View>
                
                <View style={styles.analyticsCard}>
                  <Text style={styles.analyticsValue}>{analytics.totalMeasurements}</Text>
                  <Text style={styles.analyticsLabel}>Total</Text>
                  <Text style={styles.analyticsUnit}>measurements</Text>
                </View>
              </View>

              {/* Normal Range */}
              <View style={styles.normalRangeCard}>
                <Text style={styles.normalRangeTitle}>
                  Normal Range for {selectedPet.species}
                </Text>
                <Text style={styles.normalRangeText}>
                  {analytics.normalRange.min} - {analytics.normalRange.max} breaths per minute
                </Text>
              </View>
            </View>

            {/* Chart */}
            {breathingRates.length > 1 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recent Trends</Text>
                <View style={styles.chartCard}>
                  <LineChart
                    data={chartData}
                    width={screenWidth - 60}
                    height={200}
                    chartConfig={{
                      backgroundColor: '#ffffff',
                      backgroundGradientFrom: '#ffffff',
                      backgroundGradientTo: '#ffffff',
                      decimalPlaces: 0,
                      color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                      labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                      style: {
                        borderRadius: 16
                      },
                      propsForDots: {
                        r: '4',
                        strokeWidth: '2',
                        stroke: '#3b82f6'
                      }
                    }}
                    bezier
                    style={styles.chart}
                  />
                </View>
              </View>
            )}

            {/* Recent Records */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Records</Text>
              {breathingRates.length > 0 ? (
                <View style={styles.recordsList}>
                  {breathingRates.slice(0, 5).map((record) => (
                    <View key={record.id} style={styles.recordItem}>
                      <View style={styles.recordMain}>
                        <Text style={styles.recordRate}>{record.rate} bpm</Text>
                        <Text style={styles.recordDate}>
                          {format(new Date(record.timestamp), 'MMM dd, yyyy h:mm a')}
                        </Text>
                      </View>
                      {record.notes && (
                        <Text style={styles.recordNotes}>{record.notes}</Text>
                      )}
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyRecords}>
                  <Text style={styles.emptyRecordsText}>No breathing records yet</Text>
                  <TouchableOpacity
                    style={styles.recordFirstButton}
                    onPress={() => router.push('/breathing/record')}
                  >
                    <Text style={styles.recordFirstButtonText}>Record First Measurement</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </>
        )}
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  recordButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  recordButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  petSelector: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 8,
    marginRight: 12,
    alignItems: 'center',
    minWidth: 80,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  petSelectorSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  petEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  petName: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  petNameSelected: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  analyticsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  analyticsCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  analyticsValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  analyticsLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  analyticsUnit: {
    fontSize: 10,
    color: '#9ca3af',
  },
  normalRangeCard: {
    backgroundColor: '#dbeafe',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  normalRangeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
  },
  normalRangeText: {
    fontSize: 12,
    color: '#3730a3',
    marginTop: 2,
  },
  chartCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  chart: {
    borderRadius: 16,
  },
  recordsList: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  recordItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  recordMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recordRate: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  recordDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  recordNotes: {
    fontSize: 14,
    color: '#374151',
    marginTop: 4,
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  addButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyRecords: {
    backgroundColor: '#ffffff',
    padding: 32,
    borderRadius: 8,
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
  emptyRecordsText: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 16,
  },
  recordFirstButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  recordFirstButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
