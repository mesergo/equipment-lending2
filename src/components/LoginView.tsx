import { useState, type FormEvent } from 'react';
import { Package } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginView() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-teal-600 flex items-center justify-center mb-3">
            <Package className="w-7 h-7 text-white" strokeWidth={2} />
          </div>
          <h1 className="text-xl font-bold text-gray-900">lendingCRM</h1>
          <p className="text-sm text-gray-400 mt-1">התחבר לחשבון שלך</p>
        </div>

        <label className="block text-sm font-medium text-gray-700 mb-1">כתובת דואר אלקטרוני</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          required
        />

        <label className="block text-sm font-medium text-gray-700 mb-1">סיסמה</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          required
        />

        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-lg py-2.5 font-medium transition-colors disabled:opacity-50"
        >
          {submitting ? '...' : 'התחבר'}
        </button>
      </form>
    </div>
  );
}
