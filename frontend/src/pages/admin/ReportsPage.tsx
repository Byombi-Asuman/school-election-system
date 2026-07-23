import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { EmptyState } from '../../components/ui';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/FormControls';
import { Icons } from '../../components/ui/Icons';
import { electionService } from '../../services/electionService';
import { resultService } from '../../services/resultService';
import { Election, ResultData } from '../../types';
import { getErrorMessage } from '../../services/api';
import { format } from 'date-fns';
import { formatUganda, formatUgandaDate } from '../../utils/timezone';
import toast from 'react-hot-toast';

export const ReportsPage: React.FC = () => {
  const [elections, setElections] = useState<Election[]>([]);
  const [selected, setSelected] = useState('');
  const [data, setData] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    electionService.getAll({ limit: 100 }).then((r) => setElections(r.elections)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selected) { setData(null); return; }
    setLoading(true);
    resultService.getResults(selected)
      .then(setData)
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [selected]);

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
    downloadFile(csv, `${data.election.title}_report.csv`, 'text/csv');
  };

  const exportExcel = () => {
    if (!data) return;
    // Simple TSV that Excel opens natively without extra deps
    let tsv = 'Position\tCandidate\tVotes\tPercentage\tWinner\n';
    data.results.forEach((pos) => {
      pos.candidates.forEach((c) => {
        tsv += `${pos.positionTitle}\t${c.name}\t${c.voteCount}\t${c.percentage}%\t${c.isWinner ? 'Yes' : 'No'}\n`;
      });
      if (pos.invalidVotes > 0) {
        tsv += `${pos.positionTitle}\tInvalid/Abstained\t${pos.invalidVotes}\t\t\n`;
      }
    });
    downloadFile(tsv, `${data.election.title}_report.xls`, 'application/vnd.ms-excel');
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.replace(/\s+/g, '_');
    a.click();
    URL.revokeObjectURL(url);
  };

  const printReport = () => window.print();

  return (
    <DashboardLayout title="Reports">
      <div className="page-header no-print">
        <div>
          <h1 className="page-title">Election Reports</h1>
          <p className="page-subtitle">Generate printable and exportable election reports</p>
        </div>
      </div>

      <div className="card p-6 mb-6 no-print">
        <Select
          label="Select Election"
          options={elections.map((e) => ({ value: e.id, label: e.title }))}
          placeholder="Choose an election"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        />
        {data && (
          <div className="flex gap-2 mt-4 flex-wrap">
            <Button variant="secondary" onClick={exportCSV} icon={<Icons.Download className="w-4 h-4" />}>Export CSV</Button>
            <Button variant="secondary" onClick={exportExcel} icon={<Icons.Download className="w-4 h-4" />}>Export Excel</Button>
            <Button variant="secondary" onClick={printReport}>🖨️ Print / Save as PDF</Button>
          </div>
        )}
      </div>

      {!selected ? (
        <div className="card"><EmptyState title="Select an election" description="Choose an election above to generate its report." icon={<Icons.Download className="w-12 h-12" />} /></div>
      ) : loading ? (
        <div className="card p-12 text-center text-slate-400">Loading report...</div>
      ) : data ? (
        <div className="card p-8" id="report-content">
          <div className="text-center mb-8 pb-6 border-b border-slate-200">
            <h2 className="text-2xl font-bold font-display text-slate-900">{data.election.title}</h2>
            <p className="text-sm text-slate-500 mt-1">Official Election Results Report</p>
            <p className="text-xs text-slate-400 mt-1">
              {formatUgandaDate(data.election.startDate)} – {formatUgandaDate(data.election.endDate)}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="text-center p-4 rounded-xl bg-slate-50">
              <p className="text-2xl font-bold text-slate-900">{data.summary.totalEligibleVoters}</p>
              <p className="text-xs text-slate-500">Eligible Voters</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-slate-50">
              <p className="text-2xl font-bold text-slate-900">{data.summary.totalVoted}</p>
              <p className="text-xs text-slate-500">Votes Cast</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-slate-50">
              <p className="text-2xl font-bold text-slate-900">{data.summary.turnoutPercent}%</p>
              <p className="text-xs text-slate-500">Turnout</p>
            </div>
          </div>

          {data.results.map((pos) => (
            <div key={pos.positionId} className="mb-8">
              <h3 className="font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-100">{pos.positionTitle}</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 uppercase">
                    <th className="pb-2">Candidate</th>
                    <th className="pb-2">Votes</th>
                    <th className="pb-2">Percentage</th>
                    <th className="pb-2">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {pos.candidates.map((c) => (
                    <tr key={c.id} className="border-t border-slate-50">
                      <td className="py-2 font-medium">{c.name}</td>
                      <td className="py-2">{c.voteCount}</td>
                      <td className="py-2">{c.percentage}%</td>
                      <td className="py-2">
                        {c.isTiedForWinner ? (
                          <span className="badge-yellow">Draw</span>
                        ) : c.isWinner ? (
                          <span className="badge-green">Winner</span>
                        ) : (
                          <span className="badge-gray">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {pos.invalidVotes > 0 && (
                    <tr className="border-t border-slate-50">
                      <td className="py-2 italic text-slate-400">Invalid / Abstained</td>
                      <td className="py-2 italic text-slate-400">{pos.invalidVotes}</td>
                      <td className="py-2 italic text-slate-400">—</td>
                      <td className="py-2">—</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ))}

          <p className="text-xs text-slate-400 text-center mt-8 pt-6 border-t border-slate-100">
            Generated on {format(new Date(), 'MMM d, yyyy h:mm a')} · School Election Management System
          </p>
        </div>
      ) : null}
    </DashboardLayout>
  );
};

export default ReportsPage;
