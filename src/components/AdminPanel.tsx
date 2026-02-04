import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Employee } from '@/types';
import { Users, Search, Filter, RefreshCw, LogIn, LogOut, Coffee, Clock, Building2, Mail, Phone } from 'lucide-react';

const AdminPanel: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('employee-auth', {
        body: { action: 'get_employees' }
      });

      if (data?.success) {
        setEmployees(data.employees);
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const getStatus = (employee: Employee) => {
    if (!employee.latestCheckin) return { status: 'Not Checked In', color: 'bg-slate-100 text-slate-600', icon: Clock };
    switch (employee.latestCheckin.check_type) {
      case 'in':
        return { status: 'Checked In', color: 'bg-green-100 text-green-700', icon: LogIn };
      case 'out':
        return { status: 'Checked Out', color: 'bg-red-100 text-red-700', icon: LogOut };
      case 'break_start':
        return { status: 'On Break', color: 'bg-amber-100 text-amber-700', icon: Coffee };
      case 'break_end':
        return { status: 'Working', color: 'bg-blue-100 text-blue-700', icon: Clock };
      default:
        return { status: 'Unknown', color: 'bg-slate-100 text-slate-600', icon: Clock };
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const departments = [...new Set(employees.map(e => e.department))];

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         emp.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = departmentFilter === 'all' || emp.department === departmentFilter;
    
    if (statusFilter === 'all') return matchesSearch && matchesDepartment;
    
    const status = getStatus(emp);
    if (statusFilter === 'checked_in' && status.status !== 'Checked In') return false;
    if (statusFilter === 'checked_out' && status.status !== 'Checked Out') return false;
    if (statusFilter === 'on_break' && status.status !== 'On Break') return false;
    
    return matchesSearch && matchesDepartment;
  });

  const statusCounts = {
    total: employees.length,
    checkedIn: employees.filter(e => e.latestCheckin?.check_type === 'in').length,
    checkedOut: employees.filter(e => !e.latestCheckin || e.latestCheckin?.check_type === 'out').length,
    onBreak: employees.filter(e => e.latestCheckin?.check_type === 'break_start').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center">
              <Users className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Admin Dashboard</h2>
              <p className="text-slate-300">Monitor all employee check-ins in real-time</p>
            </div>
          </div>
          <button
            onClick={fetchEmployees}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{statusCounts.total}</p>
              <p className="text-sm text-slate-500">Total Employees</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <LogIn className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{statusCounts.checkedIn}</p>
              <p className="text-sm text-slate-500">Checked In</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <LogOut className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{statusCounts.checkedOut}</p>
              <p className="text-sm text-slate-500">Checked Out</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <Coffee className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{statusCounts.onBreak}</p>
              <p className="text-sm text-slate-500">On Break</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search employees..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          <div className="flex gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
            >
              <option value="all">All Status</option>
              <option value="checked_in">Checked In</option>
              <option value="checked_out">Checked Out</option>
              <option value="on_break">On Break</option>
            </select>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
            >
              <option value="all">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Employee Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Employee</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Department</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Status</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Last Activity</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Contact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <RefreshCw className="w-8 h-8 text-slate-300 mx-auto mb-3 animate-spin" />
                    <p className="text-slate-500">Loading employees...</p>
                  </td>
                </tr>
              ) : filteredEmployees.length > 0 ? (
                filteredEmployees.map((employee) => {
                  const status = getStatus(employee);
                  const StatusIcon = status.icon;
                  return (
                    <tr key={employee.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                            {employee.full_name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{employee.full_name}</p>
                            <p className="text-sm text-slate-500">{employee.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-600">{employee.department}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${status.color}`}>
                          <StatusIcon className="w-4 h-4" />
                          {status.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {employee.latestCheckin ? (
                          <span className="text-slate-600">
                            {formatTime(employee.latestCheckin.timestamp)}
                          </span>
                        ) : (
                          <span className="text-slate-400">No activity</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                            <Mail className="w-4 h-4" />
                          </button>
                          <button className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                            <Phone className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Search className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">No employees found</p>
                    <p className="text-sm text-slate-400">Try adjusting your filters</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
