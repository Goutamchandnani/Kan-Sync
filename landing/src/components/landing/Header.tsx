import Link from 'next/link';
import Image from 'next/image';

export default function Header() {
  return (
    <header className="bg-white shadow-md">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/">
          <Image src="/logo.png" alt="KanSync Logo" width={120} height={40} />
        </Link>
        <nav className="flex items-center space-x-4">
          <Link href="http://localhost:4202/auth/login" className="text-gray-600 hover:text-gray-800 px-3 py-2">
            Login
          </Link>
          <Link href="http://localhost:4202/auth/register" className="text-gray-600 hover:text-gray-800 px-3 py-2">
            Sign Up
          </Link>
        </nav>
      </div>
    </header>
  );
}