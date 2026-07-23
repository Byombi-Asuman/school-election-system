import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { PageLoader, EmptyState, StatusBadge } from '../../components/ui';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/FormControls';
import { Icons } from '../../components/ui/Icons';
import { ResultsBarChart } from '../../components/charts/Charts';
import { resultService } from '../../services/resultService';
import { electionService } from '../../services/electionService';
import { Election, ResultData } from '../../types';
import { getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';

const UPLOADS_URL = process.env.REACT_APP_UPLOADS_URL || 'http://localhost:5000';

export const ResultsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [elections, setElections] = useState<Election[]>([]);
  const [data, setData] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    electionService.getAll({ limit: 100 }).then((r) => setElections(r.elections)).catch(() => {});
  }, []);

  const load = useCallback(() => {
    if (!id) { setLoading(false); return; }
    setLoading(true);
    resultService.getResults(id)
      .then(setData)
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const toggleLive = async () => {
    if (!id) return;
    try {
      const res = await resultService.toggleLiveResults(id);
      toast.success(`Live results ${res.liveResults ? 'enabled' : 'disabled'}`);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const exportCSV = () => {
    if (!data) return;
    let csv = 'Position,Candidate,Votes,Percentage,Winner\n';
    data.results.forEach((pos) => {
      pos.candidates.forEach((c) => {
        csv += `"${pos.positionTitle}","${c.name}",${c.voteCount},${c.percentage}%,${c.isWinner ? 'Yes' : 'No'}\n`;
      });
      if (pos.invalidVotes > 0) {
        csv += `"${pos.positionTitle}","Invalid/Abstained",${pos.invalidVotes},,\n`;
      }
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.election.title.replace(/\s+/g, '_')}_results.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printResults = () => window.print();

  if (!id) {
    return (
      <DashboardLayout title="Results">
        <div className="page-header">
          <div>
            <h1 className="page-title">Election Results</h1>
            <p className="page-subtitle">Select an election to view its results</p>
          </div>
        </div>
        <div className="card p-6 max-w-md">
          <Select
            label="Select Election"
            options={elections.map((e) => ({ value: e.id, label: e.title }))}
            placeholder="Choose an election"
            onChange={(e) => navigate(`/admin/results/${e.target.value}`)}
          />
        </div>
      </DashboardLayout>
    );
  }

  if (loading) return <DashboardLayout title="Results"><PageLoader /></DashboardLayout>;
  if (!data) return <DashboardLayout title="Results"><EmptyState title="Results not available" /></DashboardLayout>;

  return (
    <DashboardLayout title="Results">
      <div className="page-header no-print">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="page-title">{data.election.title}</h1>
            <StatusBadge status={data.election.status} />
          </div>
          <p className="page-subtitle">Election results and vote breakdown</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="secondary" onClick={toggleLive} size="sm">
            {data.election.liveResults ? '🔴 Disable Live' : '🟢 Enable Live'} Results
          </Button>
          <Button variant="secondary" onClick={exportCSV} size="sm" icon={<Icons.Download className="w-4 h-4" />}>Export CSV</Button>
          <Button variant="secondary" onClick={printResults} size="sm">🖨️ Print</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <div className="stat-card">
          <div className="stat-icon bg-primary-100 text-primary-700"><Icons.Students className="w-5 h-5" /></div>
          <div><p className="text-sm text-slate-500">Eligible Voters</p><p className="text-xl font-bold">{data.summary.totalEligibleVoters}</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon bg-emerald-100 text-emerald-700"><Icons.Vote className="w-5 h-5" /></div>
          <div><p className="text-sm text-slate-500">Voted</p><p className="text-xl font-bold">{data.summary.totalVoted}</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon bg-amber-100 text-amber-700"><Icons.Trophy className="w-5 h-5" /></div>
          <div><p className="text-sm text-slate-500">Turnout</p><p className="text-xl font-bold">{data.summary.turnoutPercent}%</p></div>
        </div>
      </div>

      <div className="space-y-6">
        {data.results.map((pos) => (
          <div key={pos.positionId} className="card">
            <div className="card-header flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">{pos.positionTitle}</h3>
                <p className="text-xs text-slate-500">{pos.totalVotes} total votes · {pos.maxWinners} winner{pos.maxWinners > 1 ? 's' : ''}</p>
                {pos.invalidVotes > 0 && <> · <span className="text-slate-400">{pos.invalidVotes} invalid/abstained</span></>}
              </div>
              {pos.hasTie && (
                <span className="badge badge-yellow text-xs flex items-center gap-1">
                  ⚠️ Tie — needs manual resolution
                </span>
              )}
            </div>
            <div className="card-body grid lg:grid-cols-2 gap-6">
              <div className="h-64">
                {pos.candidates.length > 0 ? (
                  <ResultsBarChart labels={pos.candidates.map((c) => c.name)} data={pos.candidates.map((c) => c.voteCount)} />
                ) : (
                  <EmptyState title="No candidates" />
                )}
              </div>
              <div className="space-y-3">
                {pos.candidates.map((c) => (
                  <div key={c.id} className={`flex items-center gap-3 p-3 rounded-xl border ${c.isWinner ? 'bg-amber-50 border-amber-200' : 'border-slate-100'}`}>
                    <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                      {c.photo ? <img src={c.photo.startsWith('http') ? c.photo : `${UPLOADS_URL}${c.photo}`} alt="" className="w-full h-full object-cover" /> : <Icons.User className="w-5 h-5 text-slate-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate flex items-center gap-1.5">
                        {c.name}
                        {c.isWinner && <Icons.Trophy className="w-3.5 h-3.5 text-amber-500" />}
                      </p>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                        <div className={`h-full rounded-full ${c.isWinner ? 'bg-amber-500' : 'bg-primary-500'}`} style={{ width: `${c.percentage}%` }} />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-slate-900">{c.voteCount}</p>
                      <p className="text-xs text-slate-400">{c.percentage}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
};

export default ResultsPage;
