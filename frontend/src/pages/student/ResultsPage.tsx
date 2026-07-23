import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { PageLoader, EmptyState, StatusBadge } from '../../components/ui';
import { Select } from '../../components/ui/FormControls';
import { Icons } from '../../components/ui/Icons';
import { electionService } from '../../services/electionService';
import { resultService } from '../../services/resultService';
import { Election, ResultData } from '../../types';
import { getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';

const UPLOADS_URL = process.env.REACT_APP_UPLOADS_URL || 'http://localhost:5000';

export const StudentResultsPage: React.FC = () => {
  const [elections, setElections] = useState<Election[]>([]);
  const [selected, setSelected] = useState('');
  const [data, setData] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(false);
  const [notAvailable, setNotAvailable] = useState(false);

  useEffect(() => {
    electionService.getAll({ limit: 100 }).then((r) => {
      setElections(r.elections);
      if (r.elections.length > 0) setSelected(r.elections[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    setNotAvailable(false);
    resultService.getResults(selected)
      .then(setData)
      .catch((err) => {
        if (err?.response?.status === 403) setNotAvailable(true);
        else toast.error(getErrorMessage(err));
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [selected]);

  return (
    <DashboardLayout title="Results">
      <div className="page-header">
        <div>
          <h1 className="page-title">Election Results</h1>
          <p className="page-subtitle">View live or final results for school elections</p>
        </div>
      </div>

      <div className="card p-4 mb-6 max-w-sm">
        <Select
          label="Select Election"
          options={elections.map((e) => ({ value: e.id, label: e.title }))}
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        />
      </div>

      {loading ? (
        <PageLoader />
      ) : notAvailable ? (
        <div className="card"><EmptyState
          title="Results not yet available"
          description="The election administrator has not enabled result publishing for this election yet. Check back after the election closes."
          icon={<Icons.Results className="w-12 h-12" />}
        /></div>
      ) : !data ? (
        <div className="card"><EmptyState title="Select an election to view results" /></div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <StatusBadge status={data.election.status} />
            {data.election.liveResults && <span className="badge-purple flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" /> Live</span>}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="stat-card"><div className="stat-icon bg-primary-100 text-primary-700"><Icons.Students className="w-5 h-5" /></div><div><p className="text-sm text-slate-500">Eligible</p><p className="text-xl font-bold">{data.summary.totalEligibleVoters}</p></div></div>
            <div className="stat-card"><div className="stat-icon bg-emerald-100 text-emerald-700"><Icons.Vote className="w-5 h-5" /></div><div><p className="text-sm text-slate-500">Voted</p><p className="text-xl font-bold">{data.summary.totalVoted}</p></div></div>
            <div className="stat-card"><div className="stat-icon bg-amber-100 text-amber-700"><Icons.Trophy className="w-5 h-5" /></div><div><p className="text-sm text-slate-500">Turnout</p><p className="text-xl font-bold">{data.summary.turnoutPercent}%</p></div></div>
          </div>

          
          {data.results.map((pos) => (
            <div key={pos.positionId} className="card">
              <div className="card-header flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">{pos.positionTitle}</h3>
                  <p className="text-xs text-slate-500"> {pos.totalVotes} votes{pos.invalidVotes > 0 && <> · {pos.invalidVotes} declined</>} votes</p>
                </div>
                {pos.hasTie && <span className="badge-yellow text-xs">⚠️ Tie</span>}
              </div>
              <div className="card-body space-y-3">
                {pos.candidates.map((c) => (
                  <div key={c.id} className={`flex items-center gap-3 p-3 rounded-xl border ${c.isWinner ? 'bg-amber-50 border-amber-200' : c.isTiedForWinner ? 'bg-yellow-50 border-yellow-300' : 'border-slate-100'}`}>
                    <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                      {c.photo ? <img src={c.photo.startsWith('http') ? c.photo : `${UPLOADS_URL}${c.photo}`} alt="" className="w-full h-full object-cover" /> : <Icons.User className="w-5 h-5 text-slate-400" />}                    
                      </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 flex items-center gap-1.5">
                        {c.name}
                        {c.isWinner && <Icons.Trophy className="w-3.5 h-3.5 text-amber-500" />}
                        {c.isTiedForWinner && <span className="badge-yellow text-[10px]">Draw</span>}
                      </p>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                        <div className={`h-full rounded-full ${c.isWinner ? 'bg-amber-500' : c.isTiedForWinner ? 'bg-yellow-400' : 'bg-primary-500'}`} style={{ width: `${c.percentage}%` }} />
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
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default StudentResultsPage;
