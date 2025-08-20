'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import axios from 'axios';
import { format } from 'date-fns';
import {
  PaperAirplaneIcon,
  MagnifyingGlassIcon,
  UserIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
  sender?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  recipient?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  vetSender?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    clinic: string;
  };
  vetRecipient?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    clinic: string;
  };
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

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [veterinarians, setVeterinarians] = useState<Veterinarian[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showVetSearch, setShowVetSearch] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  
  const { user } = useAuth();
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.type !== 'user') {
      router.push('/vet-dashboard');
      return;
    }
    fetchConversations();
    fetchVeterinarians();
  }, [user, router]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages();
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/messages/conversations`);
      setConversations(response.data.conversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const fetchVeterinarians = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/veterinarians`, {
        params: { limit: 20 }
      });
      setVeterinarians(response.data.veterinarians);
    } catch (error) {
      console.error('Error fetching veterinarians:', error);
    }
  };

  const fetchMessages = async () => {
    if (!selectedConversation) return;

    try {
      const selectedConv = conversations.find(c => c.partner.id === selectedConversation);
      if (!selectedConv) return;

      const response = await axios.get(`${API_URL}/api/messages`, {
        params: {
          conversationWith: selectedConversation,
          conversationType: selectedConv.partner.type,
          limit: 50
        }
      });
      setMessages(response.data.messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !selectedConversation) return;

    setSendingMessage(true);

    try {
      const selectedConv = conversations.find(c => c.partner.id === selectedConversation);
      if (!selectedConv) return;

      const response = await axios.post(`${API_URL}/api/messages`, {
        recipientId: selectedConversation,
        content: newMessage.trim(),
        recipientType: selectedConv.partner.type
      });

      setMessages(prev => [...prev, response.data.data]);
      setNewMessage('');
      
      // Update conversations list
      await fetchConversations();
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error(error.response?.data?.error || 'Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const startNewConversation = (vetId: string) => {
    setSelectedConversation(vetId);
    setShowVetSearch(false);
    setSearchQuery('');
    
    // Add to conversations if not already there
    const vet = veterinarians.find(v => v.id === vetId);
    if (vet && !conversations.find(c => c.partner.id === vetId)) {
      const newConv: Conversation = {
        partner: {
          id: vet.id,
          firstName: vet.firstName,
          lastName: vet.lastName,
          email: vet.email,
          type: 'veterinarian',
          clinic: vet.clinic
        },
        lastMessage: {} as Message,
        unreadCount: 0
      };
      setConversations(prev => [newConv, ...prev]);
    }
  };

  const filteredVeterinarians = veterinarians.filter(vet =>
    `${vet.firstName} ${vet.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vet.clinic.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedConv = conversations.find(c => c.partner.id === selectedConversation);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="flex h-screen">
          {/* Conversations Sidebar */}
          <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Messages</h2>
                <button
                  onClick={() => setShowVetSearch(!showVetSearch)}
                  className="text-primary-600 hover:text-primary-700 font-medium text-sm"
                >
                  + New Chat
                </button>
              </div>

              {/* Veterinarian Search */}
              {showVetSearch && (
                <div className="space-y-3">
                  <div className="relative">
                    <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search veterinarians..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 form-input"
                    />
                  </div>
                  
                  {searchQuery && (
                    <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md">
                      {filteredVeterinarians.map((vet) => (
                        <button
                          key={vet.id}
                          onClick={() => startNewConversation(vet.id)}
                          className="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">
                            Dr. {vet.firstName} {vet.lastName}
                          </div>
                          <div className="text-sm text-gray-500">{vet.clinic}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto">
              {conversations.length > 0 ? (
                conversations.map((conversation) => (
                  <button
                    key={conversation.partner.id}
                    onClick={() => setSelectedConversation(conversation.partner.id)}
                    className={`w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50 ${
                      selectedConversation === conversation.partner.id ? 'bg-primary-50 border-primary-200' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        {conversation.partner.type === 'veterinarian' ? (
                          <BuildingOfficeIcon className="h-8 w-8 text-primary-600" />
                        ) : (
                          <UserIcon className="h-8 w-8 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900">
                          {conversation.partner.type === 'veterinarian' ? 'Dr. ' : ''}
                          {conversation.partner.firstName} {conversation.partner.lastName}
                        </div>
                        {conversation.partner.clinic && (
                          <div className="text-sm text-gray-500">{conversation.partner.clinic}</div>
                        )}
                        {conversation.lastMessage?.content && (
                          <div className="text-sm text-gray-500 truncate">
                            {conversation.lastMessage.content}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-8 text-center">
                  <div className="text-4xl mb-4">💬</div>
                  <div className="text-gray-500">No conversations yet</div>
                  <div className="text-sm text-gray-400 mt-2">
                    Search for a veterinarian to start chatting
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            {selectedConv ? (
              <>
                {/* Chat Header */}
                <div className="p-4 bg-white border-b border-gray-200">
                  <div className="flex items-center space-x-3">
                    {selectedConv.partner.type === 'veterinarian' ? (
                      <BuildingOfficeIcon className="h-8 w-8 text-primary-600" />
                    ) : (
                      <UserIcon className="h-8 w-8 text-gray-400" />
                    )}
                    <div>
                      <div className="font-medium text-gray-900">
                        {selectedConv.partner.type === 'veterinarian' ? 'Dr. ' : ''}
                        {selectedConv.partner.firstName} {selectedConv.partner.lastName}
                      </div>
                      {selectedConv.partner.clinic && (
                        <div className="text-sm text-gray-500">{selectedConv.partner.clinic}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((message) => {
                    const isFromCurrentUser = message.senderId === user?.id || message.vetSenderId === user?.id;
                    
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isFromCurrentUser ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            isFromCurrentUser
                              ? 'bg-primary-600 text-white'
                              : 'bg-white border border-gray-200 text-gray-900'
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <p className={`text-xs mt-1 ${
                            isFromCurrentUser ? 'text-primary-200' : 'text-gray-500'
                          }`}>
                            {format(new Date(message.timestamp), 'h:mm a')}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="p-4 bg-white border-t border-gray-200">
                  <form onSubmit={sendMessage} className="flex space-x-4">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="flex-1 form-input"
                      disabled={sendingMessage}
                    />
                    <button
                      type="submit"
                      disabled={!newMessage.trim() || sendingMessage}
                      className="btn-primary px-6 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sendingMessage ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      ) : (
                        <PaperAirplaneIcon className="h-5 w-5" />
                      )}
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <div className="text-6xl mb-4">💬</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Select a conversation
                  </h3>
                  <p className="text-gray-500">
                    Choose a conversation from the sidebar or start a new one with a veterinarian
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
