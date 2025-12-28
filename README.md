# Task Board - Real-time Collaborative Project Management

A modern, real-time collaborative task management application built with the MEAN stack (MongoDB, Express.js, Angular, Node.js) and Socket.IO for real-time updates.

## Features

### Authentication & Authorization
- User registration with email and password
- Secure login with JWT authentication
- Protected routes and API endpoints
- Persistent session management
- User profile management

### Board Management
- Create new boards with titles and descriptions
- View list of all accessible boards
- Real-time board updates across all users
- Board sharing and collaboration
- Board member management (add/remove members)

### Column Management
- Create custom columns for different task stages
- Drag-and-drop column reordering
- Column title customization
- Visual task count per column
- Dynamic column addition and removal

### Task Management
- Create tasks with titles and descriptions
- Assign priority levels (Low, Medium, High)
- Set due dates for tasks
- Assign tasks to team members
- Add detailed task descriptions
- Task status tracking
- Drag-and-drop task movement between columns

### Real-time Collaboration
- Live updates for all board changes
- Real-time task movement tracking
- Active user presence indicators
- Collaborative task editing
- Instant notifications for board activities

### Activity Tracking
- Comprehensive activity feed
- Track all board changes
- User action history
- Task movement logging
- Member addition/removal tracking

### User Interface
- Clean, modern design with Tailwind CSS
- Responsive layout for all devices
- Intuitive drag-and-drop interactions
- Real-time status indicators
- User-friendly forms and modals

## Technical Stack

### Frontend
- Angular 16+
- NgRx for state management
- Socket.IO client for real-time features
- Tailwind CSS for styling
- Angular Material CDK for drag-and-drop

### Backend
- Node.js with Express
- MongoDB with Mongoose
- Socket.IO for real-time communication
- JWT for authentication
- RESTful API architecture

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB
- Angular CLI

### Installation

1. Clone the repository
```bash
git clone <repository-url>
```

2. Install backend dependencies
```bash
cd project-directory
npm install
```

3. Install frontend dependencies
```bash
cd frontend
npm install
```

4. Set up environment variables
Create a `.env` file in the root directory with:
```
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
```

5. Start the backend server
```bash
npm run start
```

6. Start the frontend application
```bash
cd frontend
npm run start
```

The application will be available at `http://localhost:4200`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.