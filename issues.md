## Active Users Duplication Issue

**Problem:**
Duplicate user entries were appearing in the "Active Users" section of the board. This was due to the backend's `presence.service.js` using Mongoose `ObjectId` objects directly as keys in a JavaScript `Map` (`boardUserMap`). JavaScript `Map`s perform strict equality (`===`) checks for object keys. Since each `Mongoose.ObjectId` instance, even if representing the same underlying ID, is a distinct object in memory, the `Map` was treating them as different keys, leading to multiple entries for the same user.

**Solution:**
To ensure that the `Map` correctly identified users based on their unique ID value rather than their object reference, the `Mongoose.ObjectId` was converted to its string representation before being used as a key.

**Implementation Details:**
- In `apps/backend/src/services/presence.service.js`:
  - In the `addUserToBoard` function, `const userIdString = user._id.toString();` was added.
  - In the `removeUserFromBoard` function, `const userIdString = userId.toString();` was added.
  - These `userIdString` values were then used as the keys for the `Map` operations (`set` and `delete`).

This change forced the `Map` to compare user IDs by their string value, ensuring that each unique user ID corresponded to only one entry in the `boardUserMap`, thereby resolving the duplicate "Active Users" display.