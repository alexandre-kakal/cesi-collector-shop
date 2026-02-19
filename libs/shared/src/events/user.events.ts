export const USER_EVENTS = {
  REGISTERED: 'user.registered',
  UPDATED: 'user.updated',
  DELETED: 'user.deleted',
} as const;

export interface UserRegisteredEvent {
  userId: string;
  email: string;
  role: string;
  registeredAt: Date;
}

export interface UserUpdatedEvent {
  userId: string;
  email?: string;
  role?: string;
  updatedAt: Date;
}
