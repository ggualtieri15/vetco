'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import axios from 'axios';
import {
  PlusIcon,
  QrCodeIcon,
  HeartIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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

export default function DashboardPage() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user?.type !== 'user') {
      router.push('/vet-dashboard');
      return;
    }
    fetchPets();
  }, [user, router]);

  const fetchPets = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/pets`);
      setPets(response.data.pets);
    } catch (error) {
      console.error('Error fetching pets:', error);
      toast.error('Failed to load pets');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome back, {user?.firstName}!
              </h1>
              <p className="text-gray-600">Manage your pets' health and medications</p>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/qr-scanner"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
              >
                <QrCodeIcon className="h-4 w-4 mr-2" />
                Scan QR Code
              </Link>
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-gray-700"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link
            href="/qr-scanner"
            className="card hover:shadow-lg transition-shadow cursor-pointer"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <QrCodeIcon className="h-8 w-8 text-primary-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Scan QR Code</h3>
                <p className="text-sm text-gray-500">Add medication schedule</p>
              </div>
            </div>
          </Link>

          <Link
            href="/breathing/record"
            className="card hover:shadow-lg transition-shadow cursor-pointer"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <HeartIcon className="h-8 w-8 text-secondary-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Record Breathing</h3>
                <p className="text-sm text-gray-500">Monitor breathing rate</p>
              </div>
            </div>
          </Link>

          <Link
            href="/messages"
            className="card hover:shadow-lg transition-shadow cursor-pointer"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChatBubbleLeftRightIcon className="h-8 w-8 text-success-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Message Vet</h3>
                <p className="text-sm text-gray-500">Get professional advice</p>
              </div>
            </div>
          </Link>

          <Link
            href="/pets/add"
            className="card hover:shadow-lg transition-shadow cursor-pointer"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <PlusIcon className="h-8 w-8 text-warning-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Add Pet</h3>
                <p className="text-sm text-gray-500">Register new pet</p>
              </div>
            </div>
          </Link>
        </div>

        {/* My Pets Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">My Pets</h2>
            <Link
              href="/pets"
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              View All
            </Link>
          </div>

          {pets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pets.map((pet) => (
                <Link
                  key={pet.id}
                  href={`/pets/${pet.id}`}
                  className="card hover:shadow-lg transition-shadow cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{pet.name}</h3>
                      <p className="text-sm text-gray-500">
                        {pet.species} {pet.breed && `• ${pet.breed}`}
                      </p>
                    </div>
                    <div className="text-4xl">
                      {pet.species.toLowerCase() === 'dog' ? '🐕' : 
                       pet.species.toLowerCase() === 'cat' ? '🐱' : 
                       pet.species.toLowerCase() === 'bird' ? '🐦' : '🐾'}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-600">
                      <ClockIcon className="h-4 w-4 mr-2" />
                      {pet.medicationSchedules.length} active medications
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <ChartBarIcon className="h-4 w-4 mr-2" />
                      {pet.breathingRates.length} breathing records
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="card text-center py-12">
              <div className="text-6xl mb-4">🐾</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No pets registered yet</h3>
              <p className="text-gray-500 mb-6">
                Add your first pet to start managing their health and medications
              </p>
              <Link
                href="/pets/add"
                className="btn-primary inline-flex items-center"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Your First Pet
              </Link>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-6">Recent Activity</h2>
          <div className="card">
            <div className="text-center py-8">
              <div className="text-4xl mb-4">📋</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No recent activity</h3>
              <p className="text-gray-500">
                Start by adding a pet or scanning a medication QR code
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
