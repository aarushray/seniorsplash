import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { firestore } from '../firebase/config';
import { useAuth } from '../context/AuthContext';

const Particulars = () => {
  const { currentUser } = useAuth();
  const [fullName, setFullName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [studentId, setStudentId] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      navigate('/login');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const userRef = doc(firestore, 'players', currentUser.uid);
      await updateDoc(userRef, {
        fullName,
        studentClass,
        studentId,
      });

      navigate('/joingame');
    } catch (err) {
      console.error('Failed to update particulars:', err);
      setError('Failed to save your information. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Header Section */}
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold text-white mb-2">Enter Your Details</h2>
          <p className="text-gray-400">Please provide your information to complete registration.</p>
        </div>
        
        {/* Particulars Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <input
              type="text"
              placeholder="Full Name"
              className="w-full px-4 py-3 bg-transparent border-b border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:border-white transition-colors"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          
          <div>
            <input
              type="text"
              placeholder="Class"
              className="w-full px-4 py-3 bg-transparent border-b border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:border-white transition-colors"
              value={studentClass}
              onChange={(e) => setStudentClass(e.target.value)}
              required
            />
          </div>

          <div>
            <input
              type="text"
              placeholder="Student ID"
              className="w-full px-4 py-3 bg-transparent border-b border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:border-white transition-colors"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              required
            />
          </div>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting || !fullName || !studentClass || !studentId}
            className="w-full py-3 bg-gray-800 text-white font-semibold border border-gray-600 rounded hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : 'Continue to Game'}
          </button>
        </form>

        {/* Divider */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-900 text-gray-400">OR</span>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="mt-6 text-center">
          <p className="text-gray-400">
            Need to go back?{' '}
            <button
              onClick={() => navigate('/register')}
              className="text-white hover:underline font-semibold"
            >
              Return to Sign Up
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Particulars;