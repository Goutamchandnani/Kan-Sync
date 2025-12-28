import React from 'react';
import { Link } from 'react-router-dom';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
        <div className="text-2xl font-bold text-blue-600">TaskBoard</div>
        <div className="space-x-4">
          <Link to="/login" className="text-gray-600 hover:text-blue-600">Login</Link>
          <Link to="/register" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Get Started</Link>
        </div>
      </nav>

      <main className="container mx-auto px-6 py-12">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">Manage Tasks Smarter, Not Harder</h1>
          <p className="text-xl text-gray-600 mb-8">An intelligent task management platform that learns from your workflow and provides smart suggestions.</p>
          <Link to="/register" className="px-8 py-3 bg-blue-600 text-white rounded-lg text-lg hover:bg-blue-700">Start Free Trial</Link>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <FeatureCard 
            title="Smart Suggestions" 
            description="Get AI-powered suggestions based on your task patterns and team workflow."
            icon="🤖"
          />
          <FeatureCard 
            title="Team Collaboration" 
            description="Work seamlessly with your team in real-time with shared boards and tasks."
            icon="👥"
          />
          <FeatureCard 
            title="Workflow Analytics" 
            description="Gain insights into your team's productivity and task completion patterns."
            icon="📊"
          />
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8 mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-6 text-center">
            <StepCard 
              number="1" 
              title="Create Board" 
              description="Set up your project board and invite team members"
            />
            <StepCard 
              number="2" 
              title="Add Tasks" 
              description="Create and assign tasks to team members"
            />
            <StepCard 
              number="3" 
              title="Track Progress" 
              description="Monitor task status and team productivity"
            />
            <StepCard 
              number="4" 
              title="Get Insights" 
              description="Receive smart suggestions and workflow analytics"
            />
          </div>
        </div>
      </main>

      <footer className="bg-gray-50 py-8">
        <div className="container mx-auto px-6 text-center text-gray-600">
          <p>© 2023 TaskBoard. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ title, description, icon }) => (
  <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
    <div className="text-4xl mb-4">{icon}</div>
    <h3 className="text-xl font-semibold mb-2">{title}</h3>
    <p className="text-gray-600">{description}</p>
  </div>
);

const StepCard = ({ number, title, description }) => (
  <div className="relative">
    <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
      {number}
    </div>
    <h3 className="text-lg font-semibold mb-2">{title}</h3>
    <p className="text-gray-600">{description}</p>
  </div>
);

export default LandingPage;