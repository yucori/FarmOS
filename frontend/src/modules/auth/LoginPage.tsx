import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !password) {
      toast.error('아이디와 비밀번호를 입력해주세요.');
      return;
    }
    setLoading(true);
    try {
      await login(userId, password);
      toast.success('환영합니다!');
      navigate('/');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-white text-3xl mb-4">
            🌱
          </div>
          <h1 className="text-3xl font-bold text-gray-900">FarmOS 2.0</h1>
          <p className="text-gray-500 mt-2">스마트 농장 관리 시스템</p>
        </div>

        {/* Login Form */}
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">로그인</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">아이디</label>
              <input
                type="text"
                value={userId}
                onChange={e => setUserId(e.target.value)}
                placeholder="아이디를 입력하세요"
                className="w-full px-4 py-3 text-lg border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition"
              />
            </div>
            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                className="w-full px-4 py-3 text-lg border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          {/* Links */}
          <div className="mt-6 flex justify-center gap-4 text-base">
            <Link to="/find-id" className="text-gray-500 hover:text-primary transition">
              아이디 찾기
            </Link>
            <span className="text-gray-300">|</span>
            <Link to="/find-password" className="text-gray-500 hover:text-primary transition">
              비밀번호 찾기
            </Link>
            <span className="text-gray-300">|</span>
            <Link to="/signup" className="text-primary font-semibold hover:text-primary-dark transition">
              회원가입
            </Link>
          </div>
        </div>

        {/* Test account hint */}
        <div className="mt-4 p-3 bg-info/10 rounded-xl text-center space-y-1">
          <p className="text-sm text-info font-medium">테스트 계정</p>
          <p className="text-sm text-info">farmer01 / farm1234 (김사과, 경북 영주)</p>
          <p className="text-sm text-info">parkpear / pear5678 (박배나무, 충남 천안)</p>
        </div>
      </motion.div>
    </div>
  );
}
