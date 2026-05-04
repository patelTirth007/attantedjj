export type UserRole = 'admin' | 'faculty' | 'student';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  studentId?: string;
  courseId?: string;
  createdAt: number;
}

export interface Course {
  id: string;
  name: string;
  facultyId: string;
  code: string;
}

export interface Session {
  id: string;
  courseId: string;
  facultyId: string;
  startTime: number;
  endTime?: number;
  qrSecret: string;
  isActive: boolean;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  studentId: string;
  courseId: string;
  timestamp: number;
  verified: boolean;
}
