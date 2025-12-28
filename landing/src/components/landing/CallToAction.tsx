import Link from 'next/link';
import { motion } from 'framer-motion';

export default function CallToAction() {
  return (
    <motion.section
      className="py-20 bg-gradient-to-r from-accent-blue to-blue-700 text-white text-center"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6 }}
    >
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-bold mb-4">Ready to Transform Your Workflow?</h2>
        <p className="text-xl mb-8">Join thousands of teams who are already boosting their productivity with KanSync.</p>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <Link href="http://localhost:4202/auth/register" className="bg-accent-blue text-white hover:bg-blue-600 px-10 py-4 rounded-full text-lg font-semibold shadow-lg transition-all duration-300 ease-in-out transform hover:-translate-y-1">
            Start Your Free Trial
          </Link>
        </motion.div>
      </div>
    </motion.section>
  );
}