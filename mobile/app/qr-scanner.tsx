import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

export default function QRScannerScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    const getBarCodeScannerPermissions = async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    };

    getBarCodeScannerPermissions();
  }, []);

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanned || loading) return;
    
    setScanned(true);
    setLoading(true);

    try {
      // Parse QR code data
      let qrData;
      try {
        qrData = JSON.parse(data);
      } catch {
        // If not JSON, treat as simple QR code string
        qrData = { qrCode: data };
      }

      // Send to backend to get medication schedule
      const response = await axios.post(`${API_URL}/api/medications/scan`, {
        qrCode: qrData.qrCode || data
      });

      const schedule = response.data.schedule;

      Alert.alert(
        'Medication Schedule Found!',
        `Found medication schedule for ${schedule.pet.name}: ${schedule.medication}`,
        [
          {
            text: 'View Details',
            onPress: () => router.push(`/medication/${schedule.id}`)
          },
          {
            text: 'Scan Another',
            onPress: () => {
              setScanned(false);
              setLoading(false);
            }
          }
        ]
      );
    } catch (error: any) {
      console.error('Error scanning QR code:', error);
      
      let errorMessage = 'Failed to process QR code';
      if (error.response?.status === 404) {
        errorMessage = 'Invalid or expired QR code';
      } else if (error.response?.status === 403) {
        errorMessage = 'This QR code is not for your pet';
      }

      Alert.alert(
        'Scan Error',
        errorMessage,
        [
          {
            text: 'Try Again',
            onPress: () => {
              setScanned(false);
              setLoading(false);
            }
          },
          {
            text: 'Go Back',
            onPress: () => router.back()
          }
        ]
      );
    }
  };

  if (hasPermission === null) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.text}>Requesting camera permission...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.text}>No access to camera</Text>
          <Text style={styles.subtext}>
            Please enable camera access in your device settings to scan QR codes
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.back()}
          >
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.scannerContainer}>
        <BarCodeScanner
          onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
          style={StyleSheet.absoluteFillObject}
        />
        
        {/* Scanning overlay */}
        <View style={styles.overlay}>
          <View style={styles.scanArea}>
            <View style={styles.scanFrame} />
          </View>
          
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsTitle}>
              {loading ? 'Processing...' : 'Scan QR Code'}
            </Text>
            <Text style={styles.instructionsText}>
              {loading 
                ? 'Please wait while we process your medication schedule'
                : 'Position the QR code from your veterinarian within the frame'
              }
            </Text>
          </View>

          {scanned && (
            <TouchableOpacity
              style={styles.rescanButton}
              onPress={() => {
                setScanned(false);
                setLoading(false);
              }}
              disabled={loading}
            >
              <Text style={styles.rescanButtonText}>
                {loading ? 'Processing...' : 'Tap to Scan Again'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  scannerContainer: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 250,
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#ffffff',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  instructionsContainer: {
    position: 'absolute',
    bottom: 120,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  instructionsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: '#ffffff',
    textAlign: 'center',
    opacity: 0.8,
  },
  rescanButton: {
    position: 'absolute',
    bottom: 60,
    left: 20,
    right: 20,
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  rescanButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  text: {
    fontSize: 18,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtext: {
    fontSize: 14,
    color: '#ffffff',
    textAlign: 'center',
    opacity: 0.8,
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
