import { GoogleGenAI, Type } from "@google/genai";
import { Category, Transaction } from "../types";

// Helper to convert file to base64
export const fileToGenerativePart = async (file: File): Promise<{ data: string, mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64Data = base64String.split(',')[1];
      resolve({
        data: base64Data,
        mimeType: file.type
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const analyzeFinancialDocument = async (
  input: string, // Base64 string or raw text
  mimeType: string, // 'text/plain', 'image/jpeg', 'application/pdf', etc.
  categories: Category[]
): Promise<Partial<Transaction>[]> => {
  
  // Re-instantiate here to ensure we pick up any API Key updates from the settings
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const categoryNames = categories.map(c => c.name).join(", ");
  const isText = mimeType === 'text/plain';
  
  const promptText = `
    Analyze the following financial document.
    Extract all individual transactions.
    
    For each transaction:
    1. Extract the Date (format YYYY-MM-DD). If year is missing, assume current year.
    2. Extract the Amount (number).
    3. Extract the Original Description.
    4. Create an 'enhancedDescription' that is cleaner and human-readable (e.g., "PAYPAL *SPOTIFY" -> "Spotify Subscription").
    5. Assign a 'category' strictly from this list: [${categoryNames}]. If unsure, use 'Other'.
    6. Determine 'isExpense' (true for debits, false for credits).
    7. Generate 1-3 relevant 'tags' based on the merchant and context. Use Google Search to identify obscure merchants.
    8. Assign a 'confidence' score (0-100) representing your certainty about the extracted data. Lower the score if the text is blurry, ambiguous, or if you had to guess the merchant/category.

    Return a JSON array of objects.
  `;

  try {
    // gemini-3-flash-preview supports PDF and Images
    const modelId = 'gemini-3-flash-preview';
    
    let contents: any;
    
    if (!isText) {
      contents = {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: input,
            },
          },
          { text: promptText },
        ],
      };
    } else {
      contents = {
        parts: [{ text: promptText + "\n\nDATA TO ANALYZE:\n" + input }],
      };
    }

    const response = await ai.models.generateContent({
      model: modelId,
      contents: contents,
      config: {
        tools: [{ googleSearch: {} }], // Enable Google Search grounding
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              date: { type: Type.STRING },
              amount: { type: Type.NUMBER },
              originalDescription: { type: Type.STRING },
              enhancedDescription: { type: Type.STRING },
              category: { type: Type.STRING },
              isExpense: { type: Type.BOOLEAN },
              tags: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "List of tags related to the transaction"
              },
              confidence: { type: Type.NUMBER, description: "Confidence score 0-100" }
            },
            required: ["date", "amount", "originalDescription", "enhancedDescription", "category", "isExpense", "tags", "confidence"]
          }
        }
      },
    });

    const jsonText = response.text;
    
    if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
      console.log("Grounding Metadata:", response.candidates[0].groundingMetadata.groundingChunks);
    }

    if (!jsonText) return [];

    const rawData = JSON.parse(jsonText);
    
    return rawData.map((item: any) => ({
      ...item,
      tags: item.tags || [],
      source: isText ? 'Text Paste' : 'File Upload',
      status: 'verified', // Will be overridden by logic in App.tsx based on confidence
      isReviewed: false,
    }));

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("Failed to analyze the document. Please try again.");
  }
};

export const suggestCategoryChange = async (description: string, categories: Category[]): Promise<string> => {
    // Re-instantiate here to ensure we pick up any API Key updates from the settings
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const categoryNames = categories.map(c => c.name).join(", ");
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Best category for transaction "${description}"? Choose one from: ${categoryNames}. Return only the category name.`,
        });
        return response.text?.trim() || 'Other';
    } catch (e) {
        return 'Other';
    }
}