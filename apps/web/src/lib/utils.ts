import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateFull(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const h = parseInt(hours);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

export function getInitials(firstName: string, lastName?: string): string {
  if (!lastName) return firstName.charAt(0).toUpperCase();
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function generateAvatarColor(name: string): string {
  const colors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
    '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

export function calculateAge(dateOfBirth: Date | string): number {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

export function getAttendanceColor(percentage: number): string {
  if (percentage >= 90) return 'text-success';
  if (percentage >= 80) return 'text-warning';
  return 'text-danger';
}

export function getGradeColor(grade: string): string {
  const gradeColors: Record<string, string> = {
    'A+': 'text-success', 'A': 'text-success', 'A-': 'text-success',
    'B+': 'text-primary', 'B': 'text-primary', 'B-': 'text-primary',
    'C+': 'text-warning', 'C': 'text-warning', 'C-': 'text-warning',
    'D': 'text-danger', 'F': 'text-danger',
  };
  return gradeColors[grade] || 'text-[var(--text-secondary)]';
}

export function getStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    active: 'text-success',
    inactive: 'text-warning',
    transferred: 'text-primary',
    graduated: 'text-success',
    withdrawn: 'text-danger',
    pending: 'text-warning',
    paid: 'text-success',
    overdue: 'text-danger',
    absent: 'text-danger',
    present: 'text-success',
    late: 'text-warning',
  };
  return statusColors[status.toLowerCase()] || 'text-[var(--text-secondary)]';
}
