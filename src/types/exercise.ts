// @/types/exercise.ts
// Types for exercises, questions, classes, books, etc. Based on DB schema and API responses.

export interface Class {
  id: number;
  name: string;
  created_at?: string;
}

export interface Book {
  id: number;
  name: string;
  class_id: number;
  created_at?: string;
}

export interface QuestionType {
  id: number;
  type_name: string;
  icon?: string;
  description?: string;
  is_multiple_choice: boolean;
  created_at?: string;
}

export interface GeneratedQuestion {
  question_text: string;
  emoji: string;
  explanation: string;
  model_answer?: string; // For open_ended or fill_blank
  answers?: {
    answer_text: string;
    is_correct: boolean;
  }[]; // For multiple_choice, without id (pre-insert)
  suggested_type?: string; // Optional from AI
}

export interface InsertedQuestion extends GeneratedQuestion {
  id: number;
  order_num: number;
  question_type_id: number;
  correct_answer_id?: number | null; // Link to correct answer in DB
  answers?: {  // Post-insert, with ids
    id: number;
    answer_text: string;
    is_correct: boolean;
  }[];
  created_at?: string;
}

export interface Exercise {
  id: number;
  name: string;
  class_id: number;
  book_id: number;
  lesson_name: string;
  type: 'multiple_choice' | 'open_ended';
  question_type_id?: number;
  num_questions: number;
  num_answers?: number; // Only for multiple_choice
  difficulty: 'Easy' | 'Medium' | 'Hard';
  user_id: number;
  created_at: string;
}

export interface InsertedExercise extends Exercise {
  questions: InsertedQuestion[];
}

// Optional: Full response type from API (for bulk or with relations)
export interface ExerciseWithRelations extends Exercise {
  class: Class;
  book: Book;
  question_type: QuestionType;
  questions: InsertedQuestion[];
}

// Form data type for ExerciseForm
export interface ExerciseFormData {
  exercise_name: string;
  type: 'multiple_choice' | 'open_ended';
  class_id: number;
  book_id: number;
  lesson_name: string;
  num_questions: number;
  num_answers?: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  user_id: number;
}