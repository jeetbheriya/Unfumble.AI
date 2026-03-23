import React, { useState } from 'react';
import ResumeUpload from './features/resume-analysis/ResumeUpload';
import InterviewRoom from './features/interview-room/InterviewRoom';
import Dashboard from './features/results-dashboard/Dashboard';
import Logo from './components/Logo';
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from '@clerk/clerk-react';
import { Github, Linkedin, Mail, MessageSquare, Shield, Zap, Target, ArrowRight } from 'lucide-react';

function App() {
  const [step, setStep] = useState('upload'); // upload, interview, results
  const [sessionInfo, setSessionInfo] = useState(null);
  const [sessionId, setSessionId] = useState(null);

  const handleResumeProcessed = (data) => {
    setSessionInfo(data);
    setStep('interview');
  };

  const handleInterviewComplete = (id) => {
    setSessionId(id);
    setStep('results');
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#1F2937]">
      {/* PERSISTENT NAVBAR */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-[#E5E7EB] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo className="w-10 h-10" />
            <span className="text-2xl font-black tracking-tighter text-[#14532D] uppercase">
              UNFUMBLE <span className="text-[#65A30D]">.AI</span>
            </span>
          </div>

          <div className="flex items-center gap-6">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="text-sm font-bold text-[#4B5563] hover:text-[#14532D] transition-colors">Sign In</button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="bg-[#14532D] text-white px-6 py-2.5 rounded-full text-sm font-bold hover:shadow-lg hover:shadow-[#14532D]/20 transition-all">
                  Get Started Free
                </button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </div>
        </div>
      </nav>

      <main className="pt-24">
        {/* LANDING PAGE (SIGNED OUT) */}
        <SignedOut>
          {/* Hero Section */}
          <section className="max-w-7xl mx-auto px-6 py-20 grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#14532D]/5 rounded-full border border-[#14532D]/10">
                <Zap className="w-4 h-4 text-[#14532D]" />
                <span className="text-xs font-bold uppercase tracking-widest text-[#14532D]">AI-Powered Mock Interviews</span>
              </div>
              <h2 className="text-6xl lg:text-7xl font-black tracking-tight leading-[1.1] text-[#111827]">
                Master your <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#14532D] to-[#65A30D]">next interview</span> <span className="text-[#111827]">with AI.</span>
              </h2>
              <p className="text-xl text-[#6B7280] leading-relaxed max-w-lg">
                Upload your resume, and let our AI generate personalized technical questions based on your actual experience. Practice in real-time with voice recognition.
              </p>
              <div className="flex items-center gap-4">
                <SignUpButton mode="modal">
                  <button className="bg-[#111827] text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-3 hover:bg-[#1F2937] transition-all group shadow-xl">
                    Start Mock Interview <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </SignUpButton>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute -inset-4 bg-gradient-to-br from-[#14532D]/10 to-[#65A30D]/10 rounded-[40px] blur-2xl group-hover:opacity-100 opacity-50 transition-opacity"></div>
              <div className="relative bg-white border border-[#E5E7EB] rounded-[32px] shadow-2xl overflow-hidden aspect-[4/3] flex flex-col">
                <div className="p-4 bg-[#F9FAFB] border-b border-[#E5E7EB] flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#EF4444]/20"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]/20"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-[#10B981]/20"></div>
                  </div>
                  <div className="flex-1 text-center text-[10px] font-mono text-[#9CA3AF] uppercase tracking-widest">ai-interview-session-active</div>
                </div>
                <div className="flex-1 p-10 flex flex-col items-center justify-center space-y-6">
                  <div className="w-20 h-20 bg-[#F3F4F6] rounded-full border-2 border-dashed border-[#E5E7EB] flex items-center justify-center">
                    <MessageSquare className="w-8 h-8 text-[#D1D5DB]" />
                  </div>
                  <div className="space-y-3 w-full">
                    <div className="h-4 bg-[#F3F4F6] rounded-full w-3/4 mx-auto animate-pulse"></div>
                    <div className="h-4 bg-[#F3F4F6] rounded-full w-1/2 mx-auto animate-pulse"></div>
                  </div>
                  <div className="pt-8 w-full flex gap-3">
                    <div className="flex-1 h-12 bg-[#14532D]/5 rounded-xl border border-[#14532D]/10"></div>
                    <div className="w-24 h-12 bg-[#14532D] rounded-xl shadow-lg shadow-[#14532D]/40"></div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Features Grid */}
          <section className="bg-white py-24 border-y border-[#E5E7EB]">
            <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-12">
              <div className="space-y-4">
                <div className="w-12 h-12 bg-[#14532D]/5 rounded-xl flex items-center justify-center">
                  <Target className="w-6 h-6 text-[#14532D]" />
                </div>
                <h4 className="text-xl font-bold text-[#111827]">RAG Analysis</h4>
                <p className="text-[#6B7280]">Our AI reads your resume using RAG technology to ask highly relevant technical questions.</p>
              </div>
              <div className="space-y-4">
                <div className="w-12 h-12 bg-[#14532D]/5 rounded-xl flex items-center justify-center">
                  <Shield className="w-6 h-6 text-[#14532D]" />
                </div>
                <h4 className="text-xl font-bold text-[#111827]">Safe Practice</h4>
                <p className="text-[#6B7280]">Practice in a stress-free environment before your actual big day. Build confidence character by character.</p>
              </div>
              <div className="space-y-4">
                <div className="w-12 h-12 bg-[#14532D]/5 rounded-xl flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-[#14532D]" />
                </div>
                <h4 className="text-xl font-bold text-[#111827]">Voice & Text</h4>
                <p className="text-[#6B7280]">Supports both speech-to-text and manual typing. Get evaluated on your communication style.</p>
              </div>
            </div>
          </section>

          {/* About Section */}
          <section className="max-w-7xl mx-auto px-6 py-24 text-center">
            <h3 className="text-3xl font-bold mb-12 text-[#111827]">Built by Developer, for Developers</h3>
            <div className="bg-white border border-[#E5E7EB] p-12 rounded-[40px] flex flex-col md:flex-row items-center gap-12 text-left shadow-xl">
              <div className="w-32 h-32 bg-[#14532D]/5 rounded-full border border-[#14532D]/10 flex items-center justify-center shrink-0">
                <span className="text-4xl font-black italic text-[#14532D]">DJ</span>
              </div>
              <div className="flex-1 space-y-4">
                <h4 className="text-2xl font-bold text-[#111827]">About the Creator</h4>
                <p className="text-[#6B7280] leading-relaxed text-lg">
                  I created UNFUMBLE.AI to bridge the gap between technical knowledge and interview confidence. 
                  Leveraging modern AI stacks like Gemini, Pinecone, and BullMQ to provide the most realistic practice possible.
                </p>
                <div className="flex gap-6 pt-4">
                  <a href="https://github.com/jeetbheriya" className="flex items-center gap-2 text-sm text-[#14532D] font-bold hover:text-[#65A30D] transition-colors"><Github className="w-4 h-4" /> GitHub</a>
                  <a href="https://www.linkedin.com/in/jeet-bheriya" className="flex items-center gap-2 text-sm text-[#14532D] font-bold hover:text-[#65A30D] transition-colors"><Linkedin className="w-4 h-4" /> LinkedIn</a>
                  <a href="mailto:jbheriya11@gmail.com" className="flex items-center gap-2 text-sm text-[#14532D] font-bold hover:text-[#65A30D] transition-colors"><Mail className="w-4 h-4" /> Contact</a>
                </div>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="py-12 text-center text-[#9CA3AF] text-sm font-mono uppercase tracking-[0.2em]">
            © 2026 SniPify • All Rights Reserved
          </footer>
        </SignedOut>

        {/* APP INTERFACE (SIGNED IN) */}
        <SignedIn>
          <div className="max-w-7xl mx-auto px-6 pb-24">
            <div className="relative">
              {step === 'upload' && (
                <div className="max-w-4xl mx-auto bg-white border border-[#E5E7EB] rounded-3xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                  <ResumeUpload onProcessed={handleResumeProcessed} />
                </div>
              )}
              {step === 'interview' && (
                <InterviewRoom 
                  sessionData={sessionInfo} 
                  onComplete={handleInterviewComplete} 
                />
              )}
              {step === 'results' && <Dashboard sessionId={sessionId} />}
            </div>
          </div>
        </SignedIn>
      </main>
    </div>
  );
}

export default App;
