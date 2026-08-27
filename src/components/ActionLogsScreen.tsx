import { useEffect, useState } from 'react';
import { Inbox } from 'lucide-react';
import { useAuthedFetch } from '../context/AuthContext';
import type { ActionLog } from '../types';

// Read-only — ActionLog entries are only ever written internally (by the Loans flow), so
// this screen has no create/edit/delete, unlike the generic EntityTable screens.
export default function ActionLogsScreen() {
  const authedFetch = useAuthedFetch();
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authedFetch('/api/action-logs')
      .then((res) => res.json())
      .then((data) => setLogs(data.items || []))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-gray-900 mb-5">לוגי פעולות</h1>
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-white rounded-xl border border-gray-100 animate-pulse" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Inbox className="w-10 h-10 mb-2" strokeWidth={1.5} />
          <p className="text-sm">אין רשומות עדיין</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70">
                  <th className="text-right px-4 py-3 font-medium text-gray-500">תאריך</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">סוג הפעולה</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">בוצע על ידי</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">השאלה</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">הערות</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{new Date(log.date).toLocaleString('he-IL')}</td>
                    <td className="px-4 py-3 text-gray-700">{log.actionType}</td>
                    <td className="px-4 py-3 text-gray-700">{log.performedBy}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{log.loanId}</td>
                    <td className="px-4 py-3 text-gray-500">{log.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
