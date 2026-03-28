import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area 
} from 'recharts';
import { 
  Star, CheckCircle2, AlertTriangle, BookOpen, MessageSquare, Loader2, 
  History, TrendingUp, Calendar, ChevronRight, Award
} from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';

const Dashboard = ({ sessionId }) => {
  const { getToken } = useAuth();
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [growth, setGrowth] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await getToken();
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
        const headers = { Authorization: `Bearer ${token}` };

        // Fetch current session
        const res = await axios.get(`${API_BASE_URL}/api/interview/results/${sessionId}`, { headers });
        setData(res.data);

        // Fetch growth analytics if we have a userId
        if (res.data.userId) {
          try {
            const growthRes = await axios.get(`${API_BASE_URL}/api/interview/growth/${res.data.userId}`, { headers });
            setGrowth(growthRes.data);
          } catch (gErr) {
            console.warn('Growth fetch error (expected for first-timers):', gErr.message);
          }
        }

        // Fetch history
        const historyRes = await axios.get(`${API_BASE_URL}/api/interview/history`, { headers });
        setHistory(historyRes.data);
      } catch (err) {
        console.error('Fetch Error:', err);
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchData();
  }, [sessionId]);

  if (!data) return (
    <div className="flex flex-col items-center justify-center py-32 space-y-6 bg-[#F9FAFB] min-h-screen">
      <Loader2 className="w-16 h-16 text-[#14532D] animate-spin" />
      <div className="text-center">
        <h3 className="text-2xl font-bold text-[#14532D] mb-2 uppercase tracking-widest">Generating Audit</h3>
        <p className="text-[#374151] font-medium">Synthesizing performance metrics and behavioral patterns...</p>
      </div>
    </div>
  );

  const score = data.score || { technical: 0, communication: 0, overall: 0 };
  const solidAreas = data.score?.solidAreas || [];
  const areasToImprove = data.score?.areasToImprove || [];
  const areasToLearn = data.score?.areasToLearn || [];

  const chartData = [
    { name: 'Technical', score: score.technical || 0 },
    { name: 'Communication', score: score.communication || 0 },
    { name: 'Overall', score: score.overall || 0 },
  ];

  // Prepare trend data (last 5 sessions)
  const trendData = [...history].reverse().slice(-5).map((s, i) => ({
    name: `Session ${i + 1}`,
    score: s.score?.overall || 0
  }));

  return (
    <div className="p-4 lg:p-8 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
             <div className="px-3 py-1 bg-[#14532D] text-white text-[10px] font-bold rounded-full uppercase tracking-tighter">Verified Audit</div>
             <span className="text-xs text-[#6B7280] font-mono">ID: {sessionId.slice(-6)}</span>
          </div>
          <h2 className="text-4xl font-black text-[#111827] tracking-tight uppercase">Performance <span className="text-[#14532D]">Audit</span></h2>
        </div>
        <div className="flex gap-4">
          <button onClick={() => window.location.reload()} className="px-6 py-3 bg-[#111827] text-white font-bold rounded-xl hover:bg-[#1F2937] transition-all flex items-center gap-2 text-sm shadow-lg shadow-black/10">
            <Award className="w-4 h-4" /> Start New Session
          </button>
        </div>
      </div>

      {/* TOP METRICS ROW */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Score Bar Chart */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[32px] border border-[#E5E7EB] shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold flex items-center gap-3 text-[#111827] uppercase tracking-tighter">
              <TrendingUp className="w-5 h-5 text-[#14532D]" />
              Metric Distribution
            </h3>
            <div className="text-right">
              <span className="block text-3xl font-black text-[#14532D]">{score.overall}%</span>
              <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest">Aggregate Score</span>
            </div>
          </div>
          <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{fill: '#F9FAFB'}} 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} 
                />
                <Bar dataKey="score" fill="#14532D" radius={[12, 12, 12, 12]} barSize={60} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Growth Velocity (Trend) - UPDATED TO LIGHT THEME */}
        <div className="bg-white p-8 rounded-[32px] border border-[#E5E7EB] shadow-sm">
          <h3 className="text-xl font-bold flex items-center gap-3 mb-8 uppercase tracking-tighter text-[#111827]">
            <History className="w-5 h-5 text-[#14532D]" />
            Growth Velocity
          </h3>
          <div className="w-full h-[220px] mb-6">
            {trendData.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#14532D" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#14532D" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="score" stroke="#14532D" strokeWidth={4} fillOpacity={1} fill="url(#colorScore)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center border-2 border-dashed border-[#E5E7EB] rounded-2xl bg-[#F9FAFB] text-xs text-[#9CA3AF] italic">
                Need 2+ sessions to track trends
              </div>
            )}
          </div>
          <p className="text-xs text-[#6B7280] leading-relaxed">
            Your performance velocity is {growth?.velocity > 0 ? 'increasing' : growth?.velocity < 0 ? 'declining' : 'steady'}. 
            Cumulative mastery includes: <span className="text-[#14532D] font-bold uppercase tracking-wider">{growth?.topSkills?.slice(0, 3).join(', ') || 'Pending Data'}</span>.
          </p>
        </div>
      </div>

      {/* FEEDBACK & ARCHIVE GRID */}
      <div className="grid lg:grid-cols-3 gap-8 items-start">
        {/* AI Final Word */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[32px] border border-[#E5E7EB] shadow-sm">
           <div className="flex items-center gap-3 mb-6">
             <MessageSquare className="w-6 h-6 text-[#14532D]" />
             <h3 className="text-xl font-bold text-[#111827] uppercase tracking-tighter">Technical Narrative</h3>
           </div>
           <p className="text-[#374151] italic text-lg leading-relaxed bg-[#F9FAFB] p-8 rounded-2xl border border-[#E5E7EB] font-serif">
             "{data.feedback || 'No feedback generated.'}"
           </p>
           
           <div className="grid md:grid-cols-3 gap-6 mt-8">
              <div className="p-5 bg-[#65A30D]/5 rounded-2xl border border-[#65A30D]/10">
                <span className="text-[10px] font-bold text-[#65A30D] uppercase block mb-2 tracking-widest">Solid Mastery</span>
                <p className="text-xs font-bold text-[#111827]">{solidAreas.join(', ') || 'Analyzing...'}</p>
              </div>
              <div className="p-5 bg-[#B45309]/5 rounded-2xl border border-[#B45309]/10">
                <span className="text-[10px] font-bold text-[#B45309] uppercase block mb-2 tracking-widest">Main Gap</span>
                <p className="text-xs font-bold text-[#111827]">{areasToImprove.join(', ') || 'Analyzing...'}</p>
              </div>
              <div className="p-5 bg-[#991B1B]/5 rounded-2xl border border-[#991B1B]/10">
                <span className="text-[10px] font-bold text-[#991B1B] uppercase block mb-2 tracking-widest">Study Focus</span>
                <p className="text-xs font-bold text-[#111827]">{areasToLearn.join(', ') || 'Analyzing...'}</p>
              </div>
           </div>
        </div>

        {/* Session Archive */}
        <div className="bg-white p-8 rounded-[32px] border border-[#E5E7EB] shadow-sm h-full max-h-[500px] flex flex-col">
          <h3 className="text-xl font-bold flex items-center gap-3 mb-6 text-[#111827] uppercase tracking-tighter">
            <Calendar className="w-5 h-5 text-[#14532D]" />
            Recent History
          </h3>
          <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
            {loadingHistory ? (
              [1,2,3,4].map(i => (
                <div key={i} className="p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl animate-pulse flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="h-3 bg-[#E5E7EB] rounded w-1/2"></div>
                    <div className="h-2 bg-[#E5E7EB] rounded w-1/4"></div>
                  </div>
                  <div className="w-4 h-4 bg-[#E5E7EB] rounded-full"></div>
                </div>
              ))
            ) : history.length > 0 ? history.map((session, idx) => (
              <div key={session._id} className="p-4 bg-[#F9FAFB] hover:bg-[#F3F4F6] border border-[#E5E7EB] rounded-2xl transition-all cursor-pointer group flex items-center justify-between">
                <div>
                  <span className="block text-xs font-bold text-[#111827]">{session.role || 'Software Engineer'}</span>
                  <span className="text-[10px] text-[#6B7280]">{new Date(session.createdAt).toLocaleDateString()} • {session.score?.overall || 0}%</span>
                </div>
                <ChevronRight className="w-4 h-4 text-[#D1D5DB] group-hover:text-[#14532D] transition-colors" />
              </div>
            )) : (
              <div className="text-center py-10 opacity-30 text-xs italic">No history found.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
