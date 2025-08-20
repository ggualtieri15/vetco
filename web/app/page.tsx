'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { 
  HeartIcon, 
  ClockIcon, 
  ChatBubbleLeftRightIcon,
  QrCodeIcon,
  ChartBarIcon,
  ShieldCheckIcon 
} from '@heroicons/react/24/outline';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      if (user.type === 'user') {
        router.push('/dashboard');
      } else {
        router.push('/vet-dashboard');
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (user) {
    return null; // Will redirect based on user type
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary-600 via-primary-700 to-secondary-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="pt-20 pb-16 text-center lg:pt-32">
            <h1 className="mx-auto max-w-4xl font-display text-5xl font-medium tracking-tight text-white sm:text-7xl">
              Pet Health
              <span className="relative whitespace-nowrap text-secondary-300">
                <span className="relative"> Made Simple</span>
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg tracking-tight text-primary-100">
              Manage medication schedules, monitor breathing rates, and stay connected with your veterinarian - all in one place.
            </p>
            <div className="mt-10 flex justify-center gap-x-6">
              <Link
                href="/auth/register"
                className="group inline-flex items-center justify-center rounded-full py-2 px-4 text-sm font-semibold focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 bg-white text-primary-900 hover:bg-primary-50 active:bg-primary-200 active:text-primary-600 focus-visible:outline-white"
              >
                Get Started
              </Link>
              <Link
                href="/auth/login"
                className="group inline-flex ring-1 items-center justify-center rounded-full py-2 px-4 text-sm focus:outline-none ring-primary-200 text-white hover:ring-primary-300 active:bg-primary-100 active:text-primary-600 focus-visible:outline-primary-600 focus-visible:ring-primary-300"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-base text-primary-600 font-semibold tracking-wide uppercase">Features</h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Everything you need for pet care
            </p>
            <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">
              Our comprehensive platform helps you stay on top of your pet's health with smart reminders, monitoring tools, and direct veterinarian communication.
            </p>
          </div>

          <div className="mt-20">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {/* Medication Management */}
              <div className="pt-6">
                <div className="flow-root bg-gray-50 rounded-lg px-6 pb-8">
                  <div className="-mt-6">
                    <div>
                      <span className="inline-flex items-center justify-center p-3 bg-primary-500 rounded-md shadow-lg">
                        <QrCodeIcon className="h-6 w-6 text-white" aria-hidden="true" />
                      </span>
                    </div>
                    <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">QR Code Medication Schedules</h3>
                    <p className="mt-5 text-base text-gray-500">
                      Scan QR codes from your vet to instantly import medication schedules. Set smart reminders and never miss a dose.
                    </p>
                  </div>
                </div>
              </div>

              {/* Breathing Rate Monitoring */}
              <div className="pt-6">
                <div className="flow-root bg-gray-50 rounded-lg px-6 pb-8">
                  <div className="-mt-6">
                    <div>
                      <span className="inline-flex items-center justify-center p-3 bg-secondary-500 rounded-md shadow-lg">
                        <HeartIcon className="h-6 w-6 text-white" aria-hidden="true" />
                      </span>
                    </div>
                    <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">Breathing Rate Monitoring</h3>
                    <p className="mt-5 text-base text-gray-500">
                      Track your pet's breathing patterns with easy-to-use tools. Get alerts for abnormal readings and trends.
                    </p>
                  </div>
                </div>
              </div>

              {/* Veterinarian Communication */}
              <div className="pt-6">
                <div className="flow-root bg-gray-50 rounded-lg px-6 pb-8">
                  <div className="-mt-6">
                    <div>
                      <span className="inline-flex items-center justify-center p-3 bg-success-500 rounded-md shadow-lg">
                        <ChatBubbleLeftRightIcon className="h-6 w-6 text-white" aria-hidden="true" />
                      </span>
                    </div>
                    <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">Direct Vet Communication</h3>
                    <p className="mt-5 text-base text-gray-500">
                      Message your veterinarian directly through the app. Share updates, ask questions, and get professional advice.
                    </p>
                  </div>
                </div>
              </div>

              {/* Smart Reminders */}
              <div className="pt-6">
                <div className="flow-root bg-gray-50 rounded-lg px-6 pb-8">
                  <div className="-mt-6">
                    <div>
                      <span className="inline-flex items-center justify-center p-3 bg-warning-500 rounded-md shadow-lg">
                        <ClockIcon className="h-6 w-6 text-white" aria-hidden="true" />
                      </span>
                    </div>
                    <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">Smart Reminders</h3>
                    <p className="mt-5 text-base text-gray-500">
                      Receive push notifications for medication times, health check reminders, and important veterinary updates.
                    </p>
                  </div>
                </div>
              </div>

              {/* Health Analytics */}
              <div className="pt-6">
                <div className="flow-root bg-gray-50 rounded-lg px-6 pb-8">
                  <div className="-mt-6">
                    <div>
                      <span className="inline-flex items-center justify-center p-3 bg-purple-500 rounded-md shadow-lg">
                        <ChartBarIcon className="h-6 w-6 text-white" aria-hidden="true" />
                      </span>
                    </div>
                    <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">Health Analytics</h3>
                    <p className="mt-5 text-base text-gray-500">
                      View trends and patterns in your pet's health data. Identify potential issues early with smart analytics.
                    </p>
                  </div>
                </div>
              </div>

              {/* Secure & Private */}
              <div className="pt-6">
                <div className="flow-root bg-gray-50 rounded-lg px-6 pb-8">
                  <div className="-mt-6">
                    <div>
                      <span className="inline-flex items-center justify-center p-3 bg-gray-600 rounded-md shadow-lg">
                        <ShieldCheckIcon className="h-6 w-6 text-white" aria-hidden="true" />
                      </span>
                    </div>
                    <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">Secure & Private</h3>
                    <p className="mt-5 text-base text-gray-500">
                      Your pet's health data is encrypted and secure. HIPAA-compliant veterinary communication platform.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-primary-700">
        <div className="max-w-2xl mx-auto text-center py-16 px-4 sm:py-20 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            <span className="block">Ready to get started?</span>
            <span className="block">Join thousands of pet owners today.</span>
          </h2>
          <p className="mt-4 text-lg leading-6 text-primary-200">
            Create your account and start managing your pet's health more effectively.
          </p>
          <Link
            href="/auth/register"
            className="mt-8 w-full inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-primary-600 bg-white hover:bg-primary-50 sm:w-auto"
          >
            Sign up for free
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 md:flex md:items-center md:justify-between lg:px-8">
          <div className="flex justify-center space-x-6 md:order-2">
            <p className="text-gray-400 text-sm">
              &copy; 2024 VetCo. All rights reserved.
            </p>
          </div>
          <div className="mt-8 md:mt-0 md:order-1">
            <p className="text-center text-base text-gray-400">
              Making pet healthcare accessible and manageable for everyone.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
