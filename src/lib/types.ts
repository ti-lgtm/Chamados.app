import type { Timestamp } from 'firebase/firestore';

export type UserRole = 'user' | 'ti' | 'admin';

export interface AppUser {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'active' | 'suspended';
  createdAt: Timestamp;
  avatarUrl?: string;
}

export interface Ticket {
  id: string;
  ticketNumber: number;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved';
  priority: 'low' | 'normal' | 'high';
  userId: string;
  user?: AppUser;
  assignedTo: string | null;
  assignedUser?: AppUser | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  attachments?: string[];
}

export interface Comment {
  id: string;
  ticketId: string;
  userId: string;
  userName: string;
  userAvatarUrl?: string;
  message: string;
  createdAt: Timestamp;
}

export interface Rating {
  id: string;
  ticketId: string;
  userId: string;
  rating: number;
  comment?: string;
  createdAt: Timestamp;
}
