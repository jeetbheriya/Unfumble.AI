import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Upload, CheckCircle } from 'lucide-react';
import { useAuth, useUser } from '@clerk/clerk-react';

const ResumeUpload = ({ onProcessed }) => {
  const { getToken } = useAuth();
  const { user: clerkUser } = useUser();
  const [file, setFile] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-fill from Clerk when user is loaded
  useEffect(() => {
    if (clerkUser) {
      setName(clerkUser.fullName || clerkUser.username || '');
      setEmail(clerkUser.primaryEmailAddress?.emailAddress || '');
    }
  }, [clerkUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('resume', file);
    formData.append('name', name);
    formData.append('email', email);

    try {
      const token = await getToken();
      const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '';
      console.log('Token retrieved from Clerk:', token ? 'YES (Length: ' + token.length + ')' : 'NO');
      console.log(`Sending request to ${API_BASE_URL}/api/interview/upload-resume...`);
      const response = await axios.post(`${API_BASE_URL}/api/interview/upload-resume`, formData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      console.log('Upload Success:', response.data);
      onProcessed(response.data);
    } catch (err) {
      console.error('--- UPLOAD ERROR ---');
      console.error('Status:', err.response?.status);
      console.error('Data:', err.response?.data);
      console.error('Message:', err.message);
      if (err.response?.data?.error) {
        console.error('Server Detail:', err.response.data.error);
      }
      
      const data = err.response?.data;
      const msg = data?.message || 'Upload failed.';
      const debug = data?.debug_error ? `\nDetails: ${data.debug_error}` : '';
      alert(`Error: ${msg}${debug}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-12 rounded-2xl">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-[#14532D] mb-2">Get Started</h2>
          <p className="text-[#374151]">Upload your resume to begin your personalized interview session.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#374151] uppercase tracking-wider ml-1">Full Name</label>
              <input 
                type="text" placeholder="SniPify" required
                className="w-full bg-[#F3F4F6] p-4 rounded-xl border border-[#E5E7EB] focus:outline-none focus:ring-2 focus:ring-[#14532D]/30 transition duration-300 placeholder:text-[#374151]/40"
                value={name} onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#374151] uppercase tracking-wider ml-1">Email Address</label>
              <input 
                type="email" placeholder="snipify@example.com" required
                className="w-full bg-[#F3F4F6] p-4 rounded-xl border border-[#E5E7EB] focus:outline-none focus:ring-2 focus:ring-[#14532D]/30 transition duration-300 placeholder:text-[#374151]/40"
                value={email} onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#374151] uppercase tracking-wider ml-1">Resume (PDF)</label>
            <label className="group relative flex flex-col items-center justify-center p-12 border-2 border-dashed border-[#E5E7EB] hover:border-[#14532D]/50 rounded-2xl cursor-pointer bg-[#F3F4F6]/50 hover:bg-[#F3F4F6] transition duration-500">
              <div className="p-4 bg-white border border-[#E5E7EB] rounded-2xl mb-4 group-hover:scale-110 group-hover:bg-[#14532D] group-hover:text-white transition duration-500 shadow-sm">
                <Upload className="w-8 h-8 text-[#14532D] group-hover:text-white" />
              </div>
              <span className="text-lg font-medium text-[#374151]">{file ? file.name : 'Click to select your PDF'}</span>
              <span className="text-[#374151]/60 text-sm mt-1">PDF format only, max 5MB</span>
              <input type="file" accept=".pdf" className="hidden" onChange={(e) => setFile(e.target.files[0])} />
            </label>
          </div>

          <button 
            disabled={loading}
            className="w-full relative group overflow-hidden bg-[#14532D] hover:bg-[#14532D]/90 p-4 rounded-xl font-bold text-white shadow-sm active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
          >
            <div className="relative z-10 flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>AI is analyzing your profile...</span>
                </>
              ) : (
                <>
                  <span>Initialize Interview Session</span>
                  <CheckCircle className="w-5 h-5" />
                </>
              )}
            </div>
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResumeUpload;
