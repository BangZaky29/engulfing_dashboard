import { useState } from 'react';
import { useReportData } from '../../hooks/useReportData';
import { FileText, Download, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

export function ReportGallery() {
  const { reports, loading, error } = useReportData();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center text-danger gap-2">
        <AlertCircle />
        <span>Failed to load reports: {error}</span>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="flex flex-col h-64 items-center justify-center text-slate-400 gap-3">
        <FileText size={48} className="opacity-50" />
        <p>Belum ada arsip laporan PDF.</p>
      </div>
    );
  }

  // Pagination Logic
  const totalPages = Math.ceil(reports.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentReports = reports.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-4">
      <div className="bg-surface border border-white/5 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/80 text-xs uppercase text-slate-400 border-b border-white/5">
              <tr>
                <th scope="col" className="px-6 py-4 font-semibold">Tipe Laporan</th>
                <th scope="col" className="px-6 py-4 font-semibold">Tanggal</th>
                <th scope="col" className="px-6 py-4 font-semibold text-center">Total Trade</th>
                <th scope="col" className="px-6 py-4 font-semibold text-center">Win Rate</th>
                <th scope="col" className="px-6 py-4 font-semibold text-right">Profit</th>
                <th scope="col" className="px-6 py-4 font-semibold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {currentReports.map((report) => (
                <tr key={report.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4 flex items-center gap-3">
                    <div className="bg-primary/20 p-2 rounded-lg text-primary">
                      <FileText size={16} />
                    </div>
                    <span className="font-medium text-white capitalize">{report.report_type.replace('_', ' ')}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {format(new Date(report.report_date), 'dd MMM yyyy')}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {report.total_trades}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${report.win_rate >= 50 ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                      {report.win_rate.toFixed(1)}%
                    </span>
                  </td>
                  <td className={`px-6 py-4 text-right font-bold ${report.total_profit >= 0 ? 'text-success' : 'text-danger'}`}>
                    ${report.total_profit.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <a
                      href={report.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary font-medium py-1.5 px-3 rounded-lg transition-colors text-xs"
                    >
                      <Download size={14} />
                      Unduh PDF
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-surface border border-white/5 rounded-xl">
          <div className="text-sm text-slate-400">
            Menampilkan <span className="font-medium text-white">{startIndex + 1}</span> sampai{' '}
            <span className="font-medium text-white">
              {Math.min(startIndex + itemsPerPage, reports.length)}
            </span>{' '}
            dari <span className="font-medium text-white">{reports.length}</span> laporan
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
