import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

interface AuctionPanelProps {
  onBid: () => void; // Callback to refresh data
  king: Player | undefined;
  queue: { playerId: string; bid: number; name: string }[];
}

const API_URL = 'http://localhost:3001/api';

const AuctionPanel: React.FC<AuctionPanelProps> = ({ onBid, king, queue }) => {
  const [bidAmount, setBidAmount] = useState<number>(100);
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const { user, updateUser } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!user || bidAmount <= 0) {
    setError('You must be logged in and enter a valid bid amount.');
    return;
  }
  if (user.clutchPoints < bidAmount) {
      setError('Insufficient clutch points.');
      return;
  }
  setError('');
  setIsSubmitting(true);

  try {
    await axios.post(`${API_URL}/auction/bid`, {
      bid: bidAmount,
    });

    // Fetch updated player data and update context
    const updatedPlayerRes = await axios.get(`${API_URL}/players/${user.id}`);
    updateUser(updatedPlayerRes.data);

    onBid(); // Trigger data refresh in parent (for queue, etc.)
    setBidAmount(100);
  } catch (err: any) {
    console.error('Failed to place bid:', err);
    setError(err.response?.data?.message || 'An error occurred while placing the bid.');
  } finally {
    setIsSubmitting(false);
  }
  };
  
  const isPlayerInQueue = user && queue.some(p => p.playerId === user.id);

  if (!user || user.isAdmin || user.id === king?.id || isPlayerInQueue) {
    return null;
  }

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !user}
          className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 text-white font-bold py-3 px-4 rounded-md text-xl transition-colors"
        >
          Дать газу!
        </button>
    </div>
  );
};

export default AuctionPanel;
