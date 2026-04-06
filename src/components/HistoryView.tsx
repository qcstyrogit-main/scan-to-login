import React, { useEffect, useMemo, useState } from 'react';
import { Checkin, Employee } from '@/types';
import { Clock, LogIn, LogOut, Coffee, MapPin, Activity, Save, X, Edit3 } from 'lucide-react';
import HistoryMap from '@/components/HistoryMap';
import { buildActivitiesWithProcessingRemark, stripProcessingRemark } from '@/lib/checkinActivities';
import { updateCheckinActivities } from '@/lib/erpService';
import { toast } from '@/components/ui/sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface HistoryViewProps {
  checkins: Checkin[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  currentEmployee?: Employee;
}

const typeConfig: Record<string, { icon: React.ElementType; accent: string; bg: string; label: string }> = {
  in:          { icon: LogIn,  accent: '#22c55e', bg: 'rgba(34,197,94,0.1)',   label: 'Checked In'    },
  out:         { icon: LogOut, accent: '#ef4444', bg: 'rgba(239,68,68,0.1)',   label: 'Checked Out'   },
  break_start: { icon: Coffee, accent: '#f59e0b', bg: 'rgba(245,158,11,0.1)', label: 'Started Break' },
  break_end:   { icon: Clock,  accent: '#3b82f6', bg: 'rgba(59,130,246,0.1)', label: 'Ended Break'   },
};

const HistoryView: React.FC<HistoryViewProps> = ({ checkins, selectedId, onSelect, currentEmployee }) => {
  const queryClient = useQueryClient();
  const GEOFENCE_EXEMPT_DESIGNATIONS = [
    "account manager",
    "regional sales manager - (gma terr)",
    "regional sales manager - provincial",
    "regional sales manager - (ind/insti/sup)",
  ];

  const canEditActivities = currentEmployee?.designation &&
    GEOFENCE_EXEMPT_DESIGNATIONS.includes(currentEmployee.designation.toLowerCase());
  const selectedCheckin = checkins.find(c => c.id === selectedId);
  const selectedProcessingLabel = selectedCheckin?.processingMode === 'offline'
    ? 'Processed offline'
    : 'Processed online';
  const selectedSyncDetail = selectedCheckin?.processingMode === 'offline' && selectedCheckin.syncStatus === 'pending'
    ? 'Waiting for sync'
    : selectedCheckin
      ? 'Synced'
      : '';
  const [showActivitiesDialog, setShowActivitiesDialog] = useState(false);
  const [activitiesText, setActivitiesText] = useState('');
  const [selectedForEdit, setSelectedForEdit] = useState<Checkin | null>(null);

  const startEdit = (checkin: Checkin) => {
    setSelectedForEdit(checkin);
    setActivitiesText(stripProcessingRemark(checkin.custom_activities));
    setShowActivitiesDialog(true);
  };

  const saveActivities = async () => {
    if (!selectedForEdit) return;
    const nextActivities = buildActivitiesWithProcessingRemark(
      activitiesText,
      selectedForEdit.processingMode === 'offline' ? 'offline' : 'online'
    );
    try {
      await updateCheckinActivities(selectedForEdit.id, nextActivities);
      if (currentEmployee?.id) {
        queryClient.setQueryData<Checkin[]>(['checkins', currentEmployee.id], (prev = []) =>
          prev.map((checkin) =>
            checkin.id === selectedForEdit.id
              ? { ...checkin, custom_activities: nextActivities }
              : checkin
          )
        );
      }
      toast.success('Activities updated successfully');
      setShowActivitiesDialog(false);
      setSelectedForEdit(null);
      // Refresh the checkins data or update local state
      // For now, we'll just close the dialog
    } catch (err: any) {
      toast.error(err.message || 'Failed to update activities');
    }
  };

  const cancelEdit = () => {
    setShowActivitiesDialog(false);
    setSelectedForEdit(null);
  };
  const formatTime = (ts: string) =>
    new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const formatDate = (ts: string) =>
    new Date(ts).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const filteredCheckins = useMemo(() => checkins, [checkins]);

  useEffect(() => {
    if (!selectedId) return;
    if (filteredCheckins.some((c) => c.id === selectedId)) return;
    onSelect(filteredCheckins[0]?.id ?? null);
  }, [filteredCheckins, onSelect, selectedId]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

        .hv { font-family: 'Sora', sans-serif; display: flex; flex-direction: column; gap: 16px; animation: hvFade 0.4s ease both; }
        @keyframes hvFade { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        /* ── Header ── */
        .hv-header {
          background: linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--secondary)) 100%);
          border: 1px solid hsl(var(--primary) / 0.2);
          border-radius: 20px;
          padding: 24px 28px;
          position: relative; overflow: hidden;
          display: flex; align-items: center; gap: 16px;
        }
        .hv-header::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, hsl(var(--primary) / 0.5), transparent);
        }
        .hv-header-glow {
          position: absolute; top: -70px; right: -70px;
          width: 200px; height: 200px;
          background: radial-gradient(circle, hsl(var(--primary) / 0.1) 0%, transparent 70%);
          border-radius: 50%; pointer-events: none;
        }
        .hv-header-icon {
          width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
          background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8));
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 0 3px hsl(var(--primary) / 0.2);
          position: relative;
        }
        .hv-header-title { font-size: 18px; font-weight: 700; color: hsl(var(--foreground)); }
        .hv-header-sub   { font-size: 13px; color: hsl(var(--muted-foreground)); margin-top: 3px; }

        /* ── Map container ── */
        .hv-map-container {
          background: hsl(var(--card));
          border: 1px solid hsl(var(--border));
          border-radius: 16px;
          overflow: hidden;
          margin-bottom: 14px;
        }

        /* ── Checkin list card ── */
        .hv-list-card {
          background: hsl(var(--card));
          border: 1px solid hsl(var(--border));
          border-radius: 16px;
          overflow: hidden;
          max-height: 480px;
          display: flex; flex-direction: column;
        }

        .hv-list-header {
          padding: 13px 20px;
          border-bottom: 1px solid hsl(var(--border));
          display: flex; align-items: center; gap: 8px;
          font-size: 11px; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.07em; color: hsl(var(--muted-foreground));
          flex-shrink: 0;
        }

        .hv-list-scroll { overflow-y: auto; flex: 1; }
        .hv-list-scroll::-webkit-scrollbar { width: 4px; }
        .hv-list-scroll::-webkit-scrollbar-track { background: transparent; }
        .hv-list-scroll::-webkit-scrollbar-thumb { background: hsl(var(--border)); border-radius: 2px; }

        /* ── Row button ── */
        .hv-row {
          width: 100%;
          text-align: left;
          padding: 13px 20px;
          display: flex; align-items: center; gap: 13px;
          border: none; background: transparent; cursor: pointer;
          border-bottom: 1px solid hsl(var(--border) / 0.6);
          transition: background 0.15s;
          font-family: 'Sora', sans-serif;
          position: relative;
        }
        .hv-row:last-child { border-bottom: none; }
        .hv-row:hover { background: hsl(var(--foreground) / 0.025); }

        .hv-row-selected {
          background: hsl(var(--primary) / 0.07) !important;
        }
        .hv-row-selected-bar {
          position: absolute; left: 0; top: 0; bottom: 0; width: 2px;
          background: hsl(var(--primary)); border-radius: 0 1px 1px 0;
        }

        .hv-row-icon {
          width: 34px; height: 34px; border-radius: 9px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          border: 1px solid hsl(var(--border));
        }

        .hv-row-label { font-size: 13px; font-weight: 500; color: hsl(var(--foreground)); }

        .hv-row-content { flex: 1; text-align: left; }
        .hv-row-sub { font-size: 11px; color: hsl(var(--muted-foreground)); margin-top: 2px; }

        .hv-row-time { margin-left: auto; text-align: right; flex-shrink: 0; }
        .hv-row-time-main {
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px; font-weight: 500; color: hsl(var(--muted-foreground));
        }
        .hv-row-time-date { font-size: 11px; color: hsl(var(--muted-foreground) / 0.8); margin-top: 2px; }

        /* ── Activities ── */
        .hv-activities { margin-top: 6px; padding-top: 4px; border-top: 1px solid hsl(var(--border) / 0.4); }
        .hv-activities-label { font-size: 10px; font-weight: 600; color: hsl(var(--muted-foreground)); text-transform: uppercase; letter-spacing: 0.05em; }
        .hv-activities-value {
          font-size: 11px; color: hsl(var(--foreground)); white-space: nowrap;
          overflow: hidden; text-overflow: ellipsis; max-width: 140px;
        }
        .hv-activities-textarea {
          width: 100%; min-height: 50px; padding: 4px 6px; margin-top: 4px;
          background: hsl(var(--background)); border: 1px solid hsl(var(--border));
          border-radius: 4px; color: hsl(var(--foreground)); font-size: 12px;
          font-family: 'Sora', sans-serif; resize: vertical; outline: none;
        }
        .hv-activities-textarea:focus { border-color: hsl(var(--primary) / 0.6); background: hsl(var(--primary) / 0.05); }
        .hv-activities-actions { display: flex; gap: 4px; margin-top: 4px; }

        .hv-btn-edit, .hv-btn-save, .hv-btn-cancel {
          padding: 3px 8px; border: 1px solid hsl(var(--border)); border-radius: 4px;
          font-size: 10px; font-weight: 500; cursor: pointer; transition: all 0.2s;
          display: inline-flex; align-items: center; gap: 3px;
        }
        .hv-btn-edit { background: hsl(var(--foreground) / 0.05); color: hsl(var(--muted-foreground)); }
        .hv-btn-edit:hover { background: hsl(var(--primary) / 0.12); color: hsl(var(--primary)); border-color: hsl(var(--primary) / 0.3); }
        .hv-btn-save { background: hsl(var(--primary)); color: white; border-color: hsl(var(--primary)); }
        .hv-btn-save:hover { background: hsl(var(--primary) / 0.9); }
        .hv-btn-cancel { background: hsl(var(--foreground) / 0.05); color: hsl(var(--muted-foreground)); }
        .hv-btn-cancel:hover { background: hsl(var(--foreground) / 0.1); color: hsl(var(--foreground)); }

        /* ── Empty ── */
        .hv-empty {
          padding: 48px 20px; text-align: center;
          color: hsl(var(--muted-foreground));
        }
        .hv-empty p { font-size: 14px; color: hsl(var(--muted-foreground)); margin-top: 12px; }

        /* ── Activities Panel ── */
        .hv-activities-panel {
          margin-top: 14px;
          padding: 0;
          background: transparent;
          border: none;
          border-radius: 0;
        }
        .hv-activities-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
          gap: 8px;
        }
        .hv-activities-header-main {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .hv-activities-title {
          font-size: 11px;
          font-weight: 600;
          color: hsl(var(--muted-foreground));
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .hv-processing-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.02em;
          background: hsl(var(--secondary));
          color: hsl(var(--foreground));
          border: 1px solid hsl(var(--border));
        }
        .hv-processing-badge.offline {
          background: rgba(245, 158, 11, 0.12);
          color: #b45309;
          border-color: rgba(245, 158, 11, 0.25);
        }
        .hv-processing-badge.online {
          background: rgba(34, 197, 94, 0.12);
          color: #15803d;
          border-color: rgba(34, 197, 94, 0.25);
        }
        .hv-sync-detail {
          font-size: 11px;
          color: hsl(var(--muted-foreground));
        }
        .hv-activities-content {
          font-size: 12px;
          line-height: 1.4;
          color: hsl(var(--foreground));
          white-space: pre-wrap;
          min-height: 24px;
          padding: 0;
          background: transparent;
          border: none;
          border-radius: 0;
        }
        .hv-edit-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          background: hsl(var(--primary) / 0.1);
          color: hsl(var(--primary));
          border: 1px solid hsl(var(--primary) / 0.3);
          border-radius: 6px;
          font-size: 11px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .hv-edit-btn:hover {
          background: hsl(var(--primary) / 0.2);
        }

        /* ── No activities text ── */
        .hv-no-activities {
          font-size: 12px;
          color: hsl(var(--muted-foreground));
          font-style: italic;
        }

        .hv-dialog-content {
          max-height: 84vh;
          overflow-y: auto;
          padding-bottom: calc(16px + env(safe-area-inset-bottom));
        }
      `}</style>

      <div className="hv">

        {/* Header */}
        <div className="hv-header">
          <div className="hv-header-glow" />
          <div className="hv-header-icon">
            <MapPin size={18} color="white" />
          </div>
          <div style={{ position: 'relative' }}>
            <div className="hv-header-title">Check-in History</div>
            <div className="hv-header-sub">View your attendance records</div>
          </div>
        </div>

        {/* Map */}
        <div className="hv-map-container">
          <HistoryMap checkins={filteredCheckins} selectedId={selectedId} />
        </div>

        {/* Activities panel below map */}
        <div className="hv-activities-panel">
          <div className="hv-activities-header">
            <div className="hv-activities-header-main">
              <div className="hv-activities-title">Activities</div>
              {selectedCheckin && (
                <>
                  <div className={`hv-processing-badge ${selectedCheckin.processingMode === 'offline' ? 'offline' : 'online'}`}>
                    {selectedProcessingLabel}
                  </div>
                  <div className="hv-sync-detail">{selectedSyncDetail}</div>
                </>
              )}
            </div>
            {canEditActivities && selectedCheckin?.check_type === 'out' && selectedCheckin.syncStatus !== 'pending' && (
              <button className="hv-edit-btn" onClick={() => startEdit(selectedCheckin)}>
                <Edit3 size={14} /> Edit
              </button>
            )}
          </div>
          <div className="hv-activities-content" title={selectedCheckin?.custom_activities || ''}>
            {selectedCheckin?.custom_activities ? (
              selectedCheckin.custom_activities
            ) : (
              <span className="hv-no-activities">No activities recorded</span>
            )}
          </div>
        </div>

        {/* List */}
        <div className="hv-list-card">
          <div className="hv-list-header">
            <Activity size={12} />
            {filteredCheckins.length} record{filteredCheckins.length !== 1 ? 's' : ''}
          </div>

          <div className="hv-list-scroll">
            {filteredCheckins.length > 0 ? (
              filteredCheckins.map(c => {
                const cfg = typeConfig[c.check_type] || typeConfig.in;
                const Icon = cfg.icon;
                const isSelected = c.id === selectedId;

                return (
                  <button
                    key={c.id}
                    type="button"
                    className={`hv-row${isSelected ? ' hv-row-selected' : ''}`}
                    onClick={() => onSelect(c.id)}
                  >
                    {isSelected && <span className="hv-row-selected-bar" />}
                    <div className="hv-row-icon" style={{ background: cfg.bg }}>
                      <Icon size={14} color={cfg.accent} />
                    </div>
                    <div className="hv-row-content">
                      <div className="hv-row-label">{cfg.label}</div>
                      <div className="hv-row-sub">{c.location || currentEmployee?.custom_location || 'Location'}</div>
                    </div>
                    <div className="hv-row-time">
                      <div className="hv-row-time-main">{formatTime(c.timestamp)}</div>
                      <div className="hv-row-time-date">{formatDate(c.timestamp)}</div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="hv-empty">
                <Clock size={32} style={{ margin: '0 auto', opacity: 0.15, color: 'hsl(var(--muted-foreground))' }} />
                <p>No history yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Activities Edit Dialog */}
        <Dialog open={showActivitiesDialog} onOpenChange={setShowActivitiesDialog}>
          <DialogContent className="hv-dialog-content w-[94vw] max-w-lg bg-card text-foreground border border-border rounded-2xl shadow-2xl">
            <DialogHeader>
              <DialogTitle>Edit Activities</DialogTitle>
              <DialogDescription>
                Update the activities for this check-out record
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <textarea
                className="hv-activities-textarea"
                value={activitiesText}
                onChange={(e) => setActivitiesText(e.target.value)}
                placeholder="Enter activities..."
                rows={6}
                style={{ width: '100%' }}
              />
            </div>
            <DialogFooter className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                onClick={cancelEdit}
                className="rounded-lg"
              >
                Cancel
              </Button>
              <Button
                onClick={saveActivities}
                className="rounded-lg"
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </>
  );
};

export default HistoryView;
