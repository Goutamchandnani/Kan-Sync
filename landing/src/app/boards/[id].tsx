import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

interface Board {
  _id: string;
  title: string;
  columns: Column[];
}

interface Column {
  _id: string;
  title: string;
  tasks: Task[];
}

interface Task {
  _id: string;
  title: string;
  description?: string;
}

export default function PublicBoard() {
  const router = useRouter();
  const { id } = router.query;
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      const fetchBoard = async () => {
        try {
          const response = await fetch(`/api/public/boards/${id}`);
          if (!response.ok) {
            throw new Error(`Error fetching board: ${response.statusText}`);
          }
          const data = await response.json();
          setBoard(data);
        } catch (err: any) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchBoard();
    }
  }, [id]);

  if (loading) {
    return <div className="text-center py-10">Loading board...</div>;
  }

  if (error) {
    return <div className="text-center py-10 text-red-500">Error: {error}</div>;
  }

  if (!board) {
    return <div className="text-center py-10">Board not found.</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-gray-800 mb-8 text-center">{board.title}</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {board.columns.map(column => (
          <div key={column._id} className="bg-gray-100 p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">{column.title}</h2>
            <div className="space-y-4">
              {column.tasks.map(task => (
                <div key={task._id} className="bg-white p-4 rounded-md shadow-sm">
                  <h3 className="text-lg font-medium text-gray-800">{task.title}</h3>
                  {task.description && <p className="text-gray-600 text-sm mt-1">{task.description}</p>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}