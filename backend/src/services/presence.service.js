class PresenceService {
  constructor(io) {
    // Map of socketId to user data
    this.socketUsers = new Map();
    
    // Map of userId to array of socket connections
    this.userSockets = new Map();
    
    // Map of boardId to set of active users
    this.boardUserMap = {}; // <--- THIS MUST NOT BE EMPTY OR RE-ASSIGNED
    
    // Heartbeat interval in milliseconds (30 seconds)
    this.HEARTBEAT_INTERVAL = 30000;
    
    // Timeout for considering a user offline (45 seconds)
    this.PRESENCE_TIMEOUT = 45000;
    
    // Socket.IO instance for emitting events
    this.io = io;
  }

  // Add a new socket connection for a user
  addSocket(socketId, userData) {
    console.log(`[PresenceService] addSocket called for socketId: ${socketId}, userId: ${userData._id}`);
    // Store socket -> user mapping
    this.socketUsers.set(socketId, {
      ...userData,
      lastHeartbeat: Date.now(),
      status: 'online'
    });
    console.log(`[PresenceService] socketUsers after add:`, this.socketUsers);

    // Update user -> sockets mapping
    if (!this.userSockets.has(userData._id)) {
      this.userSockets.set(userData._id, new Set());
    }
    this.userSockets.get(userData._id).add(socketId);
    console.log(`[PresenceService] userSockets after add:`, this.userSockets);

    return this.getUserPresence(userData._id);
  }

  // Remove a socket connection
  removeSocket(socketId) {
    const userData = this.socketUsers.get(socketId);
    if (!userData) return null;

    // Remove from socket -> user mapping
    this.socketUsers.delete(socketId);

    // Remove from user -> sockets mapping
    const userSocketSet = this.userSockets.get(userData._id);
    if (userSocketSet) {
      userSocketSet.delete(socketId);
      if (userSocketSet.size === 0) {
        this.userSockets.delete(userData._id);
      }
    }

    // Remove from all boards if this was user's last socket
    if (!this.userSockets.has(userData._id)) {
      for (const boardId in this.boardUserMap) {
        // Check if the user was actually on this board before removing and emitting
        if (this.boardUserMap[boardId].has(userData._id.toString())) {
          this.removeUserFromBoard(boardId, userData._id);
          this.emitPresenceUpdate(boardId); // Emit update immediately
        }
      }
    }

    return userData;
  }

  // Update user's heartbeat
  updateHeartbeat(socketId) {
    const userData = this.socketUsers.get(socketId);
    if (userData) {
      userData.lastHeartbeat = Date.now();
      userData.status = 'online';
      this.socketUsers.set(socketId, userData);
      return this.getUserPresence(userData._id);
    }
    return null;
  }

  // Add user to a board
  addUserToBoard(boardId, user) {
    const userIdString = user._id.toString();
    if (!this.boardUserMap[boardId]) {
      this.boardUserMap[boardId] = new Map(); // <--- initialize for board
    }

    console.log(`[PresenceService] addUserToBoard: Before adding user ${userIdString} to board ${boardId}. Current users:`, [...this.boardUserMap[boardId].values()]);

    this.boardUserMap[boardId].set(userIdString, {
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      status: "online",
      lastSeen: new Date()
    });

    console.log(`[PresenceService] addUserToBoard: After adding user ${userIdString} to board ${boardId}. Current users:`, [...this.boardUserMap[boardId].values()]);
  }

  // Remove user from a board
  removeUserFromBoard(boardId, userId) {
    const userIdString = userId.toString();
    console.log(`[PresenceService] removeUserFromBoard called for userId: ${userIdString} from board: ${boardId}`);
    if (this.boardUserMap[boardId]) {
      console.log(`[PresenceService] Before removal. Users in board ${boardId}:`, [...this.boardUserMap[boardId].keys()]);
      this.boardUserMap[boardId].delete(userIdString);
      console.log(`[PresenceService] After removal. Users in board ${boardId}:`, [...this.boardUserMap[boardId].keys()]);

      if (this.boardUserMap[boardId].size === 0) {
        console.log(`[PresenceService] Board ${boardId} is now empty. Deleting from boardUserMap.`);
        delete this.boardUserMap[boardId];
      }
    }
  }

  // Clean up inactive sockets
  cleanupInactiveSockets() {
    const now = Date.now();
    const inactiveSockets = [];

    this.socketUsers.forEach((userData, socketId) => {
      if (now - userData.lastHeartbeat >= this.PRESENCE_TIMEOUT) {
        inactiveSockets.push(socketId);
      }
    });

    inactiveSockets.forEach(socketId => {
      const userData = this.removeSocket(socketId);
      // Emit presence update for all boards the user was part of
      if (userData) {
        for (const boardId in this.boardUserMap) {
          const updatedUsers = this.getBoardUsers(boardId);
          this.io.to(`board:${boardId}`).emit('presence-update', { boardId, users: updatedUsers });
        }
      }
    });
    
    return inactiveSockets;
  }

  // Get all active users in a board
  getBoardUsers(boardId) {
    console.log(`[PresenceService] getBoardUsers called for boardId: ${boardId}`);
    console.log(`[PresenceService] Current boardUserMap state for board ${boardId}:`, this.boardUserMap[boardId] ? [...this.boardUserMap[boardId].keys()] : 'undefined');

    if (!this.boardUserMap[boardId]) {
      console.log(`[PresenceService] getBoardUsers: No Map found for board ${boardId}. Returning empty.`);
      return [];
    }

    const users = [...this.boardUserMap[boardId].values()];
    console.log(`[PresenceService] getBoardUsers: Users for board ${boardId}:`, users);
    return users;
  }

  // Get presence information for a specific user
  getUserPresence(userId) {
    console.log(`[PresenceService] getUserPresence called for userId: ${userId}`);
    const userSocketSet = this.userSockets.get(userId);
    console.log(`[PresenceService] userSocketSet for ${userId}:`, userSocketSet);
    if (!userSocketSet || userSocketSet.size === 0) return null;

    // Get user data from any of their active sockets
    const socketId = Array.from(userSocketSet)[0];
    const userData = this.socketUsers.get(socketId);
    console.log(`[PresenceService] userData for socketId ${socketId}:`, userData);
    
    if (!userData) return null;

    const now = Date.now();
    const status = now - userData.lastHeartbeat < this.PRESENCE_TIMEOUT ? 'online' : 'offline';

    return {
      _id: userData._id,
      name: userData.name,
      email: userData.email,
      avatar: userData.avatar,
      status,
      lastSeen: userData.lastHeartbeat
    };
  }

  // Emit a presence update for a specific board
  emitPresenceUpdate(boardId) {
    const updatedUsers = this.getBoardUsers(boardId);
    console.log(`[PresenceService] Emitting presence-update for board ${boardId} with users:`, updatedUsers);
    this.io.to(`board:${boardId}`).emit('presence-update', { boardId, users: updatedUsers });
  }
}

export default PresenceService;