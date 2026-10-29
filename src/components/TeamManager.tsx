import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Shield, 
  UserPlus, 
  Check, 
  X, 
  ShieldAlert, 
  Info, 
  Eye, 
  Sliders, 
  Mail, 
  Clock,
  Sparkles
} from 'lucide-react';
import { UserProfile, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import { subscribeToTeam } from '../services/db';

export const TeamManager: React.FC = () => {
  const { user, profile, activeRole, isSimulatedRole, setSimulatedRole, canManageTeam, updateUserRole } = useAuth();
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('staff');
  const [inviteSuccess, setInviteSuccess] = useState(false);

  useEffect(() => {
    if (!user) {
      if (profile) setTeamMembers([profile]);
      return;
    }
    const unsub = subscribeToTeam((members) => {
      // Ensure current user is in list
      if (members.length === 0 && profile) {
        setTeamMembers([profile]);
      } else {
        setTeamMembers(members);
      }
    });
    return () => unsub();
  }, [user, profile]);

  const handleRoleChange = async (uid: string, newRole: UserRole) => {
    if (!canManageTeam) return;
    try {
      await updateUserRole(uid, newRole);
    } catch (err) {
      console.error('Error updating role', err);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    // Simulate/create invitation document
    const fakeUid = 'user_' + Math.random().toString(36).substring(2, 9);
    try {
      await updateUserRole(fakeUid, inviteRole);
      setInviteSuccess(true);
      setInviteEmail('');
      setInviteName('');
      setTimeout(() => setInviteSuccess(false), 3000);
    } catch (err) {
      console.error('Error inviting member', err);
    }
  };

  const roleDefinitions: Record<UserRole, { title: string; desc: string; badge: string }> = {
    admin: {
      title: 'Administrator / Owner',
      desc: 'Full control over inventory, sales, financial margins, deleting items, and managing team member roles.',
      badge: 'bg-purple-100 text-purple-800 border-purple-200',
    },
    manager: {
      title: 'Inventory Manager',
      desc: 'Can add/edit inventory, manage orders, view net profit margins, manage vendors, and import CSV files.',
      badge: 'bg-blue-100 text-blue-800 border-blue-200',
    },
    staff: {
      title: 'Sales Associate / Staff',
      desc: 'Focused non-technical role: Can view stock, record sales, and update fulfillment tracking. Profit margins and cost prices are masked.',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    },
    viewer: {
      title: 'Auditor / Viewer',
      desc: 'Read-only access to view current inventory counts and order records without editing privileges.',
      badge: 'bg-slate-100 text-slate-800 border-slate-200',
    },
  };

  const permissionMatrix = [
    { name: 'View Inventory & Stock Counts', admin: true, manager: true, staff: true, viewer: true },
    { name: 'Record Sales & Update Tracking', admin: true, manager: true, staff: true, viewer: false },
    { name: 'Adjust Stock Counts (+ / -)', admin: true, manager: true, staff: true, viewer: false },
    { name: 'View Purchase Costs & Profit Margins', admin: true, manager: true, staff: false, viewer: false },
    { name: 'Add / Edit Inventory Products', admin: true, manager: true, staff: false, viewer: false },
    { name: 'Manage Suppliers & Vendors', admin: true, manager: true, staff: false, viewer: false },
    { name: 'Automated CSV Sales Import', admin: true, manager: true, staff: false, viewer: false },
    { name: 'Delete Inventory / Orders', admin: true, manager: true, staff: false, viewer: false },
    { name: 'Manage Team Member Roles (RBAC)', admin: true, manager: false, staff: false, viewer: false },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Role-Based Access Control (RBAC)
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
              Active Role: {activeRole.toUpperCase()}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Safely delegate marketplace listing, fulfillment, and packaging tasks to team members with granular security.
          </p>
        </div>
      </div>

      {/* Role Switcher Sandbox (Admin Testing Tool) */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-400" />
            <h2 className="font-bold text-sm sm:text-base">Role Testing Sandbox</h2>
          </div>
          {isSimulatedRole && (
            <button
              onClick={() => setSimulatedRole(null)}
              className="text-xs bg-white/20 hover:bg-white/30 text-white px-2.5 py-1 rounded-md font-semibold cursor-pointer"
            >
              Reset to Actual ({profile?.role})
            </button>
          )}
        </div>
        <p className="text-xs text-slate-300 max-w-2xl">
          Instantly test how the application behaves for non-technical team members or sales associates. Notice how financial net margins, vendor cost secrets, and delete buttons are masked when in <strong>Staff</strong> or <strong>Viewer</strong> mode!
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {(['admin', 'manager', 'staff', 'viewer'] as UserRole[]).map((r) => (
            <button
              key={r}
              onClick={() => setSimulatedRole(r === profile?.role ? null : r)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeRole === r
                  ? 'bg-blue-500 text-white shadow-md shadow-blue-500/30 ring-2 ring-white/30'
                  : 'bg-white/10 hover:bg-white/20 text-slate-200'
              }`}
            >
              <span className="capitalize">{r}</span>
              {activeRole === r && ' (Active)'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid: Team Members List + Invite Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Members List */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="font-bold text-slate-900 text-sm sm:text-base">Team Members & Permissions</h2>
              <p className="text-xs text-slate-500">Currently active accounts and assigned access levels</p>
            </div>
            <Users className="w-4 h-4 text-slate-400" />
          </div>

          <div className="mt-4 divide-y divide-slate-100">
            {teamMembers.map((member) => {
              const isCurrentUser = member.uid === user?.uid || member.uid === profile?.uid;
              const isOwner = member.email?.toLowerCase() === 'ecomtanger1@gmail.com';

              return (
                <div key={member.uid} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs">
                      {(member.displayName || member.email || 'U').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          {member.displayName || member.email?.split('@')[0]}
                        </span>
                        {isCurrentUser && (
                          <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded">
                            You
                          </span>
                        )}
                        {isOwner && (
                          <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded">
                            Owner
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 block">{member.email}</span>
                    </div>
                  </div>

                  {/* Role Selector / Display */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {canManageTeam && !isOwner ? (
                      <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.uid, e.target.value as UserRole)}
                        className="text-xs font-bold rounded-lg border border-slate-200 px-2.5 py-1.5 bg-slate-50 text-slate-800 focus:outline-hidden"
                      >
                        <option value="admin">Admin</option>
                        <option value="manager">Manager</option>
                        <option value="staff">Staff (Sales)</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    ) : (
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold capitalize border ${roleDefinitions[member.role]?.badge || 'bg-slate-100 text-slate-700'}`}>
                        {member.role}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Invite New Team Member Form */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="pb-3 border-b border-slate-100">
            <h2 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-blue-600" />
              <span>Add Team Member</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Invite a team member to access this seller hub</p>
          </div>

          <form onSubmit={handleInviteSubmit} className="mt-4 space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Full Name or Alias
              </label>
              <input
                type="text"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="e.g. Alex (Fulfillment Specialist)"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="teammate@example.com"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Assigned Role
              </label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as UserRole)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800 focus:outline-hidden"
              >
                <option value="staff">Staff (Sales Associate - Masked Margins)</option>
                <option value="manager">Manager (Inventory, Orders & Vendors)</option>
                <option value="viewer">Viewer (Read-Only Auditor)</option>
                <option value="admin">Admin (Full Control)</option>
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                {roleDefinitions[inviteRole].desc}
              </p>
            </div>

            {inviteSuccess && (
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Team member added with {inviteRole.toUpperCase()} permissions!</span>
              </div>
            )}

            <button
              type="submit"
              disabled={!canManageTeam}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              Add Member
            </button>
            {!canManageTeam && (
              <p className="text-[11px] text-rose-500 text-center">
                Only the Admin / Owner can assign new team roles.
              </p>
            )}
          </form>
        </div>

      </div>

      {/* Permissions Matrix */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="pb-3 border-b border-slate-100">
          <h2 className="font-bold text-slate-900 text-sm sm:text-base">Detailed RBAC Permission Matrix</h2>
          <p className="text-xs text-slate-500">Breakdown of operational capabilities across user tiers</p>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                <th className="py-2.5 px-3">Capability / Operation</th>
                <th className="py-2.5 px-3 text-center">Admin</th>
                <th className="py-2.5 px-3 text-center">Manager</th>
                <th className="py-2.5 px-3 text-center">Staff</th>
                <th className="py-2.5 px-3 text-center">Viewer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {permissionMatrix.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-medium text-slate-800">{item.name}</td>
                  <td className="py-2.5 px-3 text-center">
                    {item.admin ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {item.manager ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {item.staff ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {item.viewer ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
