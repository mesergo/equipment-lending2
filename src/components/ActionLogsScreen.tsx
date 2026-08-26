import { useEffect, useState } from 'react';
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
      <h1 className="text-xl font-bold mb-4">לוגי פעולות</h1>
      {loading ? (
        <p className="text-gray-500">טוען...</p>
      ) : logs.length === 0 ? (
        <p className="text-gray-500">אין רשומות עדיין.</p>
      ) : (
        <div className="bg-white border rounded overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-right px-3 py-2 font-medium text-gray-600">תאריך</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">סוג הפעולה</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">בוצע על ידי</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">השאלה</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">הערות</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b last:border-0">
                  <td className="px-3 py-2 whitespace-nowrap">{new Date(log.date).toLocaleString('he-IL')}</td>
                  <td className="px-3 py-2">{log.actionType}</td>
                  <td className="px-3 py-2">{log.performedBy}</td>
                  <td className="px-3 py-2 text-xs text-gray-500">{log.loanId}</td>
                  <td className="px-3 py-2">{log.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
