export interface Answer {
  id: number
  answer_text: string
  is_correct: boolean
}

export interface Question {
  id: number
  question_text: string
  emoji: string
  question_type: string
  answers: Answer[]
  explanation: string
}

export interface QuestionFormData {
  topic: string;
  quantity: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  number_of_answers: number;
  description: string;
  user_id?: number;
  // Optional for manual/edit
  question_text?: string;
  emoji?: string;
  question_type?: string;
  answers?: Answer[];
  explanation?: string;
}


export interface InsertedQuestion {
  id: number
  question_text: string
  emoji: string
  question_type_id: number
  answers: Answer[]
  explanation: string
  correct_answer_id?: number
  type_name?: string
}

export interface QuestionFormProps {
  onSubmit: (data: QuestionFormData | Question | Question[]) => void
  onCancel: () => void
  initialData?: Partial<QuestionFormData>
}
