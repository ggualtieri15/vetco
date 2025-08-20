'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import axios from 'axios';
import { HeartIcon, ClockIcon } from '@heroicons/react/24/outline';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Pet {
  id: string;
  name: string;
  species: string;
  breed?: string;
}

export default function RecordBreathingPage() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPetId, setSelectedPetId] = useState('');
  const [breathingRate, setBreathingRate] = useState('');
  const [notes, setNotes] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [breathCount, setBreathCount] = useState(0);
  const [loading, setLoading] = useState(false);
  
  const { user } = useAuth();
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
      if (response.data.pets.length > 0) {
        setSelectedPetId(response.data.pets[0].id);
      }
    } catch (error) {
      console.error('Error fetching pets:', error);
      toast.error('Failed to load pets');
    }
  };

  const startRecording = () => {
    setIsRecording(true);
    setBreathCount(0);
    setCountdown(15); // 15 second recording

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          finishRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const finishRecording = () => {
    setIsRecording(false);
    // Calculate breaths per minute (15 seconds * 4 = 1 minute)
    const ratePerMinute = breathCount * 4;
    setBreathingRate(ratePerMinute.toString());
  };

  const handleBreathTap = () => {
    if (isRecording) {
      setBreathCount(prev => prev + 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPetId) {
      toast.error('Please select a pet');
      return;
    }

    if (!breathingRate || parseInt(breathingRate) <= 0) {
      toast.error('Please enter a valid breathing rate');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/api/breathing`, {
        petId: selectedPetId,
        rate: parseInt(breathingRate),
        notes: notes.trim() || undefined
      });

      toast.success('Breathing rate recorded successfully!');
      
      if (response.data.alert) {
        toast.error(response.data.alert.message);
      }

      router.push('/breathing');
    } catch (error: any) {
      console.error('Error recording breathing rate:', error);
      toast.error(error.response?.data?.error || 'Failed to record breathing rate');
    } finally {
      setLoading(false);
    }
  };

  const selectedPet = pets.find(pet => pet.id === selectedPetId);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Record Breathing Rate</h1>
          <p className="text-gray-600">
            Monitor your pet's breathing rate by counting breaths per minute
          </p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Pet Selection */}
            <div>
              <label className="form-label">Select Pet</label>
              <select
                value={selectedPetId}
                onChange={(e) => setSelectedPetId(e.target.value)}
                className="form-input"
                required
              >
                <option value="">Choose a pet...</option>
                {pets.map((pet) => (
                  <option key={pet.id} value={pet.id}>
                    {pet.name} ({pet.species})
                  </option>
                ))}
              </select>
            </div>

            {/* Breathing Rate Recording */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Recording Method
              </h3>
              
              {!isRecording && countdown === 0 ? (
                <div className="text-center">
                  <p className="text-gray-600 mb-6">
                    Tap the button below to start a 15-second breathing count. 
                    Watch your pet's chest and tap the heart for each breath.
                  </p>
                  <button
                    type="button"
                    onClick={startRecording}
                    className="bg-primary-600 hover:bg-primary-700 text-white font-semibold py-4 px-8 rounded-lg text-lg"
                  >
                    <ClockIcon className="h-6 w-6 inline mr-2" />
                    Start 15-Second Count
                  </button>
                </div>
              ) : isRecording ? (
                <div className="text-center">
                  <div className="text-6xl font-bold text-primary-600 mb-4">
                    {countdown}
                  </div>
                  <p className="text-lg text-gray-600 mb-6">
                    Tap the heart for each breath you see
                  </p>
                  <button
                    type="button"
                    onClick={handleBreathTap}
                    className="bg-red-500 hover:bg-red-600 text-white rounded-full p-8 text-6xl mb-4"
                  >
                    <HeartIcon className="h-16 w-16" />
                  </button>
                  <div className="text-2xl font-semibold text-gray-900">
                    Breaths counted: {breathCount}
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-green-600 text-xl font-semibold mb-2">
                    Recording Complete!
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-2">
                    {breathingRate} breaths/minute
                  </div>
                  <p className="text-gray-600">
                    Based on {breathCount} breaths in 15 seconds
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setCountdown(0);
                      setBreathingRate('');
                      setBreathCount(0);
                    }}
                    className="mt-4 text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Record Again
                  </button>
                </div>
              )}
            </div>

            {/* Manual Entry */}
            <div>
              <label className="form-label">
                Or Enter Manually (breaths per minute)
              </label>
              <input
                type="number"
                min="1"
                max="200"
                value={breathingRate}
                onChange={(e) => setBreathingRate(e.target.value)}
                className="form-input"
                placeholder="e.g., 25"
                disabled={isRecording}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="form-label">Notes (Optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="form-input h-24 resize-none"
                placeholder="Any observations about your pet's breathing..."
                disabled={isRecording}
              />
            </div>

            {/* Normal Range Info */}
            {selectedPet && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">
                  Normal Range for {selectedPet.species}
                </h4>
                <p className="text-blue-700 text-sm">
                  {selectedPet.species.toLowerCase() === 'dog' && '10-30 breaths per minute'}
                  {selectedPet.species.toLowerCase() === 'cat' && '20-30 breaths per minute'}
                  {selectedPet.species.toLowerCase() === 'rabbit' && '30-60 breaths per minute'}
                  {selectedPet.species.toLowerCase() === 'bird' && '15-45 breaths per minute'}
                  {!['dog', 'cat', 'rabbit', 'bird'].includes(selectedPet.species.toLowerCase()) && '15-40 breaths per minute (general)'}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="btn-secondary flex-1"
                disabled={loading || isRecording}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || isRecording || !breathingRate}
                className="btn-primary flex-1"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mx-auto"></div>
                ) : (
                  'Save Record'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
