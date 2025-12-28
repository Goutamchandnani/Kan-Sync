import Link from 'next/link';
import { motion } from 'framer-motion';

export default function Hero() {
  return (
    <motion.section
      className="relative bg-gradient-to-r from-primary-light to-primary-dark py-12 md:py-20 text-white overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
    >
      <div className="container mx-auto px-4 text-center relative z-10">
        <motion.h1
          className="text-4xl md:text-6xl font-extrabold mb-4 leading-tight"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          Welcome!
        </motion.h1>
        <motion.p
          className="text-2xl md:text-3xl text-gray-700 mb-2 max-w-4xl mx-auto font-bold"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          Sync work. Sync Teams.
        </motion.p>
        <motion.p
          className="text-lg md:text-xl text-gray-700 mb-2 max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          Your ultimate project management tool for seamless collaboration and efficient workflows.
        </motion.p>
        <motion.div
          className="mt-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <Link href="http://localhost:4202/auth/login"  className="bg-accent-blue hover:bg-blue-600 text-black px-10 py-4 rounded-full text-lg font-semibold shadow-lg transition-all duration-300 ease-in-out transform hover:-translate-y-1">
            Get Started
          </Link>
        </motion.div>
      </div>
      <div className="absolute inset-0 z-0 opacity-20">
        <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full mix-blend-overlay filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-secondary-light rounded-full mix-blend-overlay filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary-dark rounded-full mix-blend-overlay filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>
    </motion.section>
  );
}