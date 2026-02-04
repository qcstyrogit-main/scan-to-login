import React, { useState } from 'react';
import { Employee } from '@/types';
import { User, Mail, Phone, Building2, Shield, Camera, Save, X, Edit2 } from 'lucide-react';

interface ProfileSectionProps {
  employee: Employee;
  onUpdate: (updates: Partial<Employee>) => void;
}

const ProfileSection: React.FC<ProfileSectionProps> = ({ employee, onUpdate }) => {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: employee.full_name,
    phone: employee.phone || '',
    department: employee.department,
  });

  const handleSave = () => {
    onUpdate(formData);
    setEditing(false);
  };

  const handleCancel = () => {
    setFormData({
      full_name: employee.full_name,
      phone: employee.phone || '',
      department: employee.department,
    });
    setEditing(false);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Profile Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-blue-600 to-blue-700 relative">
          <div className="absolute -bottom-12 left-6">
            <div className="relative">
              <div className="w-24 h-24 bg-white rounded-2xl shadow-lg flex items-center justify-center border-4 border-white">
                {employee.avatar_url ? (
                  <img
                    src={employee.avatar_url}
                    alt={employee.full_name}
                    className="w-full h-full rounded-xl object-cover"
                  />
                ) : (
                  <span className="text-3xl font-bold text-blue-600">
                    {getInitials(employee.full_name)}
                  </span>
                )}
              </div>
              <button className="absolute -bottom-1 -right-1 w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white hover:bg-blue-700 transition-colors shadow-lg">
                <Camera className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        <div className="pt-16 pb-6 px-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">{employee.full_name}</h2>
              <p className="text-slate-500">{employee.department}</p>
            </div>
            <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${
              employee.role === 'admin' 
                ? 'bg-purple-100 text-purple-700' 
                : 'bg-blue-100 text-blue-700'
            }`}>
              {employee.role === 'admin' ? 'Administrator' : 'Employee'}
            </span>
          </div>
        </div>
      </div>

      {/* Profile Details */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-800">Profile Information</h3>
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium text-sm"
            >
              <Edit2 className="w-4 h-4" />
              Edit Profile
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium text-sm"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
            </div>
          )}
        </div>

        <div className="space-y-5">
          {/* Full Name */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-600 mb-2">
              <User className="w-4 h-4" />
              Full Name
            </label>
            {editing ? (
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            ) : (
              <p className="px-4 py-3 bg-slate-50 rounded-xl text-slate-800">{employee.full_name}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-600 mb-2">
              <Mail className="w-4 h-4" />
              Email Address
            </label>
            <p className="px-4 py-3 bg-slate-50 rounded-xl text-slate-800">{employee.email}</p>
            <p className="text-xs text-slate-400 mt-1">Email cannot be changed</p>
          </div>

          {/* Phone */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-600 mb-2">
              <Phone className="w-4 h-4" />
              Phone Number
            </label>
            {editing ? (
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Enter phone number"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            ) : (
              <p className="px-4 py-3 bg-slate-50 rounded-xl text-slate-800">
                {employee.phone || 'Not provided'}
              </p>
            )}
          </div>

          {/* Department */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-600 mb-2">
              <Building2 className="w-4 h-4" />
              Department
            </label>
            {editing ? (
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
              >
                <option value="Engineering">Engineering</option>
                <option value="Marketing">Marketing</option>
                <option value="Sales">Sales</option>
                <option value="HR">HR</option>
                <option value="Finance">Finance</option>
                <option value="Design">Design</option>
                <option value="Management">Management</option>
                <option value="General">General</option>
              </select>
            ) : (
              <p className="px-4 py-3 bg-slate-50 rounded-xl text-slate-800">{employee.department}</p>
            )}
          </div>

          {/* Role */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-600 mb-2">
              <Shield className="w-4 h-4" />
              Role
            </label>
            <p className="px-4 py-3 bg-slate-50 rounded-xl text-slate-800">
              {employee.role === 'admin' ? 'Administrator' : 'Employee'}
            </p>
            <p className="text-xs text-slate-400 mt-1">Contact admin to change role</p>
          </div>
        </div>
      </div>

      {/* Security Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Security</h3>
        <button className="w-full px-4 py-3 border border-slate-200 rounded-xl text-left hover:bg-slate-50 transition-colors flex items-center justify-between">
          <div>
            <p className="font-medium text-slate-800">Change Password</p>
            <p className="text-sm text-slate-500">Update your password regularly for security</p>
          </div>
          <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ProfileSection;
