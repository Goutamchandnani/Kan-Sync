import { getBoard } from '@/lib/data';
import { Board } from '@/types/board';
import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const board = await getBoard(params.id);
  return {
    title: board.name,
    description: `View the board: ${board.name}`,
    openGraph: {
      title: `${board.name} - KanSync`,
      description: `View the board ${board.name} on KanSync.`,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${board.name} - KanSync`,
      description: `View the board ${board.name} on KanSync.`,
    },
  };
}

export default async function BoardPage({ params }: { params: { id: string } }) {
  const board: Board = await getBoard(params.id);

  return (
    <div>
      <h1>{board.name}</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {board.columns.map((column) => (
          <div key={column._id} className="bg-gray-100 p-4 rounded-lg">
            <h2 className="text-xl font-bold mb-4">{column.name}</h2>
            <div>
              {column.tasks.map((task) => (
                <div key={task._id} className="bg-white p-2 rounded-md mb-2">
                  {task.title}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}