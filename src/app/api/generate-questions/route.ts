import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import type { PoolConnection, RowDataPacket, FieldPacket, OkPacket } from "mysql2/promise";

interface Class {
  id: number;
  name: string;
}

interface Book {
  id: number;
  name: string;
  class_id: number;
}

interface QuestionType {
  id: number;
  type_name: string;
  icon?: string;
  description?: string;
  is_multiple_choice: boolean;
}

interface Exercise {
  id: number;
  name: string;
  class_id: number;
  book_id: number;
  lesson_name: string;
  type: 'multiple_choice' | 'open_ended';
  question_type_id?: number;  // Thêm: Loại chính cho toàn bộ exercise
  num_questions: number;
  num_answers?: number;
  difficulty: string;
  user_id: number;
  created_at: string;
}

interface GeneratedQuestion {
  question_text: string;
  emoji: string;
  explanation: string;
  model_answer?: string; // For open_ended
  answers?: string[]; // For multiple_choice, with "(correct)" on one
  suggested_type?: string;  // Optional: Gợi ý loại từ AI (e.g., "multiple_choice")
}

interface InsertedQuestion extends GeneratedQuestion {
  id: number;
  order_num: number;
  question_type_id: number;  // Thêm: Loại cho từng question
}

interface InsertedExercise extends Exercise {
  questions: InsertedQuestion[];
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyBk7twdv6n450gZtjhbNN_ugriuqkut-UE";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent";

export async function POST(request: NextRequest) {
  let connection: PoolConnection | null = null;

  try {
    const formData = await request.json();
    const {
      exercise_name,
      type: exercise_type,
      class_id,
      book_id,
      lesson_name,
      num_questions,
      num_answers,
      difficulty = 'Medium',
      user_id,
    } = formData as {
      exercise_name: string;
      type: 'multiple_choice' | 'open_ended';
      class_id: number;
      book_id: number;
      lesson_name: string;
      num_questions: number;
      num_answers?: number;
      difficulty?: string;
      user_id: number;
    };

    // Validation
    if (!user_id) return NextResponse.json({ error: "Thiếu user_id" }, { status: 400 });
    if (!exercise_name?.trim()) return NextResponse.json({ error: "Vui lòng nhập tên bài tập" }, { status: 400 });
    if (!['multiple_choice', 'open_ended'].includes(exercise_type)) return NextResponse.json({ error: "Loại bài tập không hợp lệ" }, { status: 400 });
    if (!class_id || !book_id) return NextResponse.json({ error: "Vui lòng chọn lớp và bộ sách" }, { status: 400 });
    if (!lesson_name?.trim()) return NextResponse.json({ error: "Vui lòng nhập tên bài học" }, { status: 400 });
    if (!num_questions || num_questions < 1 || num_questions > 50) return NextResponse.json({ error: "Số câu hỏi phải từ 1-50" }, { status: 400 });
    if (exercise_type === 'multiple_choice' && (!num_answers || num_answers < 2 || num_answers > 5)) return NextResponse.json({ error: "Số đáp án phải từ 2-5" }, { status: 400 });

    connection = await db.getConnection();

    // Fetch class and book for prompt context
    const [classRows]: [RowDataPacket[], FieldPacket[]] = await connection.execute(
      "SELECT id, name FROM classes WHERE id = ?",
      [class_id]
    );
    const [bookRows]: [RowDataPacket[], FieldPacket[]] = await connection.execute(
      "SELECT id, name FROM books WHERE id = ? AND class_id = ?",
      [book_id, class_id]
    );

    const cls: Class = (classRows as Class[])[0];
    const book: Book = (bookRows as Book[])[0];

    if (!cls || !book) return NextResponse.json({ error: "Lớp hoặc bộ sách không tồn tại" }, { status: 404 });

    // Fetch existing question types
    const [typeRows]: [RowDataPacket[], FieldPacket[]] = await connection.execute(
      "SELECT id, type_name, icon, description, is_multiple_choice FROM question_types"
    );
    const existingTypes: QuestionType[] = typeRows as QuestionType[];

    if (existingTypes.length === 0) {
      // Fallback: Insert default types nếu chưa có
      await connection.execute(
        "INSERT IGNORE INTO question_types (type_name, icon, description, is_multiple_choice) VALUES " +
        "('multiple_choice', '🔢', 'Trắc nghiệm nhiều lựa chọn', TRUE), " +
        "('open_ended', '📝', 'Câu hỏi tự luận mở', FALSE)"
      );
      // Re-fetch
      const [defaultTypeRows]: [RowDataPacket[], FieldPacket[]] = await connection.execute(
        "SELECT id, type_name, icon, description, is_multiple_choice FROM question_types"
      );
      existingTypes.splice(0, existingTypes.length, ...(defaultTypeRows as QuestionType[]));
    }

    // Classify question type based on exercise_type (map to existing or create new)
    let questionTypeId: number;
    const matchedType = existingTypes.find(t => t.type_name.toLowerCase() === exercise_type.replace('_', ' '));
    if (matchedType) {
      questionTypeId = matchedType.id;
    } else {
      // Insert new type nếu không match (fallback)
      const [insertResult]: [OkPacket, FieldPacket[]] = await connection.execute(
        "INSERT INTO question_types (type_name, description, icon, is_multiple_choice) VALUES (?, ?, ?, ?)",
        [
          exercise_type.replace('_', ' ').toUpperCase(),
          `Loại câu hỏi ${exercise_type}`,
          exercise_type === 'multiple_choice' ? '🔢' : '📝',
          exercise_type === 'multiple_choice'
        ]
      );
      questionTypeId = insertResult.insertId;
      existingTypes.push({ id: questionTypeId, type_name: exercise_type.replace('_', ' '), is_multiple_choice: exercise_type === 'multiple_choice' });
    }

    // Insert exercise first (fix dynamic SQL: tách cases)
    let insertQuery: string;
    let insertValues: any[];
    if (exercise_type === 'multiple_choice') {
      insertQuery = "INSERT INTO exercises (name, class_id, book_id, lesson_name, type, question_type_id, num_questions, num_answers, difficulty, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
      insertValues = [exercise_name, class_id, book_id, lesson_name, exercise_type, questionTypeId, num_questions, num_answers!, difficulty, user_id];
    } else {
      insertQuery = "INSERT INTO exercises (name, class_id, book_id, lesson_name, type, question_type_id, num_questions, difficulty, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
      insertValues = [exercise_name, class_id, book_id, lesson_name, exercise_type, questionTypeId, num_questions, difficulty, user_id];
    }

    const [exerciseResult]: [OkPacket, FieldPacket[]] = await connection.execute(insertQuery, insertValues);

    const exercise_id = exerciseResult.insertId;
    const insertedExercise: Exercise = {
      id: exercise_id,
      name: exercise_name,
      class_id,
      book_id,
      lesson_name,
      type: exercise_type,
      question_type_id: questionTypeId,
      num_questions,
      ...(exercise_type === 'multiple_choice' && { num_answers }),
      difficulty,
      user_id,
      created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    };

    // Generate questions
    const isMultiple = exercise_type === 'multiple_choice';
    const levelDescription = cls.name.includes('Mầm non') ? 'trẻ mầm non (3-6 tuổi), ngôn ngữ đơn giản, dễ thương' :
                             cls.name.includes('Lớp 1') ? 'học sinh lớp 1, ngôn ngữ cơ bản' :
                             'học sinh tiểu học, ngôn ngữ phù hợp độ tuổi';
    const subjectHint = book.name.toLowerCase().includes('toán') ? 'Toán học' : book.name.toLowerCase().includes('tiếng việt') ? 'Tiếng Việt' : 'chủ đề';
    const typeList = existingTypes.map(t => `${t.id}: ${t.type_name}`).join('; ');

    const generatePrompt = `
Hãy tạo đúng ${num_questions} câu hỏi ${isMultiple ? 'trắc nghiệm' : 'tự luận'} thật NGẮN GỌN, DỄ HIỂU cho ${levelDescription}
về ${subjectHint} "${lesson_name}" (từ bộ sách ${book.name}).

YÊU CẦU:
- Ngôn ngữ phù hợp độ tuổi: đơn giản, vui vẻ.
- Mỗi câu hỏi chỉ 1 câu ngắn (dưới 20 chữ).
- Có emoji phù hợp (ví dụ: 🍎, 🐶, ➕...).
- Độ khó: ${difficulty} (${difficulty === 'Easy' ? 'dễ' : difficulty === 'Medium' ? 'trung bình' : 'khó'}).
- ${isMultiple ? 
  `- Có đúng ${num_answers} đáp án ngắn gọn (1-4 chữ). Một đáp án đúng đánh dấu "(correct)".` : 
  `- Câu hỏi mở, khuyến khích suy nghĩ. Có "model_answer" ngắn gọn làm đáp án mẫu.`}
- Thêm "explanation" giải thích ngắn gọn, thân thiện (dưới 30 chữ).
- Optional: Thêm "suggested_type" như "multiple_choice" hoặc "open_ended" nếu phù hợp (dựa vào danh sách: ${typeList}).
- CHỈ TRẢ VỀ JSON hợp lệ dạng mảng, không thêm chữ nào khác.

Ví dụ ${isMultiple ? 'trắc nghiệm' : 'tự luận'}:
${isMultiple ? 
`[
  {
    "question_text": "Quả nào màu đỏ? 🍎",
    "emoji": "🍎",
    "answers": ["Chuối", "Táo (correct)", "Cam"],
    "explanation": "Quả táo có màu đỏ tươi đấy!",
    "suggested_type": "multiple_choice"
  }
]` : 
`[
  {
    "question_text": "Bạn thấy gì trong bức tranh này? 🐶",
    "emoji": "🐶",
    "model_answer": "Một chú chó dễ thương.",
    "explanation": "Hãy quan sát và mô tả chi tiết những gì bạn thấy nhé!",
    "suggested_type": "open_ended"
  }
]`}
`;

    const generateRes = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: generatePrompt }] }],
        generationConfig: {
          temperature: difficulty === 'Hard' ? 0.8 : difficulty === 'Easy' ? 0.4 : 0.6,
          maxOutputTokens: 3000,
        },
      }),
    });

    if (!generateRes.ok) {
      const errorData = await generateRes.json();
      throw new Error(`Gemini API failed: ${errorData.error?.message || generateRes.statusText}`);
    }

    const genData = await generateRes.json();
    const genText = genData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    const genMatch = genText.match(/\[[\s\S]*\]/);
    if (!genMatch) throw new Error("Không tìm thấy mảng JSON trong response");

    const rawJson = genMatch[0]
      .replace(/(\r\n|\n|\r)/g, "")
      .replace(/,(\s*[\]}])/g, "$1")
      .replace(/\(correct\)/gi, "(correct)");

    let questions: GeneratedQuestion[];

    try {
      questions = JSON.parse(rawJson);
    } catch (e) {
      console.error("⚠️ JSON parse error, thử sửa tự động:", e);
      const lastBracket = rawJson.lastIndexOf("]");
      if (lastBracket !== -1) {
        const fixedJson = rawJson.substring(0, lastBracket + 1);
        questions = JSON.parse(fixedJson);
      } else {
        throw new Error("Không thể parse JSON sinh ra");
      }
    }

    if (questions.length !== num_questions) {
      console.warn(`⚠️ Generated ${questions.length} questions, expected ${num_questions}`);
      questions = questions.slice(0, num_questions);
    }

    // Save questions to DB
    await connection.beginTransaction();
    const insertedQuestions: InsertedQuestion[] = [];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];

      // Determine question_type_id: Use main or suggested
      let qTypeId = questionTypeId;
      if (q.suggested_type) {
        const suggestedMatch = existingTypes.find(t => t.type_name.toLowerCase() === q.suggested_type?.toLowerCase());
        if (suggestedMatch) {
          qTypeId = suggestedMatch.id;
        } else {
          // Insert new nếu suggested không tồn tại
          const [insertNewResult]: [OkPacket, FieldPacket[]] = await connection.execute(
            "INSERT INTO question_types (type_name, description, icon, is_multiple_choice) VALUES (?, ?, ?, ?)",
            [
              q.suggested_type!,
              `Loại câu hỏi được gợi ý từ AI`,
              "❓",
              q.suggested_type === 'multiple_choice'
            ]
          );
          qTypeId = insertNewResult.insertId;
          existingTypes.push({ id: qTypeId, type_name: q.suggested_type!, is_multiple_choice: q.suggested_type === 'multiple_choice' });
        }
      }

      const [qResult]: [OkPacket, FieldPacket[]] = await connection.execute(
        `INSERT INTO questions (exercise_id, question_text, emoji, explanation, model_answer, question_type_id, order_num) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [exercise_id, q.question_text, q.emoji || "❓", q.explanation || "", q.model_answer || null, qTypeId, i + 1]
      );

      const qid = qResult.insertId;
      let correctAnswerId: number | null = null;

      // Handle answers nếu là multiple_choice type
      const qType = existingTypes.find(t => t.id === qTypeId);
      if (qType?.is_multiple_choice && q.answers && q.answers.length > 0) {
        let correctIndex = q.answers.findIndex((a) => a.includes("(correct)"));
        if (correctIndex < 0) correctIndex = 0;

        for (let j = 0; j < q.answers.length; j++) {
          const answerText = q.answers[j].replace(/\(correct\)/gi, "").trim();
          const isCorrect = j === correctIndex;

          const [aResult]: [OkPacket, FieldPacket[]] = await connection.execute(
            "INSERT INTO answers (question_id, answer_text, is_correct) VALUES (?, ?, ?)",
            [qid, answerText, isCorrect]
          );

          if (isCorrect) correctAnswerId = aResult.insertId;
        }

        // Link correct answer back to question
        if (correctAnswerId) {
          await connection.execute(
            "UPDATE questions SET correct_answer_id = ? WHERE id = ?",
            [correctAnswerId, qid]
          );
        }
      }

      insertedQuestions.push({
        ...q,
        id: qid,
        order_num: i + 1,
        question_type_id: qTypeId,
      });
    }

    await connection.commit();

    const response: InsertedExercise = {
      ...insertedExercise,
      questions: insertedQuestions,
    };

    return NextResponse.json(response);
  } catch (err) {
    if (connection) await connection.rollback();
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("❌ Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}