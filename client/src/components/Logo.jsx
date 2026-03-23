import React from 'react';
import { motion } from 'framer-motion';

const Logo = ({ className = "w-10 h-10", animated = false }) => {
  return (
    <motion.div 
      className={`relative ${className} flex items-center justify-center`}
      animate={animated ? { scale: [1, 1.05, 1] } : {}}
      transition={animated ? { repeat: Infinity, duration: 2, ease: "easeInOut" } : {}}
    >
      {/* Background Shape: Hexagonal Shield */}
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 w-full h-full drop-shadow-lg">
        <path 
          d="M50 5L90 25V75L50 95L10 75V25L50 5Z" 
          fill="url(#logo-gradient)" 
          stroke="#65A30D" 
          strokeWidth="2"
        />
        <defs>
          <linearGradient id="logo-gradient" x1="0" y1="0" x2="100" y2="100">
            <stop offset="0%" stopColor="#14532D" />
            <stop offset="100%" stopColor="#064E3B" />
          </linearGradient>
        </defs>
      </svg>

      {/* The Glitch-U / Lightning Bolt */}
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative z-10 w-3/5 h-3/5">
        {/* Left Side of U */}
        <motion.path 
          d="M30 35V65C30 75 40 80 50 80" 
          stroke="white" 
          strokeWidth="8" 
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
        {/* Right Side / Lightning Bolt (The "Unfumble" Power) */}
        <motion.path 
          d="M50 80C60 80 70 75 70 65V35L55 50L75 50L60 75" 
          stroke="#65A30D" 
          strokeWidth="8" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
        />
      </svg>

      {/* Glitch Effect Particles */}
      {animated && (
        <>
          <motion.div 
            className="absolute top-0 right-0 w-1 h-1 bg-[#65A30D] rounded-full"
            animate={{ x: [0, 10, 0], opacity: [0, 1, 0] }}
            transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }}
          />
          <motion.div 
            className="absolute bottom-2 left-2 w-1 h-1 bg-white rounded-full"
            animate={{ x: [0, -10, 0], opacity: [0, 1, 0] }}
            transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}
          />
        </>
      )}
    </motion.div>
  );
};

export default Logo;
