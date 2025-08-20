import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  TextInput,
  FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { format } from 'date-fns';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

interface Veterinarian {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  clinic: string;
}

interface Message {
  id: string;
  content: string;
  timestamp: string;
  isRead: boolean;
  senderId?: string;
  recipientId?: string;
  vetSenderId?: string;
  vetRecipientId?: string;
}

interface Conversation {
  partner: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    type: 'user' | 'veterinarian';
    clinic?: string;
  };
  lastMessage: Message;
  unreadCount: number;
}

export default function MessagesScreen() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [veterinarians, setVeterinarians] = useState<Veterinarian[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showVetSearch, setShowVetSearch] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user?.type !== 'user') {
      router.push('/vet-dashboard');
      return;
    }
    fetchData();
  }, [user, router]);

  const fetchData = async () => {
    try {
      const [conversationsResponse, veterinariansResponse] = await Promise.all([
        axios.get(`${API_URL}/api/messages/conversations`),
        axios.get(`${API_URL}/api/veterinarians`, { params: { limit: 20 } })
      ]);

      setConversations(conversationsResponse.data.conversations);
      setVeterinarians(veterinariansResponse.data.veterinarians);
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const openConversation = (partnerId: string, partnerType: 'user' | 'veterinarian') => {
    router.push(`/chat/${partnerId}?type=${partnerType}`);
  };

  const startNewConversation = (vet: Veterinarian) => {
    setShowVetSearch(false);
    setSearchQuery('');
    router.push(`/chat/${vet.id}?type=veterinarian&name=${encodeURIComponent(`Dr. ${vet.firstName} ${vet.lastName}`)}&clinic=${encodeURIComponent(vet.clinic)}`);
  };

  const filteredVeterinarians = veterinarians.filter(vet =>
    `${vet.firstName} ${vet.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vet.clinic.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <TouchableOpacity
          style={styles.newChatButton}
          onPress={() => setShowVetSearch(!showVetSearch)}
        >
          <Text style={styles.newChatButtonText}>+ New Chat</Text>
        </TouchableOpacity>
      </View>

      {/* Veterinarian Search */}
      {showVetSearch && (
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search veterinarians..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          
          {searchQuery && (
            <ScrollView style={styles.searchResults} nestedScrollEnabled>
              {filteredVeterinarians.map((vet) => (
                <TouchableOpacity
                  key={vet.id}
                  style={styles.vetSearchItem}
                  onPress={() => startNewConversation(vet)}
                >
                  <View style={styles.vetInfo}>
                    <Text style={styles.vetName}>
                      Dr. {vet.firstName} {vet.lastName}
                    </Text>
                    <Text style={styles.vetClinic}>{vet.clinic}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {/* Conversations List */}
      <ScrollView
        style={styles.conversationsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {conversations.length > 0 ? (
          conversations.map((conversation) => (
            <TouchableOpacity
              key={conversation.partner.id}
              style={styles.conversationItem}
              onPress={() => openConversation(conversation.partner.id, conversation.partner.type)}
            >
              <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>
                  {conversation.partner.type === 'veterinarian' ? '👨‍⚕️' : '👤'}
                </Text>
              </View>
              
              <View style={styles.conversationContent}>
                <View style={styles.conversationHeader}>
                  <Text style={styles.partnerName}>
                    {conversation.partner.type === 'veterinarian' ? 'Dr. ' : ''}
                    {conversation.partner.firstName} {conversation.partner.lastName}
                  </Text>
                  {conversation.lastMessage?.timestamp && (
                    <Text style={styles.timestamp}>
                      {format(new Date(conversation.lastMessage.timestamp), 'MMM dd')}
                    </Text>
                  )}
                </View>
                
                {conversation.partner.clinic && (
                  <Text style={styles.clinic}>{conversation.partner.clinic}</Text>
                )}
                
                {conversation.lastMessage?.content && (
                  <Text style={styles.lastMessage} numberOfLines={1}>
                    {conversation.lastMessage.content}
                  </Text>
                )}
              </View>
              
              {conversation.unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadCount}>{conversation.unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptyText}>
              Start a conversation with a veterinarian to get professional advice about your pet's health
            </Text>
            <TouchableOpacity
              style={styles.startChatButton}
              onPress={() => setShowVetSearch(true)}
            >
              <Text style={styles.startChatButtonText}>Find a Veterinarian</Text>
            </TouchableOpacity>
          </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  newChatButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  newChatButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  searchContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
  searchResults: {
    maxHeight: 200,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  vetSearchItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  vetInfo: {
    flex: 1,
  },
  vetName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  vetClinic: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  conversationsList: {
    flex: 1,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  partnerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  timestamp: {
    fontSize: 12,
    color: '#6b7280',
  },
  clinic: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  lastMessage: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  unreadBadge: {
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadCount: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
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
    lineHeight: 24,
  },
  startChatButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  startChatButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
