'use client';

import { useEffect, useState } from 'react';
import { UserCheck, UserX } from 'lucide-react';
import { api } from '@/lib/api';

type User = { id: string; email: string; firstName: string; lastName: string; role: string; laboratoryId?: string | null; schoolId?: string | null; isActive: boolean; emailVerified: boolean; lastLogin: string | null };

export default function SystemUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState('');
  const load = () => api.get('/system-admin/users').then((response) => setUsers(response.data.data)).catch(() => setError('Unable to load system users.'));
  useEffect(() => { load(); }, []);
  const toggle = async (user: User) => { try { const response = await api.patch(`/system-admin/users/${user.id}/status`, { isActive: !user.isActive }); setUsers((current) => current.map((item) => item.id === user.id ? { ...item, ...response.data.data } : item)); } catch { setError('Unable to update account status.'); } };
  return <div className="space-y-6"><div><p className="text-sm text-primary font-semibold uppercase tracking-[0.15em]">System administration</p><h1 className="text-3xl font-bold mt-2">All users</h1><p className="text-[var(--text-secondary)] mt-1">Review platform access and account activity.</p></div>{error && <div className="p-3 rounded-lg bg-danger/10 text-danger text-sm">{error}</div>}<section className="card p-0 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-[var(--bg-secondary)] text-left"><tr><th className="px-5 py-3">User</th><th className="px-5 py-3">Role</th><th className="px-5 py-3">Email</th><th className="px-5 py-3">Last login</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-border">{users.map((user) => <tr key={user.id}><td className="px-5 py-4 font-medium">{user.firstName} {user.lastName}</td><td className="px-5 py-4">{user.role.replaceAll('_', ' ')}</td><td className="px-5 py-4">{user.email}</td><td className="px-5 py-4">{user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}</td><td className="px-5 py-4"><span className={user.isActive ? 'badge-success' : 'badge-danger'}>{user.isActive ? 'Active' : 'Inactive'}</span></td><td className="px-5 py-4 text-right"><button type="button" onClick={() => toggle(user)} className={user.isActive ? 'btn-ghost text-danger' : 'btn-ghost text-success'} title={user.isActive ? 'Deactivate user' : 'Activate user'}>{user.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}</button></td></tr>)}</tbody></table></div></section></div>;
}
