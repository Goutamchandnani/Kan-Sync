import { motion } from 'framer-motion';
import { FaUsers, FaChartLine, FaShieldAlt } from 'react-icons/fa';

export default function WhyChooseUs() {
  const itemVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  };

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4 text-center">
        <motion.h2
          className="text-4xl font-bold text-gray-800 mb-12"
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
        >
          Why Choose KanSync?
        </motion.h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <motion.div
            className="flex flex-col items-center p-6 rounded-lg shadow-lg bg-gradient-to-br from-blue-50 to-indigo-100"
            variants={itemVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
          >
            <FaUsers className="text-5xl text-accent-blue mb-4" />
            <h3 className="text-xl font-semibold text-gray-800 mb-3">Seamless Collaboration</h3>
            <p className="text-gray-600">Empower your team to work together effortlessly, no matter where they are.</p>
          </motion.div>
          <motion.div
            className="flex flex-col items-center p-6 rounded-lg shadow-lg bg-gradient-to-br from-green-50 to-teal-100"
            variants={itemVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <FaChartLine className="text-5xl text-green-500 mb-4" />
            <h3 className="text-xl font-semibold text-gray-800 mb-3">Boost Productivity</h3>
            <p className="text-gray-600">Streamline your workflows and achieve more with intuitive tools and insights.</p>
          </motion.div>
          <motion.div
            className="flex flex-col items-center p-6 rounded-lg shadow-lg bg-gradient-to-br from-purple-50 to-pink-100"
            variants={itemVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <FaShieldAlt className="text-5xl text-purple-500 mb-4" />
            <h3 className="text-xl font-semibold text-gray-800 mb-3">Secure & Reliable</h3>
            <p className="text-gray-600">Your data is safe with us. Focus on your work, we handle the security.</p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}