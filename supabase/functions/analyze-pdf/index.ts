import { serve } from "https://deno.land/x/sift@0.6.0/mod.ts";
import { extractText } from "https://deno.land/x/pdf_extract@0.0.3/mod.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { Configuration, OpenAIApi } from "npm:openai";

function base64ToUint8Array(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// OpenAI API 설정
const configuration = new Configuration({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});
const openai = new OpenAIApi(configuration);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { file: base64File } = await req.json();
    if (!base64File) {
      throw new Error("No file provided");
    }

    // base64 -> Uint8Array
    const bytes = base64ToUint8Array(base64File);

    // pdf-extract를 이용해 텍스트 추출
    const pdfText = await extractText(bytes);
    // pdfText.pages[]에 페이지별 텍스트가 담김
    // 필요에 맞게 join() 등으로 합쳐 사용할 수 있음
    const allText = pdfText.pages.map((page) => page.text).join("\n");

    const prompt = `
다음 사업제안서 내용에서 회사 소개 부분을 간략히 요약해줘:

${allText}
    `;

    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
    });

    const companyIntro = completion.data.choices?.[0]?.message?.content 
      || "회사 소개를 추출하지 못했습니다.";

    return new Response(
      JSON.stringify({ companyIntro }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
