import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useWebcam } from '../../hooks/useWebcam';
import { useSpeechToText } from '../../hooks/useSpeechToText';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from '../../components/Logo';
import { Mic, MicOff, Send, Loader2, Video, AlertCircle, CheckCircle2, XCircle, Info, Settings } from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';
import confetti from 'canvas-confetti';

const InterviewRoom = ({ sessionData, onComplete }) => {
  const { getToken } = useAuth();
  const { user = {}, role = "", stack = [], firstQuestion = "", questions = {}, resumeText = "" } = sessionData || {};

  const { stream } = useWebcam();
  const { transcript, setTranscript, isListening, startListening, stopListening } = useSpeechToText();
  
  const [sessionId, setSessionId] = useState(null);
  const [aiText, setAiText] = useState(firstQuestion);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const [session, setSession] = useState(null);
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);

  const videoRef = useRef(null);

  if (!sessionData || !user._id) {
    return (
      <div className="flex flex-col items-center justify-center p-24 bg-[#F3F4F6] min-h-screen">
        <Loader2 className="w-12 h-12 text-[#14532D] animate-spin mb-4" />
        <h2 className="text-xl font-bold tracking-tight text-[#14532D] uppercase">Initializing AI Session...</h2>
      </div>
    );
  }

  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream;
  }, [stream]);

  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      // Filter for English voices (commonly available)
      const englishVoices = availableVoices.filter(v => v.lang.startsWith('en'));
      setVoices(englishVoices);
      
      // Default to the first English voice or first available
      if (englishVoices.length > 0 && !selectedVoice) {
        setSelectedVoice(englishVoices[0]);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [selectedVoice]);

  useEffect(() => {
    const startInterview = async () => {
      try {
        const token = await getToken();
        const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '';
        const res = await axios.post(`${API_BASE_URL}/api/interview/start-session`, { 
          userId: user._id, role, stack, firstQuestion, questions, resumeText
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSessionId(res.data._id);
        setSession(res.data);
        speak(res.data.questions.easy[0]); // Speak the question from the saved session
      } catch (err) {
        console.error('Session Start Error:', err);
      }
    };
    startInterview();
  }, [user._id, role, stack, firstQuestion, questions, resumeText]);

  const speak = (text) => {
    if (!text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    utterance.rate = 0.95; // Slightly slower for better clarity
    utterance.pitch = 1.0;
    
    utterance.onstart = () => setIsAiSpeaking(true);
    utterance.onend = () => {
      setIsAiSpeaking(false);
      setTimeout(() => startListening(), 800);
    };
    window.speechSynthesis.speak(utterance);
  };

  const handleTurn = async (manualMessage = null) => {
    if (isListening) stopListening();
    
    const message = manualMessage !== null ? manualMessage : transcript.trim();
    
    if (!message && !manualMessage) {
      alert("Please provide an answer either by speaking or typing.");
      return;
    }

    setLoading(true);
    try {
      const token = await getToken();
      const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '';
      const res = await axios.post(`${API_BASE_URL}/api/interview/submit-turn`, {
        sessionId,
        userMessage: message
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const { evaluation, nextQuestion, shouldEnd, session: updatedSession } = res.data;

      // TRIGGER CELEBRATION ON LEVEL UP
      if (session && updatedSession?.currentLevel !== session.currentLevel) {        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#14532D', '#65A30D', '#ffffff']
        });
      }

      setEvaluation(evaluation);
      setSession(updatedSession);
      setTranscript('');

      setTimeout(async () => {
        if (shouldEnd) {
          onComplete(sessionId);
        } else {
          setAiText(nextQuestion);
          setEvaluation(null);
          speak(nextQuestion);
        }
      }, 5000);

    } catch (err) {
      console.error('Turn Error:', err.response?.data || err.message);
      alert('Error submitting answer: ' + (err.response?.data?.message || 'Check console for details.'));
    } finally {
      setLoading(false);
    }
  };

  const [manualInput, setManualInput] = useState('');

  const getProgress = () => {
    if (!session) return 0;
    const levelMap = { easy: 0, medium: 5, hard: 10 };
    const base = levelMap[session.currentLevel] || 0;
    return ((base + session.currentQuestionIndex + 1) / 15) * 100;
  };

  return (
    <div className="columns-1 lg:columns-2 gap-8 p-6 lg:p-10 min-h-screen space-y-0 bg-[#F3F4F6]">
      <div className="break-inside-avoid mb-8 flex flex-col h-full">
        <div className="flex-1 bg-white rounded-2xl p-8 border border-[#E5E7EB] flex flex-col items-center justify-center relative overflow-hidden shadow-sm min-h-[400px]">
          <div className="absolute top-0 left-0 w-full h-1 bg-[#F3F4F6]">
            <motion.div className="h-full bg-[#14532D]" initial={{ width: 0 }} animate={{ width: `${getProgress()}%` }} />
          </div>
          
          <div className="absolute top-6 left-8 flex items-center gap-2">
            <span className="text-[10px] font-bold text-[#14532D] uppercase tracking-tighter bg-[#14532D]/5 px-3 py-1 rounded-full border border-[#14532D]/10">
              Protocol: {session?.currentLevel || 'EASY'}
            </span>
            <span className="text-[10px] font-bold text-[#374151] uppercase font-mono opacity-40">
              Transmission: {session?.currentQuestionIndex || 0}/5
            </span>
          </div>

          <div className="absolute top-6 right-8 flex items-center gap-2">
            <button 
              onClick={() => setShowVoiceSettings(!showVoiceSettings)}
              className="p-2 rounded-full hover:bg-[#F3F4F6] transition-colors text-[#374151]"
            >
              <Settings className="w-4 h-4" />
            </button>
            
            <AnimatePresence>
              {showVoiceSettings && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="bg-white border border-[#E5E7EB] rounded-xl p-2 shadow-lg absolute right-10 top-0 z-50 min-w-[200px]"
                >
                  <p className="text-[10px] font-bold text-[#374151] uppercase tracking-widest mb-2 px-2">Voice Settings</p>
                  <select 
                    className="w-full text-xs bg-[#F3F4F6] border-none rounded-lg p-2 focus:ring-1 focus:ring-[#14532D]"
                    value={voices.indexOf(selectedVoice)}
                    onChange={(e) => {
                      const voice = voices[e.target.value];
                      setSelectedVoice(voice);
                    }}
                  >
                    {voices.map((voice, idx) => (
                      <option key={idx} value={idx}>
                        {voice.name} ({voice.lang})
                      </option>
                    ))}
                  </select>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative z-10 w-full flex flex-col items-center text-center">
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div 
                  key="loading-skeleton"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6 w-full max-w-lg mx-auto"
                >
                  <div className="flex flex-col items-center gap-4">
                    <Logo className="w-16 h-16" animated={true} />
                    <div className="h-6 bg-[#F3F4F6] rounded-full w-32 animate-pulse" />
                  </div>
                  <div className="space-y-3 p-8 bg-[#F3F4F6]/30 rounded-[32px] border border-[#E5E7EB] border-dashed">
                    <div className="h-3 bg-[#E5E7EB] rounded-full w-full animate-pulse" />
                    <div className="h-3 bg-[#E5E7EB] rounded-full w-5/6 animate-pulse mx-auto" />
                    <div className="h-3 bg-[#E5E7EB] rounded-full w-4/6 animate-pulse mx-auto" />
                  </div>
                  <p className="text-[10px] text-[#14532D] font-bold animate-pulse uppercase tracking-[0.3em] text-center mt-8">
                    Scanning for fumbles...
                  </p>
                </motion.div>
              ) : evaluation ? (
                <motion.div 
                  key="eval" 
                  initial={{ opacity: 0, y: 20, scale: 0.95 }} 
                  animate={{ opacity: 1, y: 0, scale: 1 }} 
                  exit={{ opacity: 0, scale: 1.05 }}
                  className="space-y-6 w-full"
                >
                  <div className="flex flex-col items-center gap-3">
                    {evaluation.rating === 'CORRECT' ? <CheckCircle2 className="w-16 h-16 text-[#65A30D]" /> : 
                     evaluation.rating === 'PARTIAL' ? <Info className="w-16 h-16 text-[#B45309]" /> : <XCircle className="w-16 h-16 text-[#991B1B]" />}
                    <h3 className={`text-2xl font-black uppercase tracking-widest ${evaluation.rating === 'CORRECT' ? 'text-[#65A30D]' : evaluation.rating === 'PARTIAL' ? 'text-[#B45309]' : 'text-[#991B1B]'}`}>
                      {evaluation.rating === 'CORRECT' ? 'UNFUMBLED' : 
                       evaluation.rating === 'PARTIAL' ? 'SLIGHT FUMBLE' : 'FUMBLED'}
                    </h3>
                  </div>
                  <div className="relative">
                    <div className="absolute -inset-1 bg-gradient-to-r from-[#14532D]/5 via-transparent to-[#14532D]/5 rounded-[32px] blur-sm"></div>
                    <p className="relative text-[#374151] text-lg leading-relaxed italic bg-white p-8 rounded-[32px] border border-[#E5E7EB] w-full max-w-lg mx-auto shadow-sm">
                      "{evaluation.correction}"
                    </p>
                  </div>
                  <p className="text-[10px] text-[#374151] font-mono animate-pulse uppercase tracking-[0.3em] text-center mt-4 opacity-50">Calculating Next Move...</p>
                </motion.div>
              ) : (
                <motion.div 
                  key="question" 
                  initial={{ opacity: 0, x: 20 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-10 w-full"
                >
                  <div className={`w-28 h-28 rounded-full mx-auto border-2 transition-all duration-700 flex items-center justify-center relative ${isListening ? 'border-[#14532D] bg-[#14532D]/5' : 'border-[#E5E7EB]'}`}>
                     {isListening && (
                       <motion.div 
                         initial={{ scale: 1, opacity: 0.5 }}
                         animate={{ scale: 1.5, opacity: 0 }}
                         transition={{ repeat: Infinity, duration: 1.5 }}
                         className="absolute inset-0 rounded-full bg-[#14532D]"
                       />
                     )}
                     {isAiSpeaking ? (
                       <div className="flex gap-1.5">
                         {[1,2,3].map(i => <motion.div key={i} animate={{ height: [10, 40, 10] }} transition={{ repeat: Infinity, duration: 0.6, delay: i*0.1 }} className="w-2 bg-[#14532D] rounded-full" />)}
                       </div>
                     ) : <Mic className={`w-10 h-10 ${isListening ? 'text-[#14532D]' : 'text-[#374151] opacity-20'}`} />}
                  </div>
                  <div className="max-w-xl mx-auto px-6">
                    <p className="text-3xl text-[#111827] font-black leading-tight tracking-tight">"{aiText}"</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="break-inside-avoid mb-8 flex flex-col gap-6">
        <div className="flex-1 relative bg-white rounded-2xl overflow-hidden border border-[#E5E7EB] group shadow-sm flex flex-col min-h-[500px]">
          {stream ? <video ref={videoRef} autoPlay playsInline muted className="flex-1 object-cover min-h-[300px] opacity-90 group-hover:opacity-100 transition-opacity" /> : (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#F3F4F6] min-h-[300px]">
              <Video className="w-12 h-12 text-[#E5E7EB] mb-2" />
              <span className="text-[10px] text-[#374151] uppercase font-mono tracking-widest opacity-40">Awaiting Visual Link</span>
            </div>
          )}
          
          <div className="p-6 bg-white/95 backdrop-blur-md border-t border-[#E5E7EB] space-y-4">
            <div className="relative">
              <textarea 
                value={manualInput || transcript}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder={isListening ? "Listening..." : "Terminal input active..."}
                className="w-full bg-[#F3F4F6] border border-[#E5E7EB] rounded-2xl p-4 text-sm text-[#374151] focus:outline-none focus:ring-1 focus:ring-[#14532D]/20 h-24 resize-none font-mono placeholder:opacity-30"
              />
            </div>

            <div className="flex items-center gap-4">
              <button disabled={loading || isAiSpeaking || evaluation} onClick={isListening ? stopListening : startListening} className={`p-4 rounded-2xl transition-all flex items-center gap-2 border ${isListening ? 'bg-[#991B1B] text-white border-[#991B1B]' : 'bg-white text-[#14532D] border-[#E5E7EB] hover:bg-[#F3F4F6]'}`}>
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                <span className="text-xs font-bold uppercase tracking-wider">{isListening ? 'End Mic' : 'Mic'}</span>
              </button>

              <button 
                disabled={loading || isAiSpeaking || evaluation || (!transcript && !manualInput)} 
                onClick={() => {
                  handleTurn(manualInput || transcript);
                  setManualInput('');
                }} 
                className="flex-1 bg-[#14532D] hover:bg-[#14532D]/90 py-4 rounded-2xl font-black text-white shadow-sm active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-30 uppercase tracking-widest border border-[#14532D]"
              >
                {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <span>Submit Response</span>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewRoom;
