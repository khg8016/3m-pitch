import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Only for demo purposes
});

export async function extractTextFromPdf(file: File): Promise<string> {
  try {
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument(new Uint8Array(arrayBuffer));
    const pdf = await loadingTask.promise;
    let text = '';

    // Extract text from each page
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items.map((item: any) => item.str);
      text += strings.join(' ') + '\n';
    }

    return text;
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    throw new Error("Failed to extract text from PDF");
  }
}

export interface CompanyInfo {
  description: string;
  website?: string;
}

export async function analyzeCompanyInfo(text: string): Promise<CompanyInfo> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are an AI assistant that analyzes business proposals and extracts key company information. 
          Extract the following information:
          1. A concise company description (2-3 sentences)
          2. Company website URL if available
          Format the response as JSON with keys: description, website (optional)`
        },
        {
          role: "user",
          content: text
        }
      ]
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) throw new Error("No response from OpenAI");

    return JSON.parse(response) as CompanyInfo;
  } catch (error) {
    console.error("Error analyzing company info:", error);
    return {
      description: "Failed to analyze company information"
    };
  }
}
