export interface AiSuggestion {
  suggestedPriority?: 'low' | 'medium' | 'high';
  suggestedDueInDays?: number;
}