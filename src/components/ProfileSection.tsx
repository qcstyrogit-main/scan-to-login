import React from 'react';
import { Employee } from '@/types';
import { User, Mail, Building2, Shield } from 'lucide-react';

interface ProfileSectionProps {
  employee: Employee;
}

const ProfileSection: React.FC<ProfileSectionProps> = ({ employee }) => {
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
        </div>

        <div className="space-y-5">
          {/* Full Name */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-600 mb-2">
              <User className="w-4 h-4" />
              Full Name
            </label>
            <p className="px-4 py-3 bg-slate-50 rounded-xl text-slate-800">{employee.full_name}</p>
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


          {/* Department */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-600 mb-2">
              <Building2 className="w-4 h-4" />
              Department
            </label>
            <p className="px-4 py-3 bg-slate-50 rounded-xl text-slate-800">{employee.department}</p>
          </div>

          {/* Role */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-600 mb-2">
              <Shield className="w-4 h-4" />
              Designation
            </label>
            <p className="px-4 py-3 bg-slate-50 rounded-xl text-slate-800">
              {employee.designation || 'Designation'}
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};

export default ProfileSection;
