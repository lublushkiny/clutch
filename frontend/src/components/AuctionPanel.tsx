import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

interface AuctionPanelProps {
  onBid: () => void; // Callback to refresh data
}

const API_URL = 'http://localhost:3001/api';

const AuctionPanel: React.FC<AuctionPanelProps> = ({ onBid }) => {
  const [bidAmount, setBidAmount] = useState<number>(100);
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const { user } = useAuth();

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
      // The backend now gets the playerId from the JWT token
      await axios.post(`${API_URL}/auction/bid`, {
        bid: bidAmount,
      });
      onBid(); // Trigger data refresh in parent
      setBidAmount(100);
    } catch (err: any) {
      console.error('Failed to place bid:', err);
      setError(err.response?.data?.message || 'An error occurred while placing the bid.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-center">Сделать ставку</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="bid-amount" className="block text-sm font-medium mb-1">
            Ваш баланс: {user?.clutchPoints.toLocaleString() ?? 0} GAS
          </label>
          <input
            id="bid-amount"
            type="number"
            value={bidAmount}
            onChange={(e) => setBidAmount(parseInt(e.target.value, 10))}
            min="1"
            className="w-full bg-gray-700 border-gray-600 rounded-md p-2 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={isSubmitting || !user}
          className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded-md transition-colors"
        >
          {isSubmitting ? 'Отправка...' : 'Встать в очередь'}
        </button>
      </form>
    </div>
  );
};

export default AuctionPanel;
