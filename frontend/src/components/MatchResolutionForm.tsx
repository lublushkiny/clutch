import React, { useState } from 'react';
import axios from 'axios';
import type { Match } from '../types';

interface MatchResolutionFormProps {
  match: Match;
  mode: 'resolve' | 'edit';
  onComplete: () => void;
  onCancel: () => void;
  playerAName: string;
  playerBName: string;
}

export const MatchResolutionForm: React.FC<MatchResolutionFormProps> = ({ match, mode, onComplete, onCancel, playerAName, playerBName }) => {
  const [scoreA, setScoreA] = useState(match.scoreA?.toString() || '');
  const [scoreB, setScoreB] = useState(match.scoreB?.toString() || '');
  const [videoUrl, setVideoUrl] = useState(match.videoUrl || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalScoreA = parseInt(scoreA, 10);
    const finalScoreB = parseInt(scoreB, 10);

    if (isNaN(finalScoreA) || isNaN(finalScoreB) || finalScoreA === finalScoreB) {
      alert('Счет должен быть указан числами и не может быть ничейным.');
      return;
    }
    
    setIsSubmitting(true);
    const url = mode === 'edit' ? '/api/matches/edit' : '/api/matches/resolve';
    const method = mode === 'edit' ? 'put' : 'post';
    
    try {
      const response = await axios[method](url, { 
        matchId: match.id, 
        scoreA: finalScoreA, 
        scoreB: finalScoreB,
        videoUrl: videoUrl || null 
      });
      alert(response.data.message);
      onComplete();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Не удалось сохранить результат.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-700 p-4 rounded-b-lg -mt-1">
      <div className="flex items-center justify-around mb-4">
        <div className="text-center">
          <label className="block mb-2 font-semibold">{playerAName}</label>
          <input 
            type="number"
            value={scoreA}
            onChange={(e) => setScoreA(e.target.value)}
            className="w-20 h-20 text-4xl text-center bg-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <div className="text-4xl font-bold text-gray-500">:</div>
        <div className="text-center">
           <label className="block mb-2 font-semibold">{playerBName}</label>
           <input 
            type="number"
            value={scoreB}
            onChange={(e) => setScoreB(e.target.value)}
            className="w-20 h-20 text-4xl text-center bg-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
      </div>
      <div className="mb-4">
        <label className="block mb-1 text-sm text-gray-300">Ссылка на видео (YouTube)</label>
        <input 
          type="url"
          placeholder="https://..."
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          className="w-full p-2 bg-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>
      <div className="flex justify-end space-x-3">
        <button type="button" onClick={onCancel} className="bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded-md">Отмена</button>
        <button type="submit" disabled={isSubmitting} className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-md disabled:opacity-50">
          {isSubmitting ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>
    </form>
  );
};
