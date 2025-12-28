import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const SharedBoard = () => {
  const { boardId } = useParams();
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBoard = async () => {
      try {
        const response = await axios.get(`/api/boards/${boardId}/public`);
        setBoard(response.data);
        setLoading(false);
      } catch (err) {
        setError('This board is either private or does not exist');
        setLoading(false);
      }
    };

    fetchBoard();
  }, [boardId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{board.title}</h1>
              <p className="text-gray-600">{board.description}</p>
            </div>
            <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
              Read Only View
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {board.columns.map((column) => (
              <div key={column._id} className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-700 mb-4">{column.title}</h3>
                <div className="space-y-3">
                  {column.tasks.map((task) => (
                    <div key={task._id} className="bg-white rounded-lg p-4 shadow-sm">
                      <h4 className="font-medium text-gray-800 mb-2">{task.title}</h4>
                      <p className="text-gray-600 text-sm mb-3">{task.description}</p>
                      {task.deadline && (
                        <div className="flex items-center text-sm text-gray-500">
                          <span className="mr-2">🗓</span>
                          {new Date(task.deadline).toLocaleDateString()}
                        </div>
                      )}
                      {task.priority && (
                        <div className="mt-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            task.priority === 'high' ? 'bg-red-100 text-red-800' :
                            task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SharedBoard;