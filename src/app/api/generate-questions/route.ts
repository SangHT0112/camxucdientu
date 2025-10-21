import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import type { PoolConnection, RowDataPacket, FieldPacket, OkPacket } from "mysql2/promise";

interface QuestionType {
  id: number;
  type_name: string;
  icon?: string;
  description?: string;
}

interface NewType {
  type_name: string;
  icon?: string;
  description?: string;
}

interface ClassifyResult {
  suggested_type_id: number | null;
  is_new: boolean;
  new_type?: NewType;
}

interface GeneratedAnswer {
  question_text: string;
  emoji: string;
  answers: string[];
  explanation: string;
}

interface InsertedQuestion extends GeneratedAnswer {
  id: number;
  question_type_id: number;
  correct_answer_id?: number | null;
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyBk7twdv6n450gZtjhbNN_ugriuqkut-UE";
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent";

export async function POST(request: NextRequest) {
  let connection: PoolConnection | null = null;

  try {
    const formData = await request.json();
    const {
      topic,
      quantity,
      difficulty,
      number_of_answers,
      description,
      user_id,
    } = formData as {
      topic: string;
      question_type_id?: number;
      quantity: number;
      difficulty: string;
      number_of_answers: number;
      description?: string;
      user_id: number;
    };

    if (!user_id) return NextResponse.json({ error: "Thiếu user_id" }, { status: 400 });
    if (!topic?.trim()) return NextResponse.json({ error: "Vui lòng nhập chủ đề" }, { status: 400 });

    connection = await db.getConnection();

    // 🧩 Lấy danh sách loại câu hỏi
    const [typeRows]: [RowDataPacket[], FieldPacket[]] = await connection.execute(
      "SELECT id, type_name, icon, description FROM question_types"
    );
    const existingTypes: QuestionType[] = typeRows as QuestionType[];

    // 🧠 Gửi yêu cầu phân loại
    const classifyPrompt = `
Bạn là một hệ thống phân loại câu hỏi học tập.

Mô tả chủ đề: "${topic}${description ? ` - Chi tiết: ${description}` : ""}"

Danh sách loại câu hỏi hiện có:
${existingTypes
  .map((t) => `${t.id}: ${t.type_name} (${t.icon || ""}) - ${t.description || ""}`)
  .join("; ")}

HÃY TRẢ VỀ DUY NHẤT JSON, KHÔNG TEXT NÀO KHÁC:

{
  "suggested_type_id": số_id_hoặc_null,
  "is_new": true_false,
  "new_type": {
    "type_name": "Tên loại mới",
    "icon": "📘",
    "description": "Mô tả ngắn gọn"
  }
}`;

    const classifyRes = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: classifyPrompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 5000 },
      }),
    });

    if (!classifyRes.ok) {
      const errorData = await classifyRes.json();
      throw new Error(`Gemini API failed: ${errorData.error?.message || classifyRes.statusText}`);
    }

    const classifyData = await classifyRes.json();
    const classifyText =
      classifyData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    const jsonMatch = classifyText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Không tìm thấy JSON trong response");
    const classifyParsed: ClassifyResult = JSON.parse(jsonMatch[0]);

    // 🧱 Xác định questionTypeId
    let questionTypeId: number;

    if (classifyParsed.suggested_type_id && !classifyParsed.is_new) {
      questionTypeId = classifyParsed.suggested_type_id;
    } else if (classifyParsed.is_new && classifyParsed.new_type) {
      const [insertResult]: [OkPacket, FieldPacket[]] = await connection.execute(
        "INSERT INTO question_types (type_name, description, icon) VALUES (?, ?, ?)",
        [
          classifyParsed.new_type.type_name,
          classifyParsed.new_type.description,
          classifyParsed.new_type.icon || "📘",
        ]
      );
      questionTypeId = insertResult.insertId;
    } else {
      const defaultType = existingTypes.find((t) => t.type_name === "Daily Life") || existingTypes[0];
      questionTypeId = defaultType?.id;
    }

    // ✨ Sinh câu hỏi
    const generatePrompt = `
    Hãy tạo ${quantity} câu hỏi trắc nghiệm thật NGẮN GỌN, DỄ HIỂU cho TRẺ MẦM NON (3–6 tuổi)
    về chủ đề "${topic}". ${description ? `Chủ đề chi tiết: ${description}` : ""}

    YÊU CẦU:
    - Ngôn ngữ thật đơn giản, dễ thương, dễ đọc.
    - Mỗi câu hỏi chỉ 1 câu ngắn (dưới 15 chữ).
    - Có emoji phù hợp với câu hỏi (ví dụ: 🍎, 🐶, 🌞, 🏖️...).
    - Có ${number_of_answers} đáp án ngắn gọn (từ 1–4 chữ).
    - Một đáp án đúng (đánh dấu bằng "(correct)").
    - Thêm trường "explanation" giải thích ngắn gọn, thân thiện.
    - CHỈ TRẢ VỀ JSON hợp lệ, không thêm chữ nào khác.

    Ví dụ:
    [
      {
        "question_text": "Quả nào màu đỏ? 🍎",
        "emoji": "🍎",
        "answers": ["Chuối", "Táo (correct)", "Cam"],
        "explanation": "Quả táo có màu đỏ tươi đấy!"
      }
    ]
    `;


    const generateRes = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: generatePrompt }] }],
        generationConfig: {
          temperature: difficulty === "Hard" ? 0.8 : 0.6,
          maxOutputTokens: 2000,
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

    const  rawJson = genMatch[0]
      .replace(/(\r\n|\n|\r)/g, "") // bỏ xuống dòng
      .replace(/,(\s*[\]}])/g, "$1") // bỏ dấu phẩy thừa trước ] hoặc }
      .replace(/\(correct\)/gi, "(correct)"); // chuẩn hóa (correct)

    let questions: GeneratedAnswer[];

    try {
      questions = JSON.parse(rawJson);
    } catch (e) {
      console.error("⚠️ JSON parse error, thử sửa tự động:", e);
      // fallback: thử parse sau khi cắt chuỗi dư phía sau
      const lastBracket = rawJson.lastIndexOf("]");
      if (lastBracket !== -1) {
        const fixedJson = rawJson.substring(0, lastBracket + 1);
        questions = JSON.parse(fixedJson);
      } else {
        throw new Error("Không thể parse JSON sinh ra");
      }
    }


    // 💾 Lưu DB
    await connection.beginTransaction();
    const insertedQuestions: InsertedQuestion[] = [];

    for (const q of questions) {
      const [qResult]: [OkPacket, FieldPacket[]] = await connection.execute(
        "INSERT INTO questions (question_text, emoji, explanation, question_type_id, user_id) VALUES (?, ?, ?, ?, ?)",
        [q.question_text, q.emoji || "❓", q.explanation || "", questionTypeId, user_id]
      );

      const qid = qResult.insertId;
      let correctAnswerIndex = q.answers.findIndex((a) => a.includes("(correct)"));
      if (correctAnswerIndex < 0) correctAnswerIndex = 0;

      let correctAnswerId: number | null = null;

      for (let i = 0; i < q.answers.length; i++) {
        const answerText = q.answers[i].replace(/\(correct\)/gi, "").trim();
        const isCorrect = i === correctAnswerIndex;

        const [aResult]: [OkPacket, FieldPacket[]] = await connection.execute(
          "INSERT INTO answers (question_id, answer_text, is_correct) VALUES (?, ?, ?)",
          [qid, answerText, isCorrect]
        );

        if (isCorrect) correctAnswerId = aResult.insertId;
      }

      if (correctAnswerId) {
        await connection.execute(
          "UPDATE questions SET correct_answer_id = ? WHERE id = ?",
          [correctAnswerId, qid]
        );
      }

      insertedQuestions.push({
        id: qid,
        ...q,
        question_type_id: questionTypeId,
        correct_answer_id: correctAnswerId,
      });
    }

    await connection.commit();
    return NextResponse.json(insertedQuestions);
  } catch (err) {
    if (connection) await connection.rollback();
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("❌ Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}
