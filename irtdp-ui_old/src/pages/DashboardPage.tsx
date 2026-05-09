// filepath: src/pages/DashboardPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useLoading } from '../context/LoadingContext';
import { useError } from '../context/ErrorContext';
import { StatusBadge } from '../components/StatusBadge';
import { IncidentCardSkeleton } from '../components/Skeleton';
import { NoIncidentsEmpty } from '../components/EmptyState';

interface Incident {
  id: number;
  title: string;
  description: string;
  category: string;
  status: string;
  latitude: number;
  longitude: number;
  created_at: string;
  updated_at?: string;
}

export function DashboardPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  
  const navigate = useNavigate();
  const { startLoading, stopLoading } = useLoading();
  const { addError } = useError();

  const fetchIncidents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    startLoading();

    try {
      const response = await api.get<{ success: boolean; data: Incident[] }>('/incidents');
      if (response.success) {
        setIncidents(response.data || []);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load incidents';
      setError(errorMessage);
      addError({
        message: errorMessage,
        type: 'error',
        retry: () => fetchIncidents(),
      });
    } finally {
      setIsLoading(false);
      stopLoading();
    }
  }, [addError, startLoading, stopLoading]);

  useEffect(() => {
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 10000);
    return () => clearInterval(interval);
  }, [fetchIncidents]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleCreateSuccess = () => {
    setShowCreate(false);
    fetchIncidents();
  };

  // Calculate stats
  const stats = {
    total: incidents.length,
    new: incidents.filter((i) => i.status === 'NEW' || i.status === 'reported').length,
    inProgress: incidents.filter((i) => i.status === 'IN_PROGRESS' || i.status === 'in_progress').length,
    resolved: incidents.filter((i) => i.status === 'RESOLVED' || i.status === 'resolved').length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-900 to-indigo-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🛡️</span>
              <h1 className="text-xl font-bold">IRTDP Dashboard</h1>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-white/80 border border-white/20 rounded-lg hover:bg-white/10 transition-all"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Incidents" value={stats.total} color="indigo" />
          <StatCard label="New" value={stats.new} color="blue" />
          <StatCard label="In Progress" value={stats.inProgress} color="amber" />
          <StatCard label="Resolved" value={stats.resolved} color="green" />
        </div>

        {/* Controls */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Recent Incidents</h2>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-all duration-200 hover:shadow-lg active:scale-95 disabled:opacity-50"
          >
            {showCreate ? 'Cancel' : '+ Report Incident'}
          </button>
        </div>

        {/* Create Form */}
        {showCreate && (
          <CreateIncidentForm 
            token={localStorage.getItem('token') || ''} 
            onSuccess={handleCreateSuccess}
            onCancel={() => setShowCreate(false)}
          />
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="mb-6 p-6 bg-red-50 border border-red-200 rounded-xl text-center">
            <p className="text-red-600 font-medium mb-3">{error}</p>
            <button
              onClick={fetchIncidents}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Loading Skeletons */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <IncidentCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && incidents.length === 0 && (
          <NoIncidentsEmpty onCreateNew={() => setShowCreate(true)} />
        )}

        {/* Incident Grid */}
        {!isLoading && incidents.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {incidents.map((incident) => (
              <IncidentCard key={incident.id} incident={incident} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// Stat Card Component
function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    indigo: 'bg-indigo-100 text-indigo-800',
    blue: 'bg-blue-100 text-blue-800',
    amber: 'bg-amber-100 text-amber-800',
    green: 'bg-green-100 text-green-800',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
      <p className="text-sm font-medium text-gray-500 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${colors[color].split(' ')[1]}`}>{value}</p>
    </div>
  );
}

// Incident Card Component
function IncidentCard({ incident }: { incident: Incident }) {
  const categoryIcons: Record<string, string> = {
    fire: '🔥',
    medical: '🏥',
    police: '👮',
    default: '🚨',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-lg hover:scale-[1.02] transition-all duration-200">
      <div className="flex justify-between items-start mb-3">
        <span className="text-2xl">{categoryIcons[incident.category] || categoryIcons.default}</span>
        <StatusBadge status={incident.status} />
      </div>
      
      <h3 className="text-lg font-semibold text-gray-800 mb-2 line-clamp-1">{incident.title}</h3>
      <p className="text-gray-600 text-sm mb-4 line-clamp-2">{incident.description}</p>
      
      <div className="flex justify-between items-center pt-3 border-t border-gray-100 text-xs text-gray-500">
        <span className="capitalize">{incident.category}</span>
        <span>{new Date(incident.created_at).toLocaleDateString()}</span>
      </div>
    </div>
  );
}

// Create Incident Form Component
function CreateIncidentForm({ token, onSuccess, onCancel }: { token: string; onSuccess: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'fire',
    latitude: 40.7128,
    longitude: -74.006,
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addError } = useError();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('http://localhost:8080/api/incidents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          latitude: parseFloat(String(form.latitude)),
          longitude: parseFloat(String(form.longitude)),
        }),
      });

      if (res.ok) {
        addError({ message: 'Incident reported successfully!', type: 'info' });
        onSuccess();
      } else {
        const d = await res.json();
        const errMsg = d.error || 'Failed to create incident';
        setError(errMsg);
        addError({ message: errMsg, type: 'error' });
      }
    } catch (err) {
      const errMsg = 'Connection failed';
      setError(errMsg);
      addError({ message: errMsg, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-8 animate-slide-in">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-800">Report New Incident</h3>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={submit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
          <input
            placeholder="Brief description of the incident"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <textarea
            placeholder="Detailed description of what happened"
            required
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            >
              <option value="fire">🔥 Fire</option>
              <option value="medical">🏥 Medical</option>
              <option value="police">👮 Police</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Latitude</label>
              <input
                type="number"
                step="0.0001"
                value={form.latitude}
                onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Longitude</label>
              <input
                type="number"
                step="0.0001"
                value={form.longitude}
                onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg active:scale-[0.98]"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Incident'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default DashboardPage;