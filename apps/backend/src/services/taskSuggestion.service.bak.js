const Board = require('../models/Board');
const Activity = require('../models/Activity');
module.exports = TaskSuggestionService;
class TaskSuggestionService {
  /**
   * Analyze task patterns and generate suggestions
   * @param {string} userId - The user ID to generate suggestions for
   * @returns {Promise<Array>} - Array of task suggestions
   */
  async generateSuggestions(userId) {
    try {
      // Get user's boards and activities
      const boards = await Board.find({
        $or: [{ ownerId: userId }, { members: userId }]
      });

      const activities = await Activity.find({
        boardId: { $in: boards.map(board => board._id) },
        action: { $in: ['task_created', 'task_updated', 'task_moved'] }
      }).sort({ timestamp: -1 }).limit(100);

      // Analyze patterns
      const patterns = this.analyzePatterns(activities);

      // Generate suggestions based on patterns
      return this.createSuggestions(patterns);
    } catch (error) {
      console.error('Error generating task suggestions:', error);
      return [];
    }
  }

  /**
   * Analyze user activity patterns
   * @param {Array} activities - User activities
   * @returns {Object} - Analyzed patterns
   */
  analyzePatterns(activities) {
    const patterns = {
      priorityDistribution: {},
      averageCompletionTime: {},
      commonDeadlines: [],
      taskFlow: new Map(),
      taskCategories: new Map(),
      completionTimeByPriority: {},
      taskComplexity: new Map(),
      taskDependencies: new Map(),
      taskRecurrence: new Map(),
      workloadDistribution: {},
      timeEstimationAccuracy: new Map()
    };

    activities.forEach(activity => {
      const { action, details } = activity;

      // Track workload distribution
      if (details.task?.assignee) {
        patterns.workloadDistribution[details.task.assignee] = 
          (patterns.workloadDistribution[details.task.assignee] || 0) + 1;
      }

      // Analyze time estimation accuracy
      if (action === 'task_moved' && details.task?.status === 'done' && details.task?.estimatedTime) {
        const creationActivity = activities.find(
          a => a.action === 'task_created' && 
               a.details.task?._id === details.task._id
        );
        
        if (creationActivity) {
          const actualTime = activity.timestamp - creationActivity.timestamp;
          const estimatedTime = details.task.estimatedTime;
          const accuracy = Math.abs(1 - (actualTime / estimatedTime));
          patterns.timeEstimationAccuracy.set(details.task._id, accuracy);
        }
      }

      // Analyze priority distribution
      if (details.task?.priority) {
        patterns.priorityDistribution[details.task.priority] =
          (patterns.priorityDistribution[details.task.priority] || 0) + 1;
      }

      // Analyze task completion time and categories
      if (action === 'task_moved' && details.task?.status === 'done') {
        const creationActivity = activities.find(
          a => a.action === 'task_created' && 
               a.details.task?._id === details.task._id
        );

        if (creationActivity) {
          const completionTime = activity.timestamp - creationActivity.timestamp;
          const taskType = details.task.title.toLowerCase();
          const priority = details.task.priority || 'normal';
          
          // Track completion time by task type
          if (!patterns.averageCompletionTime[taskType]) {
            patterns.averageCompletionTime[taskType] = [];
          }
          patterns.averageCompletionTime[taskType].push(completionTime);

          // Track completion time by priority
          if (!patterns.completionTimeByPriority[priority]) {
            patterns.completionTimeByPriority[priority] = [];
          }
          patterns.completionTimeByPriority[priority].push(completionTime);

          // Analyze task categories with improved word relevance
          const words = taskType.split(/\s+/);
          words.forEach(word => {
            if (word.length > 3) { // Ignore short words
              const normalizedWord = word.toLowerCase();
              patterns.taskCategories.set(
                normalizedWord,
                (patterns.taskCategories.get(normalizedWord) || 0) + 1
              );
              
              // Analyze task complexity based on keywords
              const complexityKeywords = ['complex', 'difficult', 'major', 'critical'];
              if (complexityKeywords.some(keyword => normalizedWord.includes(keyword))) {
                patterns.taskComplexity.set(
                  details.task._id,
                  (patterns.taskComplexity.get(details.task._id) || 0) + 1
                );
              }
            }
          });
          
          // Analyze task dependencies and recurrence
          if (details.task.description) {
            const description = details.task.description.toLowerCase();
            const dependencyKeywords = ['depends', 'after', 'before', 'requires'];
            if (dependencyKeywords.some(keyword => description.includes(keyword))) {
              patterns.taskDependencies.set(
                details.task._id,
                (patterns.taskDependencies.get(details.task._id) || 0) + 1
              );
            }
            
            const recurrenceKeywords = ['daily', 'weekly', 'monthly', 'recurring'];
            if (recurrenceKeywords.some(keyword => description.includes(keyword))) {
              patterns.taskRecurrence.set(
                details.task._id,
                (patterns.taskRecurrence.get(details.task._id) || 0) + 1
              );
            }
          }
        }
      }

      // Analyze common deadline patterns
      if (details.task?.deadline) {
        patterns.commonDeadlines.push(new Date(details.task.deadline));
      }

      // Analyze task flow
      if (action === 'task_moved') {
        const key = `${details.sourceColumnId}-${details.destinationColumnId}`;
        patterns.taskFlow.set(key, (patterns.taskFlow.get(key) || 0) + 1);
      }
    });

    return patterns;
  }

  /**
   * Create task suggestions based on analyzed patterns
   * @param {Object} patterns - Analyzed patterns
   * @returns {Array} - Task suggestions
   */
  createSuggestions(patterns) {
    const suggestions = [];

    // Priority and completion time suggestions
    const priorityDistribution = patterns.priorityDistribution;
    const totalTasks = Object.values(priorityDistribution).reduce((a, b) => a + b, 0);
    
    if (totalTasks > 0) {
      const highPriorityRatio = (priorityDistribution.high || 0) / totalTasks;
      if (highPriorityRatio < 0.2) {
        suggestions.push({
          type: 'priority',
          message: 'Consider marking important tasks as high priority to better manage workload',
          confidence: 0.8
        });
      }

      // Analyze completion times by priority
      const avgCompletionByPriority = {};
      Object.entries(patterns.completionTimeByPriority).forEach(([priority, times]) => {
        avgCompletionByPriority[priority] = times.reduce((a, b) => a + b, 0) / times.length;
      });

      if (avgCompletionByPriority.high && avgCompletionByPriority.normal) {
        const highPriorityEfficiency = avgCompletionByPriority.high < avgCompletionByPriority.normal;
        if (!highPriorityEfficiency) {
          suggestions.push({
            type: 'efficiency',
            message: 'High priority tasks are taking longer than normal priority tasks. Consider breaking them into smaller subtasks.',
            confidence: 0.75
          });
        }
      }

    // Deadline suggestions
    if (patterns.commonDeadlines.length > 0) {
      const now = new Date();
      const weekDay = now.getDay();
      const commonDeadlineDay = this.getMostCommonWeekday(patterns.commonDeadlines);

      if (commonDeadlineDay !== weekDay) {
        suggestions.push({
          type: 'deadline',
          message: `Consider setting deadlines for ${this.getWeekdayName(commonDeadlineDay)} based on your past patterns`,
          confidence: 0.7
        });
      }
    }

    // Task flow optimization
    const flowPatterns = Array.from(patterns.taskFlow.entries())
      .sort((a, b) => b[1] - a[1]);

    if (flowPatterns.length > 0) {
      const [mostCommonFlow, count] = flowPatterns[0];
      const [sourceCol, destCol] = mostCommonFlow.split('-');

      suggestions.push({
        type: 'workflow',
        message: `Tasks often move from ${sourceCol} to ${destCol}. Consider organizing related tasks together`,
        confidence: count / patterns.taskFlow.size
      });
    }

    // Enhanced task category and complexity suggestions
    const commonCategories = Array.from(patterns.taskCategories.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    if (commonCategories.length > 0) {
      const categoryNames = commonCategories.map(([category]) => category).join(', ');
      const complexTasks = Array.from(patterns.taskComplexity.values()).reduce((a, b) => a + b, 0);
      const confidence = Math.min(0.9, 0.7 + (complexTasks / totalTasks) * 0.2);
      
      suggestions.push({
        type: 'category',
        message: `Most common task categories: ${categoryNames}. Consider creating dedicated columns or labels for better organization.`,
        confidence
      });
    }

    // Task dependency suggestions
    const tasksWithDependencies = Array.from(patterns.taskDependencies.values()).reduce((a, b) => a + b, 0);
    if (tasksWithDependencies > 0) {
      suggestions.push({
        type: 'dependency',
        message: 'Multiple tasks have dependencies. Consider using task linking or subtasks for better workflow management.',
        confidence: Math.min(0.85, 0.6 + (tasksWithDependencies / totalTasks) * 0.25)
      });
    }

    // Task recurrence suggestions
    const recurringTasks = Array.from(patterns.taskRecurrence.values()).reduce((a, b) => a + b, 0);
    if (recurringTasks > 0) {
      suggestions.push({
        type: 'recurrence',
        message: 'Several tasks appear to be recurring. Consider setting up task templates or automation for recurring tasks.',
        confidence: Math.min(0.88, 0.65 + (recurringTasks / totalTasks) * 0.23)
      });
    }

    // Workload distribution suggestions
    const assignees = Object.keys(patterns.workloadDistribution);
    if (assignees.length > 1) {
      const workloads = Object.values(patterns.workloadDistribution);
      const avgWorkload = workloads.reduce((a, b) => a + b, 0) / workloads.length;
      const maxWorkload = Math.max(...workloads);
      
      if (maxWorkload > avgWorkload * 1.5) {
        suggestions.push({
          type: 'workload',
          message: 'Some team members have significantly higher workloads. Consider redistributing tasks for better balance.',
          confidence: Math.min(0.9, 0.7 + (maxWorkload / avgWorkload - 1) * 0.2)
        });
      }
    }

    // Time estimation accuracy suggestions
    const estimationAccuracies = Array.from(patterns.timeEstimationAccuracy.values());
    if (estimationAccuracies.length > 0) {
      const avgAccuracy = estimationAccuracies.reduce((a, b) => a + b, 0) / estimationAccuracies.length;
      if (avgAccuracy < 0.7) {
        suggestions.push({
          type: 'estimation',
          message: 'Task time estimates are often inaccurate. Consider reviewing and adjusting estimation approach.',
          confidence: Math.min(0.85, 0.6 + (1 - avgAccuracy) * 0.25)
        });
      }
    }

    return suggestions;
  }

  /**
   * Get the most common weekday from an array of dates
   * @param {Array} dates - Array of dates
   * @returns {number} - Most common weekday (0-6)
   */
  getMostCommonWeekday(dates); {
    const weekdayCounts = dates.reduce((acc, date) => {
      const weekday = date.getDay();
      acc[weekday] = (acc[weekday] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(weekdayCounts)
      .sort((a, b) => b[1] - a[1])[0][0];
  }

  /**
   * Get weekday name
   * @param {number} day - Day number (0-6)
   * @returns {string} - Weekday name
   */
  getWeekdayName(day); {
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return weekdays[day];
  }
}
}