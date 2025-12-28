import { motion } from 'framer-motion';

export default function Testimonials() {
  const testimonialVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.6 } },
  };

  const testimonialsData = [
    {
      quote: "KanSync has transformed our team's productivity. The real-time collaboration features are a game-changer!",
      name: "Jane Doe",
      title: "CEO, Tech Solutions",
    },
    {
      quote: "The intuitive drag-and-drop interface makes managing projects a breeze. Highly recommend!",
      name: "John Smith",
      title: "Project Manager, Creative Agency",
    },
    {
      quote: "With KanSync's AI-powered suggestions, we've been able to optimize our workflows and hit deadlines consistently.",
      name: "Emily White",
      title: "Operations Director, Global Corp",
    },
  ];

  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4 text-center">
        <motion.h2
          className="text-4xl font-bold text-gray-800 mb-12"
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
        >
          What Our Users Say
        </motion.h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonialsData.map((testimonial, index) => (
            <motion.div
              key={index}
              className="bg-white p-8 rounded-lg shadow-md flex flex-col items-center"
              variants={testimonialVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: index * 0.2, duration: 0.6 }}
            >
              <p className="text-lg text-gray-700 mb-6 italic">"{testimonial.quote}"</p>
              <p className="font-semibold text-accent-blue">{testimonial.name}</p>
              <p className="text-gray-500 text-sm">{testimonial.title}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}