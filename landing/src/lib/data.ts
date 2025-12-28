import { Board } from '@/types/board';

export async function getBoard(id: string): Promise<Board> {
  const res = await fetch(`http://localhost:5000/api/public/boards/${id}`);
  if (!res.ok) {
    throw new Error('Failed to fetch board');
  }
  return res.json();
}