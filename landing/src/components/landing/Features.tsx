import { motion } from 'framer-motion';

export default function Features() {
  const featureVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  };

  return (
    <section className="bg-gray-100 py-20">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-gray-800 text-center mb-12">Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <motion.div
            className="bg-white p-8 rounded-lg shadow-md"
            variants={featureVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
          >
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Real-time Collaboration</h3>
            <p className="text-gray-600">Work together seamlessly with your team, seeing updates as they happen.</p>
          </motion.div>
          <motion.div
            className="bg-white p-8 rounded-lg shadow-md"
            variants={featureVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: 0.2 }}
          >
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Intuitive Drag-and-Drop Interface</h3>
            <p className="text-gray-600">Easily organize tasks and workflows with a simple, visual interface.</p>
          </motion.div>
          <motion.div
            className="bg-white p-8 rounded-lg shadow-md"
            variants={featureVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: 0.4 }}
          >
            <h3 className="text-2xl font-bold text-gray-800 mb-4">AI-Powered Suggestions</h3>
            <p className="text-gray-600">Get smart recommendations to optimize your tasks and deadlines.</p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}